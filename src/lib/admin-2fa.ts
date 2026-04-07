/**
 * Admin two-factor authentication (item 18).
 * Generates short-lived 6-digit codes, stores them hashed, and emails them.
 */
import crypto from "crypto";
import prisma from "./prisma";
import { hashCode, verifyCodeHash } from "./encryption";
import { sendEmail } from "./email";

const CODE_TTL_MS = 10 * 60 * 1000; // 10 minutes

function genCode(): string {
  // 6-digit numeric code
  const n = crypto.randomInt(0, 1_000_000);
  return n.toString().padStart(6, "0");
}

const PURPOSE_LABELS: Record<string, string> = {
  subscription_edit: "עריכת מנוי",
  plan_delete: "מחיקת תוכנית",
  bulk_action: "פעולה קבוצתית",
};

export async function generateCode(
  adminEmail: string,
  purpose: string,
  contextId?: string
): Promise<{ code: string; expiresAt: Date }> {
  const code = genCode();
  const hashed = hashCode(code);
  const expiresAt = new Date(Date.now() + CODE_TTL_MS);

  await prisma.adminTwoFactorCode.create({
    data: {
      adminEmail,
      code: hashed,
      purpose,
      contextId: contextId || null,
      expiresAt,
    },
  });

  return { code, expiresAt };
}

export async function verifyCode(
  adminEmail: string,
  purpose: string,
  code: string,
  contextId?: string
): Promise<boolean> {
  try {
    const candidates = await prisma.adminTwoFactorCode.findMany({
      where: {
        adminEmail,
        purpose,
        contextId: contextId || null,
        usedAt: null,
        expiresAt: { gt: new Date() },
      },
      orderBy: { createdAt: "desc" },
      take: 5,
    });

    for (const c of candidates) {
      try {
        if (verifyCodeHash(code, c.code)) {
          await prisma.adminTwoFactorCode.update({
            where: { id: c.id },
            data: { usedAt: new Date() },
          });
          return true;
        }
      } catch {
        // length mismatch / hash error – ignore and continue
      }
    }
    return false;
  } catch (err) {
    console.error("[Admin2FA] verifyCode failed:", err);
    return false;
  }
}

function buildEmailHtml(code: string, purpose: string, expiresAt: Date) {
  const purposeLabel = PURPOSE_LABELS[purpose] || purpose;
  const expiresStr = expiresAt.toLocaleTimeString("he-IL", { hour: "2-digit", minute: "2-digit" });
  return `
    <div dir="rtl" style="font-family: Heebo, Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #0a0a0a; color: #e5e5e5; padding: 40px; border-radius: 12px;">
      <h1 style="color: #C9A84C; font-size: 22px; margin: 0 0 16px;">קוד אימות מנהל מערכת</h1>
      <p style="color: #ccc; font-size: 14px; line-height: 1.6;">
        התקבלה בקשה לאימות הפעולה: <strong>${purposeLabel}</strong>.
      </p>
      <div style="background: #141414; border: 1px solid #2a2a2a; border-radius: 12px; padding: 24px; margin: 24px 0; text-align: center;">
        <div style="color: #888; font-size: 12px; margin-bottom: 8px;">קוד אימות חד פעמי</div>
        <div style="color: #C9A84C; font-size: 36px; letter-spacing: 8px; font-weight: 700;">${code}</div>
      </div>
      <p style="color: #888; font-size: 12px;">
        הקוד תקף עד השעה ${expiresStr} (10 דקות). אם לא ביקשת קוד זה, אנא התעלמי מההודעה.
      </p>
    </div>
  `;
}

export async function requestCode(
  adminEmail: string,
  purpose: string,
  contextId?: string
): Promise<{ ok: boolean; expiresAt: Date }> {
  const { code, expiresAt } = await generateCode(adminEmail, purpose, contextId);
  try {
    await sendEmail({
      to: adminEmail,
      subject: "קוד אימות מנהל מערכת – זירת האדריכלות",
      html: buildEmailHtml(code, purpose, expiresAt),
    });
  } catch (err) {
    console.error("[Admin2FA] sendEmail failed:", err);
  }
  return { ok: true, expiresAt };
}
