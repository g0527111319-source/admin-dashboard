import { txt } from "@/content/siteText";
import { NextRequest, NextResponse } from "next/server";
import { registerDesigner, registerSupplier } from "@/lib/auth";
export const dynamic = "force-dynamic";

// POST /api/auth/register — הרשמת מעצבת או ספק (ממתינה לאישור)
export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const role = body.role || "designer";

        // ולידציה משותפת
        const email = (body.email || "").trim().toLowerCase();
        const phone = (body.phone || "").trim();
        const password = body.password;

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!email || !emailRegex.test(email)) {
            return NextResponse.json({ error: txt("src/app/api/auth/register/route.ts::003", "כתובת אימייל לא תקינה") }, { status: 400 });
        }
        if (!phone || !password) {
            return NextResponse.json({ error: txt("src/app/api/auth/register/route.ts::001", "נדרשים שם מלא, אימייל, טלפון וסיסמה") }, { status: 400 });
        }
        if (password.length < 8 || !/[A-Z]/.test(password) || !/[0-9]/.test(password)) {
            return NextResponse.json({ error: txt("src/app/api/auth/register/route.ts::002", "הסיסמה חייבת להכיל לפחות 8 תווים, אות גדולה ומספר") }, { status: 400 });
        }

        // ==========================================
        // רישום ספק
        // ==========================================
        if (role === "supplier") {
            const contactName = (body.contactName || "").trim();
            const businessName = (body.businessName || "").trim();
            const category = (body.category || "").trim();

            if (!contactName || !businessName || !category) {
                return NextResponse.json({ error: "נדרשים שם איש קשר, שם עסק וקטגוריה" }, { status: 400 });
            }

            const result = await registerSupplier({
                contactName,
                businessName,
                email,
                phone,
                password,
                category,
                website: body.website || undefined,
                description: body.description || undefined,
                city: body.city || undefined,
            });

            if (!result.success) {
                return NextResponse.json({ error: result.error }, { status: 400 });
            }

            const messages: Record<string, string> = {
                pending: "הבקשה נשלחה בהצלחה! מנהלת הקהילה תאשר את הבקשה בהקדם.",
                already_pending: "הבקשה שלך כבר בטיפול. מנהלת הקהילה תאשר בהקדם.",
                reapplied: "הבקשה נשלחה מחדש! מנהלת הקהילה תבדוק שוב בהקדם.",
            };

            return NextResponse.json({
                success: true,
                status: result.status || "pending",
                message: messages[result.status || "pending"] || messages.pending,
            }, { status: 201 });
        }

        // ==========================================
        // רישום מעצבת (ברירת מחדל)
        // ==========================================
        const fullName = (body.fullName || "").trim();
        if (!fullName) {
            return NextResponse.json({ error: txt("src/app/api/auth/register/route.ts::001", "נדרשים שם מלא, אימייל, טלפון וסיסמה") }, { status: 400 });
        }

        // Enum validation — Prisma would throw a 500 on invalid enum values,
        // so we normalize/validate here and return a proper 400 with a helpful
        // message. Accepts only Prisma's actual enum values; anything else
        // (including the UI's legacy "independent"/"salaried" strings) is
        // mapped or rejected cleanly.
        const rawEmploymentType = body.employmentType;
        let employmentType: "FREELANCE" | "SALARIED" | undefined;
        if (rawEmploymentType != null && rawEmploymentType !== "") {
            const normalized = String(rawEmploymentType).toUpperCase().trim();
            const legacyMap: Record<string, "FREELANCE" | "SALARIED"> = {
                FREELANCE: "FREELANCE",
                SALARIED: "SALARIED",
                INDEPENDENT: "FREELANCE",
                EMPLOYEE: "SALARIED",
            };
            const mapped = legacyMap[normalized];
            if (!mapped) {
                return NextResponse.json(
                    { error: "סוג העסקה לא תקין — יש לבחור 'עצמאית' או 'שכירה'" },
                    { status: 400 },
                );
            }
            employmentType = mapped;
        }

        // Defensive number parsing — a junk value (e.g. "abc") would have
        // produced NaN and failed deep in Prisma with a 500. Coerce to undefined
        // if not a non-negative number we can persist.
        let yearsAsIndependent: number | undefined;
        if (body.yearsAsIndependent != null && body.yearsAsIndependent !== "") {
            const parsed = Number(body.yearsAsIndependent);
            if (!Number.isFinite(parsed) || parsed < 0 || parsed > 80) {
                return NextResponse.json(
                    { error: "שנות ותק לא תקינות" },
                    { status: 400 },
                );
            }
            yearsAsIndependent = parsed;
        }

        const result = await registerDesigner({
            fullName,
            email,
            phone,
            password,
            city: body.city,
            specialization: body.specialization,
            employmentType,
            yearsAsIndependent,
            // שדות מורחבים
            firstName: body.firstName || undefined,
            lastName: body.lastName || undefined,
            idNumber: body.idNumber || undefined,
            whatsappPhone: body.whatsappPhone || undefined,
            callOnlyPhone: body.callOnlyPhone || undefined,
            neighborhood: body.neighborhood || undefined,
            street: body.street || undefined,
            buildingNumber: body.buildingNumber || undefined,
            apartmentNumber: body.apartmentNumber || undefined,
            floor: body.floor || undefined,
            birthDate: body.birthDate || undefined,
            hebrewBirthDate: body.hebrewBirthDate || undefined,
            workTypes: body.workTypes || undefined,
            gender: body.gender || "female",
        });

        if (!result.success) {
            return NextResponse.json({ error: result.error }, { status: 400 });
        }

        // לא עושים כניסה אוטומטית — ממתינה לאישור מנהלת
        const messages: Record<string, string> = {
            pending: "הבקשה נשלחה בהצלחה! מנהלת הקהילה תאשר את הבקשה בהקדם.",
            already_pending: "הבקשה שלך כבר בטיפול. מנהלת הקהילה תאשר בהקדם.",
            reapplied: "הבקשה נשלחה מחדש! מנהלת הקהילה תבדוק שוב בהקדם.",
        };

        return NextResponse.json({
            success: true,
            status: result.status || "pending",
            message: messages[result.status || "pending"] || messages.pending,
        }, { status: 201 });
    }
    catch (error) {
        console.error("Registration error:", error);
        return NextResponse.json({ error: txt("src/app/api/auth/register/route.ts::004", "שגיאה בהרשמה") }, { status: 500 });
    }
}
