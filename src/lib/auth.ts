import { cookies } from "next/headers";
import { SignJWT, jwtVerify } from "jose";
import bcrypt from "bcryptjs";
import prisma from "./prisma";

// ==========================================
// סוגי משתמשים — User Types
// ==========================================

export type UserRole = "admin" | "supplier" | "designer";

export interface SessionPayload {
  userId: string;
  role: UserRole;
  email: string;
  name: string;
}

// DEMO_USERS with hardcoded credentials removed.
// The database is the single source of truth for authentication.
// If the DB is unavailable, login fails safely rather than falling back
// to hardcoded credentials that could be exploited.

/** Race a promise against a timeout; rejects if the timeout fires first. */
function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`DB query timed out after ${ms}ms`)), ms);
    promise.then(
      (val) => { clearTimeout(timer); resolve(val); },
      (err) => { clearTimeout(timer); reject(err); },
    );
  });
}

const DB_QUERY_TIMEOUT = 7000; // 7 seconds — must complete before Vercel 10s function limit

// getDemoSession removed — no more hardcoded credential fallback.
// All authentication must go through the database.

// ==========================================
// JWT — ניהול טוקנים
// ==========================================

function getJwtSecret(): Uint8Array {
  const secret = process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET;
  if (secret) {
    return new TextEncoder().encode(secret);
  }
  // No AUTH_SECRET or NEXTAUTH_SECRET set — log a warning and use an insecure fallback.
  // In production, AUTH_SECRET MUST be set via environment variables.
  console.warn("AUTH_SECRET not set -- using insecure fallback. Set AUTH_SECRET in production!");
  return new TextEncoder().encode("zirat-dev-only-jwt-secret-not-for-production-use-2024");
}

// Lazy - evaluated only when needed, not at build time
let _jwtSecret: Uint8Array | null = null;
function getJwtSecretCached(): Uint8Array {
  if (!_jwtSecret) _jwtSecret = getJwtSecret();
  return _jwtSecret;
}

const JWT_EXPIRY = "24h"; // תוקף 24 שעות

/** יצירת JWT טוקן */
export async function createToken(payload: SessionPayload): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(JWT_EXPIRY)
    .sign(getJwtSecretCached());
}

/** אימות JWT טוקן */
export async function verifyToken(token: string): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, getJwtSecretCached());
    return payload as unknown as SessionPayload;
  } catch {
    return null;
  }
}

// ==========================================
// סיסמאות — Password Hashing
// ==========================================

const SALT_ROUNDS = 12;

/** הצפנת סיסמה */
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS);
}

/** אימות סיסמה */
export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

// ==========================================
// Sessions — ניהול סשנים
// ==========================================

const COOKIE_NAME = "session_token";

/** שמירת session בעוגייה */
export async function setSessionCookie(payload: SessionPayload): Promise<void> {
  const token = await createToken(payload);
  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    maxAge: 60 * 60 * 24, // 24 שעות
    path: "/",
  });
}

/** קבלת Session מהעוגייה */
export async function getSession(): Promise<SessionPayload | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME);

  if (!token?.value) {
    return null;
  }

  return verifyToken(token.value);
}

/** מחיקת session (התנתקות) */
export async function clearSession(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(COOKIE_NAME);
}

// ==========================================
// אימות — Authentication Functions
// ==========================================

/** בדיקת חיבור אדמין */
export async function isAdmin(): Promise<boolean> {
  const session = await getSession();
  return session?.role === "admin";
}

/** כניסת אדמין */
export async function loginAdmin(email: string, password: string): Promise<boolean> {
  const adminEmail = process.env.ADMIN_EMAIL || "";
  const adminPassword = process.env.ADMIN_PASSWORD || "";
  return (
    email === adminEmail &&
    password === adminPassword
  );
}

/** כניסה עם אימייל וסיסמה */
export async function loginWithEmail(
  email: string,
  password: string,
  role: UserRole
): Promise<{ success: boolean; session?: SessionPayload; error?: string }> {
  const normalizedEmail = email.trim().toLowerCase();

  if (role === "admin") {
    const isValid = await loginAdmin(normalizedEmail, password);
    if (!isValid) return { success: false, error: "???? ????? ??????" };
    return {
      success: true,
      session: {
        userId: "admin",
        role: "admin",
        email: normalizedEmail,
        name: "???",
      },
    };
  }

  if (role === "supplier") {
    try {
      const supplier = await withTimeout(
        prisma.supplier.findFirst({
          where: { email: normalizedEmail, isActive: true },
        }),
        DB_QUERY_TIMEOUT,
      );

      if (supplier) {
        if (!supplier.passwordHash) return { success: false, error: "לא הוגדרה סיסמה. יש ליצור סיסמה חדשה." };

        const isValid = await verifyPassword(password, supplier.passwordHash);
        if (!isValid) return { success: false, error: "פרטי כניסה שגויים" };

        // בדיקת סטטוס אישור — רשימת המתנה
        if (supplier.approvalStatus === "PENDING") {
          return { success: false, error: "בקשתך עדיין ממתינה לאישור" };
        }
        if (supplier.approvalStatus === "REJECTED") {
          return { success: false, error: "בקשתך נדחתה. ניתן להגיש בקשה מחדש." };
        }

        return {
          success: true,
          session: {
            userId: supplier.id,
            role: "supplier",
            email: supplier.email!,
            name: supplier.name,
          },
        };
      }
    } catch (err) {
      console.error("Supplier DB lookup failed");
      return { success: false, error: "??? ?? ????" };
    }

    return { success: false, error: "??? ?? ????" };
  }

  if (role === "designer") {
    try {
      const designer = await withTimeout(
        prisma.designer.findFirst({
          where: { email: normalizedEmail, isActive: true },
        }),
        DB_QUERY_TIMEOUT,
      );

      if (designer) {
        if (!designer.passwordHash) return { success: false, error: "לא הוגדרה סיסמה. יש ליצור סיסמה חדשה." };

        const isValid = await verifyPassword(password, designer.passwordHash);
        if (!isValid) return { success: false, error: "פרטי כניסה שגויים" };

        // בדיקת סטטוס אישור — רשימת המתנה
        if (designer.approvalStatus === "PENDING") {
          return { success: false, error: "הבקשה שלך עדיין ממתינה לאישור מנהלת הקהילה. נעדכן אותך ברגע שתאושר!" };
        }
        if (designer.approvalStatus === "REJECTED") {
          return { success: false, error: "הבקשה שלך נדחתה. ניתן לפנות למנהלת הקהילה לפרטים נוספים." };
        }

        return {
          success: true,
          session: {
            userId: designer.id,
            role: "designer",
            email: designer.email!,
            name: designer.fullName,
          },
        };
      }
    } catch (err) {
      console.error("Designer DB lookup failed");
      return { success: false, error: "?????/? ?? ????/?" };
    }

    return { success: false, error: "?????/? ?? ????/?" };
  }

  return { success: false, error: "??? ????? ?? ????" };
}

export async function getSupplier(token: string) {
  return prisma.supplier.findUnique({
    where: { loginToken: token },
  });
}

/** בדיקת חיבור מעצבת */
export async function getDesigner(token: string) {
  return prisma.designer.findUnique({
    where: { loginToken: token },
  });
}

// ==========================================
// רישום — Registration
// ==========================================

/** רישום מעצבת חדשה — סטטוס PENDING עד אישור מנהלת */
export async function registerDesigner(data: {
  fullName: string;
  email: string;
  phone: string;
  password: string;
  city?: string;
  specialization?: string;
  employmentType?: "FREELANCE" | "SALARIED";
  yearsAsIndependent?: number;
}): Promise<{ success: boolean; designerId?: string; status?: string; error?: string }> {
  const passwordHash = await hashPassword(data.password);
  const loginToken = crypto.randomUUID();

  // בדיקה אם האימייל כבר קיים
  const existing = await prisma.designer.findUnique({
    where: { email: data.email },
  });

  if (existing) {
    // כבר ממתינה לאישור
    if (existing.approvalStatus === "PENDING") {
      return { success: true, designerId: existing.id, status: "already_pending" };
    }
    // נדחתה — מאפשרים הגשה מחדש
    if (existing.approvalStatus === "REJECTED") {
      const updated = await prisma.designer.update({
        where: { id: existing.id },
        data: {
          fullName: data.fullName,
          phone: data.phone,
          city: data.city || null,
          specialization: data.specialization || null,
          employmentType: data.employmentType || "FREELANCE",
          yearsAsIndependent: data.yearsAsIndependent ?? null,
          approvalStatus: "PENDING",
          passwordHash,
          loginToken,
        },
      });
      return { success: true, designerId: updated.id, status: "reapplied" };
    }
    // כבר אושרה — רשומה קיימת שהייתה APPROVED אוטומטית (לפני התיקון)
    // מאפסים ל-PENDING כדי שתעבור אישור מנהלת
    if (existing.approvalStatus === "APPROVED") {
      const updated = await prisma.designer.update({
        where: { id: existing.id },
        data: {
          fullName: data.fullName,
          phone: data.phone,
          city: data.city || null,
          specialization: data.specialization || null,
          employmentType: data.employmentType || "FREELANCE",
          yearsAsIndependent: data.yearsAsIndependent ?? null,
          approvalStatus: "PENDING",
          passwordHash,
          loginToken,
        },
      });
      return { success: true, designerId: updated.id, status: "pending" };
    }
  }

  const designer = await prisma.designer.create({
    data: {
      fullName: data.fullName,
      email: data.email,
      phone: data.phone,
      city: data.city || null,
      specialization: data.specialization || null,
      employmentType: data.employmentType || "FREELANCE",
      yearsAsIndependent: data.yearsAsIndependent ?? null,
      approvalStatus: "PENDING",
      passwordHash,
      loginToken,
    },
  });

  return { success: true, designerId: designer.id, status: "pending" };
}

/** רישום ספק חדש — סטטוס PENDING עד אישור מנהלת */
export async function registerSupplier(data: {
  contactName: string;
  businessName: string;
  email: string;
  phone: string;
  password: string;
  category: string;
  website?: string;
  description?: string;
  city?: string;
}): Promise<{ success: boolean; supplierId?: string; status?: string; error?: string }> {
  const passwordHash = await hashPassword(data.password);
  const loginToken = crypto.randomUUID();

  // בדיקה אם האימייל כבר קיים
  const existing = await prisma.supplier.findUnique({
    where: { email: data.email },
  });

  if (existing) {
    // כבר ממתין לאישור
    if (existing.approvalStatus === "PENDING") {
      return { success: true, supplierId: existing.id, status: "already_pending" };
    }
    // נדחה — מאפשרים הגשה מחדש
    if (existing.approvalStatus === "REJECTED") {
      const updated = await prisma.supplier.update({
        where: { id: existing.id },
        data: {
          name: data.businessName,
          contactName: data.contactName,
          phone: data.phone,
          category: data.category,
          city: data.city || null,
          website: data.website || null,
          description: data.description || null,
          approvalStatus: "PENDING",
          passwordHash,
          loginToken,
        },
      });
      return { success: true, supplierId: updated.id, status: "reapplied" };
    }
    // כבר אושר
    if (existing.approvalStatus === "APPROVED") {
      return { success: true, supplierId: existing.id, status: "already_pending" };
    }
  }

  const supplier = await prisma.supplier.create({
    data: {
      name: data.businessName,
      contactName: data.contactName,
      email: data.email,
      phone: data.phone,
      category: data.category,
      city: data.city || null,
      website: data.website || null,
      description: data.description || null,
      approvalStatus: "PENDING",
      passwordHash,
      loginToken,
    },
  });

  return { success: true, supplierId: supplier.id, status: "pending" };
}

// ==========================================
// איפוס סיסמה — Password Reset
// ==========================================

/** יצירת טוקן איפוס סיסמה */
export async function createResetToken(
  email: string,
  role: UserRole
): Promise<{ success: boolean; resetToken?: string; name?: string; error?: string }> {
  const resetToken = crypto.randomUUID();
  const resetTokenExpiry = new Date(Date.now() + 60 * 60 * 1000); // שעה אחת

  if (role === "supplier") {
    const supplier = await prisma.supplier.findFirst({ where: { email } });
    if (!supplier) return { success: false, error: "אימייל לא נמצא" };

    await prisma.supplier.update({
      where: { id: supplier.id },
      data: { resetToken, resetTokenExpiry },
    });
    return { success: true, resetToken, name: supplier.name };
  }

  if (role === "designer") {
    const designer = await prisma.designer.findFirst({ where: { email } });
    if (!designer) return { success: false, error: "אימייל לא נמצא" };

    await prisma.designer.update({
      where: { id: designer.id },
      data: { resetToken, resetTokenExpiry },
    });
    return { success: true, resetToken, name: designer.fullName };
  }

  return { success: false, error: "סוג משתמש לא תקין" };
}

/** איפוס סיסמה עם טוקן */
export async function resetPassword(
  token: string,
  newPassword: string
): Promise<{ success: boolean; error?: string }> {
  const passwordHash = await hashPassword(newPassword);

  // חפש בספקים
  const supplier = await prisma.supplier.findFirst({
    where: {
      resetToken: token,
      resetTokenExpiry: { gte: new Date() },
    },
  });

  if (supplier) {
    await prisma.supplier.update({
      where: { id: supplier.id },
      data: {
        passwordHash,
        resetToken: null,
        resetTokenExpiry: null,
      },
    });
    return { success: true };
  }

  // חפש במעצבות
  const designer = await prisma.designer.findFirst({
    where: {
      resetToken: token,
      resetTokenExpiry: { gte: new Date() },
    },
  });

  if (designer) {
    await prisma.designer.update({
      where: { id: designer.id },
      data: {
        passwordHash,
        resetToken: null,
        resetTokenExpiry: null,
      },
    });
    return { success: true };
  }

  return { success: false, error: "קישור איפוס לא תקין או שפג תוקפו" };
}
