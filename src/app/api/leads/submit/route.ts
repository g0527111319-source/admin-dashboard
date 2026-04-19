// Public endpoint for the "אני מחפש מעצבת" landing form.
//
// No auth (lead-gen page is public). Protected by:
//   - honeypot field (`website` must be empty)
//   - per-IP + per-email rate limiting
//   - basic server-side validation
//
// On success we fire-and-forget:
//   - admin notification email
//   - client confirmation email
//
// Emails use the existing Resend wiring — if the sandbox domain is active
// third-party recipients will be silently dropped (logged but not thrown).

import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { rateLimit, getClientIp } from "@/lib/rate-limit";
import { notifyAdminsNewLead, notifyClientConfirmation } from "@/lib/leads";

export const runtime = "nodejs";

type SubmitBody = {
  firstName?: string;
  lastName?: string;
  phone?: string;
  email?: string;
  city?: string;
  address?: string;
  sizeSqm?: number | string;
  scope?: string;
  renovationBudget?: number | string;
  designerBudget?: number | string;
  startTiming?: string;
  stylePreference?: string;
  additionalNotes?: string;
  consent?: boolean;
  // honeypot — real users won't fill this, bots will
  website?: string;
};

function parseNumber(v: unknown): number | null {
  if (v == null || v === "") return null;
  const n = typeof v === "string" ? Number(v.replace(/[,₪\s]/g, "")) : Number(v);
  return Number.isFinite(n) && n >= 0 ? n : null;
}

function isValidEmail(e: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);
}

function isValidPhone(p: string): boolean {
  const digits = p.replace(/\D/g, "");
  return digits.length >= 9 && digits.length <= 15;
}

export async function POST(req: NextRequest) {
  let body: SubmitBody;
  try {
    body = (await req.json()) as SubmitBody;
  } catch {
    return NextResponse.json({ error: "בקשה לא תקינה" }, { status: 400 });
  }

  // Honeypot — reply 200 so bots think they won (don't retry), but don't save.
  if (typeof body.website === "string" && body.website.trim() !== "") {
    return NextResponse.json({ ok: true });
  }

  // Normalize + validate
  const firstName = String(body.firstName || "").trim();
  const lastName = String(body.lastName || "").trim();
  const phone = String(body.phone || "").trim();
  const email = String(body.email || "").trim().toLowerCase();
  const city = String(body.city || "").trim();
  const address = String(body.address || "").trim();
  const scope = String(body.scope || "").trim();
  const sizeSqm = parseNumber(body.sizeSqm);
  const renovationBudget = parseNumber(body.renovationBudget);
  const designerBudget = parseNumber(body.designerBudget);
  const startTiming = typeof body.startTiming === "string" ? body.startTiming.trim() || null : null;
  const stylePreference = typeof body.stylePreference === "string" ? body.stylePreference.trim() || null : null;
  const additionalNotes = typeof body.additionalNotes === "string" ? body.additionalNotes.trim() || null : null;

  if (!firstName || firstName.length < 2) return NextResponse.json({ error: "שם פרטי חסר" }, { status: 400 });
  if (!lastName || lastName.length < 2) return NextResponse.json({ error: "שם משפחה חסר" }, { status: 400 });
  if (!phone || !isValidPhone(phone)) return NextResponse.json({ error: "טלפון לא תקין" }, { status: 400 });
  if (!email || !isValidEmail(email)) return NextResponse.json({ error: "אימייל לא תקין" }, { status: 400 });
  if (!city) return NextResponse.json({ error: "עיר חסרה" }, { status: 400 });
  if (!address) return NextResponse.json({ error: "כתובת הנכס חסרה" }, { status: 400 });
  if (!scope || scope.length < 5) return NextResponse.json({ error: "תיאור השיפוץ חסר" }, { status: 400 });
  if (!body.consent) return NextResponse.json({ error: "נדרשת הסכמה להעברת הפרטים" }, { status: 400 });

  // Rate-limit: 5 per IP per 10 min + 3 per email per day (don't tell
  // caller the exact limits — keeps scanners blind).
  const ip = getClientIp(req);
  const userAgent = req.headers.get("user-agent") || "";

  const ipLimit = await rateLimit(`lead:ip:${ip}`, 5, 600);
  if (!ipLimit.allowed) {
    return NextResponse.json({ error: "נשלחו יותר מדי בקשות. נסי שוב בעוד כמה דקות." }, { status: 429 });
  }

  const emailLimit = await rateLimit(`lead:email:${email}`, 3, 86400);
  if (!emailLimit.allowed) {
    return NextResponse.json({ error: "כבר שלחת בקשה היום. ניצור איתך קשר בקרוב." }, { status: 429 });
  }

  const lead = await prisma.lead.create({
    data: {
      firstName,
      lastName,
      phone,
      email,
      city,
      address,
      sizeSqm,
      scope,
      renovationBudget,
      designerBudget,
      startTiming,
      stylePreference,
      additionalNotes,
      consentedAt: new Date(),
      ipAddress: ip !== "unknown" ? ip.substring(0, 64) : null,
      userAgent: userAgent.substring(0, 500) || null,
      source: "landing",
    },
  });

  // Fire-and-forget emails. We await them but don't surface failures.
  await Promise.allSettled([
    notifyAdminsNewLead({
      id: lead.id,
      firstName: lead.firstName,
      lastName: lead.lastName,
      phone: lead.phone,
      email: lead.email,
      city: lead.city,
      address: lead.address,
      sizeSqm: lead.sizeSqm,
      scope: lead.scope,
      renovationBudget: lead.renovationBudget,
      designerBudget: lead.designerBudget,
      startTiming: lead.startTiming,
      stylePreference: lead.stylePreference,
      additionalNotes: lead.additionalNotes,
    }),
    notifyClientConfirmation({
      id: lead.id,
      firstName: lead.firstName,
      lastName: lead.lastName,
      phone: lead.phone,
      email: lead.email,
      city: lead.city,
      address: lead.address,
      sizeSqm: lead.sizeSqm,
      scope: lead.scope,
      renovationBudget: lead.renovationBudget,
      designerBudget: lead.designerBudget,
      startTiming: lead.startTiming,
      stylePreference: lead.stylePreference,
      additionalNotes: lead.additionalNotes,
    }),
  ]);

  return NextResponse.json({ ok: true, id: lead.id });
}
