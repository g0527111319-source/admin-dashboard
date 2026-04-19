// ==========================================
// Leads business logic + email templates
// ==========================================
//
// Central service for the "אני מחפש מעצבת" feature. Everything lead-shaped
// goes through here so admin, designer, and public-form routes stay in sync.
//
// Two distribution flows:
//   1. Direct assign — admin picks 3 designers, they get the full lead
//   2. Community feed — admin publishes anonymized summary, interested
//      designers raise hand, admin then picks 3 from interested list
//
// On every state transition we:
//   - fire relevant emails (best-effort, failures are logged not thrown)
//   - write InAppNotification rows so designers/admin see UI alerts

import { prisma } from "@/lib/prisma";
import { sendEmail } from "@/lib/email";

// Site URL for absolute links in emails. .trim() defends against env vars
// saved with a trailing newline — that would break all email CTA links.
const SITE_URL = (process.env.NEXT_PUBLIC_APP_URL || "https://www.ziratadrichalut.co.il").trim();

// Admin recipient list. Falls back to all users with role=admin if
// ADMIN_EMAIL env not set. We cache briefly to avoid hammering DB.
let _adminEmailCache: { at: number; list: string[] } | null = null;
const ADMIN_CACHE_TTL_MS = 60_000;

export async function getAdminEmailRecipients(): Promise<string[]> {
  const override = (process.env.ADMIN_EMAIL || "").trim();
  if (override) return override.split(",").map((e) => e.trim()).filter(Boolean);

  const now = Date.now();
  if (_adminEmailCache && now - _adminEmailCache.at < ADMIN_CACHE_TTL_MS) {
    return _adminEmailCache.list;
  }

  // The project uses a unified `user` table via Prisma's role-on-user pattern.
  // Admins live in `AdminUser` (based on 2FA table) or are specific emails.
  // Falling back to any Admin-Users table if present — otherwise empty.
  try {
    // best-effort — try admin table lookup; if the model doesn't exist we
    // silently return [] and the caller logs a warning.
    const admins = await (prisma as any).adminUser?.findMany?.({
      where: { isActive: true },
      select: { email: true },
    }).catch(() => []);
    const list = (admins || [])
      .map((a: { email: string | null }) => a.email)
      .filter((e: string | null): e is string => Boolean(e));
    _adminEmailCache = { at: now, list };
    return list;
  } catch {
    return [];
  }
}

// ==========================================
// Email templates
// ==========================================

function br(text: string | null | undefined): string {
  if (!text) return "—";
  return String(text).replace(/\n/g, "<br/>");
}

function formatCurrency(n: number | null | undefined): string {
  if (n == null) return "—";
  return new Intl.NumberFormat("he-IL", { style: "currency", currency: "ILS", maximumFractionDigits: 0 }).format(n);
}

function timingLabel(t: string | null | undefined): string {
  switch (t) {
    case "immediate": return "מיידי";
    case "1-3months": return "תוך 1-3 חודשים";
    case "research": return "מחקר ראשוני";
    default: return "—";
  }
}

function styleLabel(s: string | null | undefined): string {
  switch (s) {
    case "modern": return "מודרני";
    case "classic": return "קלאסי";
    case "scandi": return "סקנדינבי";
    case "industrial": return "תעשייתי";
    case "unsure": return "לא בטוח/ה";
    default: return s || "—";
  }
}

export type LeadEmailPayload = {
  id: string;
  firstName: string;
  lastName: string;
  phone: string;
  email: string;
  city: string;
  address: string;
  sizeSqm: number | null;
  scope: string;
  renovationBudget: number | null;
  designerBudget: number | null;
  startTiming: string | null;
  stylePreference: string | null;
  additionalNotes: string | null;
};

const BRAND_COLOR = "#C9A84C";

function wrapShell(inner: string): string {
  return `<!DOCTYPE html>
<html dir="rtl" lang="he">
<body style="margin:0;padding:0;background:#f7f6f3;font-family:Arial,Helvetica,sans-serif;color:#111;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f7f6f3;padding:24px 0;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 4px 16px rgba(0,0,0,0.06);">
        <tr><td style="background:${BRAND_COLOR};padding:20px 24px;">
          <h1 style="margin:0;font-family:Georgia,serif;font-size:22px;color:#ffffff;">זירת האדריכלות</h1>
        </td></tr>
        <tr><td style="padding:28px 32px;line-height:1.65;font-size:15px;color:#111;">${inner}</td></tr>
        <tr><td style="background:#faf8f1;padding:16px 24px;font-size:12px;color:#6B7280;">
          מייל אוטומטי מהקהילה. לא להשיב לכתובת הזו.
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

export function adminNewLeadEmail(lead: LeadEmailPayload): { subject: string; html: string } {
  const fullName = `${lead.firstName} ${lead.lastName}`.trim();
  const subject = `ליד חדש — ${fullName}, ${lead.city}`;
  const html = wrapShell(`
    <h2 style="margin:0 0 12px;font-size:19px;">ליד חדש התקבל דרך האתר</h2>
    <p style="margin:0 0 16px;color:#374151;">לקוח/ה פרטי/ת מבקש/ת ליווי של מעצבת מהקהילה.</p>
    <table width="100%" cellpadding="8" cellspacing="0" style="border:1px solid #eadfbf;border-radius:8px;">
      <tr><td style="font-weight:600;background:#faf8f1;width:140px;">שם</td><td>${br(fullName)}</td></tr>
      <tr><td style="font-weight:600;background:#faf8f1;">טלפון</td><td><a href="tel:${lead.phone}">${br(lead.phone)}</a></td></tr>
      <tr><td style="font-weight:600;background:#faf8f1;">אימייל</td><td><a href="mailto:${lead.email}">${br(lead.email)}</a></td></tr>
      <tr><td style="font-weight:600;background:#faf8f1;">עיר</td><td>${br(lead.city)}</td></tr>
      <tr><td style="font-weight:600;background:#faf8f1;">כתובת הנכס</td><td>${br(lead.address)}</td></tr>
      <tr><td style="font-weight:600;background:#faf8f1;">גודל</td><td>${lead.sizeSqm ? lead.sizeSqm + " מ״ר" : "—"}</td></tr>
      <tr><td style="font-weight:600;background:#faf8f1;">היקף שיפוץ</td><td>${br(lead.scope)}</td></tr>
      <tr><td style="font-weight:600;background:#faf8f1;">תקציב שיפוץ</td><td>${formatCurrency(lead.renovationBudget)}</td></tr>
      <tr><td style="font-weight:600;background:#faf8f1;">תקציב למעצבת</td><td>${formatCurrency(lead.designerBudget)}</td></tr>
      <tr><td style="font-weight:600;background:#faf8f1;">מתי להתחיל</td><td>${timingLabel(lead.startTiming)}</td></tr>
      <tr><td style="font-weight:600;background:#faf8f1;">סגנון מועדף</td><td>${styleLabel(lead.stylePreference)}</td></tr>
      <tr><td style="font-weight:600;background:#faf8f1;">דגש נוסף</td><td>${br(lead.additionalNotes)}</td></tr>
    </table>
    <p style="margin:20px 0 0;">
      <a href="${SITE_URL}/admin/leads/${lead.id}" style="background:${BRAND_COLOR};color:#fff;padding:12px 22px;border-radius:8px;text-decoration:none;display:inline-block;">
        פתחי את הליד בדשבורד
      </a>
    </p>
  `);
  return { subject, html };
}

export function clientConfirmationEmail(lead: LeadEmailPayload): { subject: string; html: string } {
  const subject = `קיבלנו את הבקשה שלך — זירת האדריכלות`;
  const html = wrapShell(`
    <h2 style="margin:0 0 12px;font-size:19px;">שלום ${lead.firstName},</h2>
    <p style="margin:0 0 12px;color:#374151;">
      קיבלנו את הפרטים שלך בהצלחה. מנהלת הקהילה תעבור על הבקשה שלך ותפנה אותה
      למעצבות המתאימות ביותר עבורך — בדרך כלל תוך <strong>48 שעות</strong>.
    </p>
    <p style="margin:0 0 12px;color:#374151;">
      עד 3 מעצבות מהקהילה ייצרו איתך קשר ישירות בטלפון או במייל, ותוכלי לבחור
      את מי שהכי מתאימה לפרויקט שלך. השירות ניתן ללא עלות ללקוחות פרטיים.
    </p>
    <p style="margin:18px 0 0;color:#6B7280;font-size:13px;">
      אם לא הגשת את הבקשה — אפשר להתעלם מהמייל הזה.
    </p>
  `);
  return { subject, html };
}

export function adminConversionEmail(args: {
  leadId: string;
  leadName: string;
  designerName: string;
  designerId: string;
  clientId: string;
}): { subject: string; html: string } {
  const subject = `💰 המרת ליד ללקוחה — ${args.leadName} ע״י ${args.designerName}`;
  const html = wrapShell(`
    <h2 style="margin:0 0 12px;font-size:19px;">ליד הפך ללקוחה 🎉</h2>
    <p style="margin:0 0 12px;color:#374151;">
      המעצבת <strong>${args.designerName}</strong> המירה את הליד של <strong>${args.leadName}</strong>
      ללקוחה רשמית במערכת ה-CRM שלה. זה הרגע לפתוח את מעקב ה-8% עמלה.
    </p>
    <p style="margin:18px 0 0;">
      <a href="${SITE_URL}/admin/leads/${args.leadId}" style="background:${BRAND_COLOR};color:#fff;padding:12px 22px;border-radius:8px;text-decoration:none;display:inline-block;">
        פתחי את הליד
      </a>
    </p>
  `);
  return { subject, html };
}

export function designerAssignmentEmail(args: {
  designerFirstName: string;
  leadName: string;
  leadCity: string;
  leadId: string;
  designerId: string;
}): { subject: string; html: string } {
  const subject = `ליד חדש הוקצה לך — ${args.leadName}`;
  const html = wrapShell(`
    <h2 style="margin:0 0 12px;font-size:19px;">שלום ${args.designerFirstName},</h2>
    <p style="margin:0 0 12px;color:#374151;">
      מנהלת הקהילה הקצתה לך ליד חדש: <strong>${args.leadName}</strong> מ-${args.leadCity}.
      מומלץ ליצור קשר תוך 24 שעות כדי להגדיל את הסיכויים להמרה.
    </p>
    <p style="margin:18px 0 0;">
      <a href="${SITE_URL}/designer/${args.designerId}/leads" style="background:${BRAND_COLOR};color:#fff;padding:12px 22px;border-radius:8px;text-decoration:none;display:inline-block;">
        פתחי את הליד ב-CRM
      </a>
    </p>
  `);
  return { subject, html };
}

// ==========================================
// Notification helpers
// ==========================================

export async function notifyAdminsNewLead(lead: LeadEmailPayload): Promise<void> {
  try {
    const recipients = await getAdminEmailRecipients();
    if (recipients.length === 0) {
      console.warn("[leads] no admin email recipients configured — lead", lead.id, "not emailed");
      return;
    }
    const { subject, html } = adminNewLeadEmail(lead);
    await sendEmail({ to: recipients, subject, html });
  } catch (err) {
    console.error("[leads] failed to email admins about new lead", lead.id, err);
  }
}

export async function notifyClientConfirmation(lead: LeadEmailPayload): Promise<void> {
  try {
    const { subject, html } = clientConfirmationEmail(lead);
    await sendEmail({ to: lead.email, subject, html });
  } catch (err) {
    console.error("[leads] failed to email client confirmation", lead.id, err);
  }
}

export async function notifyAdminsConversion(args: {
  leadId: string;
  leadName: string;
  designerName: string;
  designerId: string;
  clientId: string;
}): Promise<void> {
  try {
    const recipients = await getAdminEmailRecipients();
    if (recipients.length === 0) return;
    const { subject, html } = adminConversionEmail(args);
    await sendEmail({ to: recipients, subject, html });
  } catch (err) {
    console.error("[leads] failed to email admins about conversion", args.leadId, err);
  }
}

export async function notifyDesignerAssignment(args: {
  designerEmail: string | null;
  designerFirstName: string;
  designerId: string;
  leadName: string;
  leadCity: string;
  leadId: string;
}): Promise<void> {
  if (!args.designerEmail) return;
  try {
    const { subject, html } = designerAssignmentEmail({
      designerFirstName: args.designerFirstName,
      leadName: args.leadName,
      leadCity: args.leadCity,
      leadId: args.leadId,
      designerId: args.designerId,
    });
    await sendEmail({ to: args.designerEmail, subject, html });
  } catch (err) {
    console.error("[leads] failed to email designer assignment", args.designerId, err);
  }
}

// ==========================================
// Helpers
// ==========================================

/** Strip personal data from a lead for the community feed view. */
export function anonymizeLeadForFeed<T extends {
  id: string; city: string; sizeSqm: number | null; scope: string;
  renovationBudget: number | null; designerBudget: number | null;
  startTiming: string | null; stylePreference: string | null;
  postedToCommunityAt: Date | null; createdAt: Date;
}>(lead: T) {
  return {
    id: lead.id,
    city: lead.city,
    sizeSqm: lead.sizeSqm,
    scope: lead.scope,
    renovationBudget: lead.renovationBudget,
    designerBudget: lead.designerBudget,
    startTiming: lead.startTiming,
    stylePreference: lead.stylePreference,
    postedAt: lead.postedToCommunityAt || lead.createdAt,
  };
}

export const TIMING_OPTIONS = [
  { value: "immediate", label: "מיידי" },
  { value: "1-3months", label: "תוך 1-3 חודשים" },
  { value: "research", label: "מחקר ראשוני" },
] as const;

export const STYLE_OPTIONS = [
  { value: "modern", label: "מודרני" },
  { value: "classic", label: "קלאסי" },
  { value: "scandi", label: "סקנדינבי" },
  { value: "industrial", label: "תעשייתי" },
  { value: "unsure", label: "לא בטוח/ה — נסגור בפגישה" },
] as const;
