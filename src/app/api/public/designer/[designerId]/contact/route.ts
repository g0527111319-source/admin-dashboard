// Public endpoint for the "contact this designer" mini-form on
// /projects?designer=<id> (designer portfolio CTA block).
//
// Creates a Lead tagged with source=`designer-portfolio:<designerId>` so
// we know the lead came in through this designer's public page, and
// auto-assigns the lead to the designer via LeadAssignment so it appears
// in her "הוקצו לי" tab.
//
// Also emails the designer with the contact details. Email failure does
// NOT fail the request — lead creation is the source of truth.
//
// Protected by: basic validation + per-IP rate limit (3 per hour).

import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { rateLimit, getClientIp } from "@/lib/rate-limit";
import { sendEmail } from "@/lib/email";

export const runtime = "nodejs";

type ContactBody = {
  name?: string;
  phone?: string;
  message?: string;
  // UTM attribution — set by the public portfolio client when the visitor
  // arrives through a share link carrying utm_source/medium/campaign query
  // params. Optional and free-form; we sanitize before storing.
  utm?: {
    source?: string;
    medium?: string;
    campaign?: string;
  };
};

// Whitelist characters — UTM values land inside Lead.source which is
// displayed in the leads UI and exported. Keep them boring.
function cleanUtm(v: unknown): string | null {
  if (typeof v !== "string") return null;
  const trimmed = v.trim().slice(0, 40);
  if (!trimmed) return null;
  if (!/^[a-zA-Z0-9._-]+$/.test(trimmed)) return null;
  return trimmed;
}

function isValidPhone(p: string): boolean {
  const digits = p.replace(/\D/g, "");
  return digits.length >= 9 && digits.length <= 15;
}

const SITE_URL = (process.env.NEXT_PUBLIC_APP_URL || "https://www.ziratadrichalut.co.il").trim();

export async function POST(
  req: NextRequest,
  { params }: { params: { designerId: string } }
) {
  const designerId = params?.designerId;
  if (!designerId) {
    return NextResponse.json({ error: "designerId חסר" }, { status: 400 });
  }

  let body: ContactBody;
  try {
    body = (await req.json()) as ContactBody;
  } catch {
    return NextResponse.json({ error: "בקשה לא תקינה" }, { status: 400 });
  }

  const name = String(body.name || "").trim();
  const phone = String(body.phone || "").trim();
  const message =
    typeof body.message === "string" ? body.message.trim() || null : null;

  if (!name || name.length < 2) {
    return NextResponse.json({ error: "שם חסר" }, { status: 400 });
  }
  if (!phone || !isValidPhone(phone)) {
    return NextResponse.json({ error: "טלפון לא תקין" }, { status: 400 });
  }

  // Rate-limit: 3 submissions per IP per hour for this designer.
  const ip = getClientIp(req);
  const userAgent = req.headers.get("user-agent") || "";
  const ipLimit = await rateLimit(
    `lead:contact:${designerId}:ip:${ip}`,
    3,
    3600
  );
  if (!ipLimit.allowed) {
    return NextResponse.json(
      { error: "נשלחו יותר מדי בקשות. נסי שוב בעוד שעה." },
      { status: 429 }
    );
  }

  // Verify the designer exists. If not, 404 (don't create a lead with a
  // bogus source tag).
  const designer = await prisma.designer.findUnique({
    where: { id: designerId },
    select: { id: true, fullName: true, email: true, phone: true, gender: true },
  });
  if (!designer) {
    return NextResponse.json({ error: "המעצבת לא נמצאה" }, { status: 404 });
  }

  // Split name → first/last. Lead.firstName & lastName are both required
  // (non-null) on the schema; fall back to a dash when only one word given.
  const parts = name.split(/\s+/).filter(Boolean);
  const firstName = parts[0] || name;
  const lastName = parts.slice(1).join(" ") || "-";

  // Lead.email is required + unique. Public contact form doesn't collect
  // email — synthesize a placeholder marked with the lead id so it's
  // obvious in admin / CRM. The designer gets the real contact via
  // phone + email notification.
  const placeholderEmail = `contact-${Date.now()}-${Math.random()
    .toString(36)
    .slice(2, 8)}@portfolio.local`;

  // Lead.city, address, scope are required strings on the schema. We
  // don't collect them here — store placeholders so the row is valid.
  const lead = await prisma.lead.create({
    data: {
      firstName,
      lastName,
      phone,
      email: placeholderEmail,
      city: "—",
      address: "—",
      scope: message || "פנייה מתיק עבודות — ללא פירוט נוסף",
      additionalNotes: message,
      status: "NEW",
      source: `designer-portfolio:${designerId}:${cleanUtm(body.utm?.source) || "direct"}`,
      consentedAt: new Date(),
      ipAddress: ip !== "unknown" ? ip.substring(0, 64) : null,
      userAgent: userAgent.substring(0, 500) || null,
    },
  });

  // Auto-assign to the designer whose portfolio triggered the lead so it
  // appears in her "הוקצו לי" list. Wrapped in try/catch so a race on
  // the unique(leadId, designerId) constraint never blocks the response.
  try {
    await prisma.leadAssignment.create({
      data: {
        leadId: lead.id,
        designerId: designer.id,
      },
    });
  } catch (err) {
    console.error("[public-contact] assignment create failed", err);
  }

  // Best-effort designer notification. Failure is logged but not surfaced.
  if (designer.email) {
    try {
      const dashboardUrl = `${SITE_URL}/designer/${designer.id}/leads`;
      const subject = "פנייה חדשה מהתיק עבודות שלך";
      const html = `
<div dir="rtl" style="font-family:Heebo,Arial,sans-serif;max-width:600px;margin:0 auto;background:#0a0a0a;color:#e5e5e5;padding:40px;border-radius:12px;border:1px solid #C9A84C33;">
  <div style="text-align:center;margin-bottom:24px;">
    <h1 style="color:#C9A84C;font-size:22px;margin:0;">פנייה חדשה מתיק העבודות</h1>
  </div>
  <p>שלום ${designer.fullName},</p>
  <p>התקבלה פנייה חדשה דרך דף תיק העבודות הציבורי שלך:</p>
  <div style="background:#1a1a1a;padding:20px;border-radius:8px;border:1px solid #C9A84C33;">
    <p style="margin:6px 0;"><strong>שם:</strong> ${name}</p>
    <p style="margin:6px 0;"><strong>טלפון:</strong> <a href="tel:${phone}" style="color:#C9A84C;">${phone}</a></p>
    ${message ? `<p style="margin:6px 0;"><strong>הודעה:</strong><br/>${message.replace(/</g, "&lt;").replace(/\n/g, "<br/>")}</p>` : ""}
  </div>
  <div style="text-align:center;margin:24px 0;">
    <a href="${dashboardUrl}" style="display:inline-block;background:#C9A84C;color:#000;padding:12px 28px;border-radius:8px;text-decoration:none;font-weight:700;">לצפייה במערכת</a>
  </div>
  <hr style="border:none;border-top:1px solid #222;margin:30px 0;" />
  <p style="color:#666;font-size:11px;text-align:center;">זירת האדריכלות &copy; ${new Date().getFullYear()}</p>
</div>`;

      const result = await sendEmail({ to: designer.email, subject, html });
      if (!result.success) {
        console.error("[public-contact] email failed", {
          designerId,
          leadId: lead.id,
          result,
        });
      }
    } catch (err) {
      console.error("[public-contact] email exception", err);
    }
  }

  return NextResponse.json({ ok: true, id: lead.id });
}
