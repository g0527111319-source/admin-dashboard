import { Resend } from "resend";
import { g } from "@/lib/gender";

const resend = process.env.RESEND_API_KEY
  ? new Resend(process.env.RESEND_API_KEY)
  : null;

// IMPORTANT: Resend's sandbox domain (`@resend.dev`) only delivers mail to
// the account owner's own email. Any mail to a third party silently gets
// 403'd. To deliver to real clients you MUST verify a domain at
// https://resend.com/domains and set `FROM_EMAIL` on Vercel to an address
// under that domain, e.g. `זירת האדריכלות <noreply@ziratadrichalut.co.il>`.
const FROM_EMAIL = process.env.FROM_EMAIL || "זירת האדריכלות <noreply@resend.dev>";
const FROM_IS_SANDBOX = /@resend\.dev>?\s*$/i.test(FROM_EMAIL);

// The only address Resend's sandbox domain is allowed to deliver to.
// Surfaced as a warning on every send so we don't lose mails silently.
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || "";

/**
 * Attachments passed through to Resend. `content` accepts either a Buffer
 * (we pass the raw bytes of the generated PDF) or a base64 string.
 */
export type EmailAttachment = {
  filename: string;
  content: Buffer | string;
  contentType?: string;
};

type SendEmailOptions = {
  to: string | string[];
  subject: string;
  html: string;
  attachments?: EmailAttachment[];
};

export type EmailSendResult =
  | { success: true; id?: string; mock?: boolean }
  | { success: false; error: unknown; code?: string; message?: string; sandbox?: boolean };

export async function sendEmail({ to, subject, html, attachments }: SendEmailOptions): Promise<EmailSendResult> {
  const toList = Array.isArray(to) ? to : [to];

  if (!resend) {
    console.log("[Email Mock] Would send:", {
      to: toList,
      subject,
      attachmentCount: attachments?.length || 0,
    });
    return { success: true, mock: true };
  }

  // Loud warning when sandbox + recipient is not the account owner: this
  // send WILL be rejected by Resend. We still attempt the call (so the
  // error surfaces in logs) but flag it up-front.
  if (FROM_IS_SANDBOX) {
    const allowed = ADMIN_EMAIL.toLowerCase();
    const blocked = toList.filter((t) => t.toLowerCase() !== allowed);
    if (blocked.length > 0) {
      console.warn(
        "[Email] Sandbox domain in use — these recipients will be rejected by Resend:",
        { from: FROM_EMAIL, blocked, fix: "set FROM_EMAIL to a verified domain on Vercel" },
      );
    }
  }

  try {
    const { data, error } = await resend.emails.send({
      from: FROM_EMAIL,
      to: toList,
      subject,
      html,
      // Resend accepts Buffer content directly for attachments. We forward
      // the optional contentType so PDFs show the right icon in mail clients.
      ...(attachments && attachments.length > 0 ? {
        attachments: attachments.map((att) => ({
          filename: att.filename,
          content: att.content,
          ...(att.contentType ? { contentType: att.contentType } : {}),
        })),
      } : {}),
    });

    if (error) {
      console.error("[Email Error]", { to: toList, subject, from: FROM_EMAIL, error });
      const err = error as { name?: string; message?: string; statusCode?: number };
      return {
        success: false,
        error,
        code: err.name,
        message: err.message,
        sandbox: FROM_IS_SANDBOX,
      };
    }

    return { success: true, id: data?.id };
  } catch (err) {
    console.error("[Email Exception]", { to: toList, subject, from: FROM_EMAIL, err });
    return {
      success: false,
      error: err,
      message: err instanceof Error ? err.message : String(err),
      sandbox: FROM_IS_SANDBOX,
    };
  }
}

/** True when the current `FROM_EMAIL` points to Resend's sandbox. */
export function isSandboxFrom(): boolean {
  return FROM_IS_SANDBOX;
}

/** Current FROM_EMAIL value — exposed for diagnostics. */
export function getFromEmail(): string {
  return FROM_EMAIL;
}

// --- Email Templates ---

export function welcomeDesignerEmail(name: string, gender?: string) {
  return {
    subject: `${g(gender, "ברוך הבא", "ברוכה הבאה")} לזירת האדריכלות, ${name}!`,
    html: `
      <div dir="rtl" style="font-family: Heebo, Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #0a0a0a; color: #e5e5e5; padding: 40px; border-radius: 12px;">
        <div style="text-align: center; margin-bottom: 30px;">
          <h1 style="color: #C9A84C; font-size: 28px; margin: 0;">זירת האדריכלות</h1>
          <p style="color: #888; font-size: 14px;">קהילה שהיא בית</p>
        </div>
        <h2 style="color: #fff;">שלום ${name}! 👋</h2>
        <p>שמחים שהצטרפת לקהילת מעצבות הפנים המובילה בישראל.</p>
        <p>באזור האישי שלך ${g(gender, "תוכל", "תוכלי")}:</p>
        <ul style="color: #C9A84C;">
          <li style="color: #e5e5e5; margin-bottom: 8px;">לנהל לקוחות ופרויקטים</li>
          <li style="color: #e5e5e5; margin-bottom: 8px;">לדווח עסקאות ולצבור נקודות</li>
          <li style="color: #e5e5e5; margin-bottom: 8px;">לחפש ספקים מומלצים</li>
          <li style="color: #e5e5e5; margin-bottom: 8px;">להשתתף באירועים והגרלות</li>
        </ul>
        <div style="text-align: center; margin-top: 30px;">
          <a href="${process.env.NEXT_PUBLIC_APP_URL || "https://www.ziratadrichalut.co.il"}/login"
             style="background: #C9A84C; color: #000; padding: 12px 32px; border-radius: 8px; text-decoration: none; font-weight: 600;">
            כניסה לאזור האישי
          </a>
        </div>
        <p style="color: #666; font-size: 12px; text-align: center; margin-top: 40px;">
          זירת האדריכלות © ${new Date().getFullYear()}
        </p>
      </div>
    `,
  };
}

export function dealNotificationEmail(designerName: string, supplierName: string, amount: number, gender?: string) {
  return {
    subject: `עסקה חדשה דווחה — ${supplierName}`,
    html: `
      <div dir="rtl" style="font-family: Heebo, Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #0a0a0a; color: #e5e5e5; padding: 40px; border-radius: 12px;">
        <h1 style="color: #C9A84C; text-align: center;">עסקה חדשה 🤝</h1>
        <div style="background: #1a1a1a; padding: 20px; border-radius: 8px; border: 1px solid #C9A84C33;">
          <p><strong>${g(gender, "מעצב", "מעצבת")}:</strong> ${designerName}</p>
          <p><strong>ספק:</strong> ${supplierName}</p>
          <p><strong>סכום:</strong> ₪${amount.toLocaleString()}</p>
          <p><strong>תאריך:</strong> ${new Date().toLocaleDateString("he-IL")}</p>
        </div>
      </div>
    `,
  };
}

export function reminderEmail(name: string, message: string) {
  return {
    subject: `תזכורת מזירת האדריכלות`,
    html: `
      <div dir="rtl" style="font-family: Heebo, Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #0a0a0a; color: #e5e5e5; padding: 40px; border-radius: 12px;">
        <h1 style="color: #C9A84C; text-align: center;">תזכורת 🔔</h1>
        <p>שלום ${name},</p>
        <div style="background: #1a1a1a; padding: 20px; border-radius: 8px; border-right: 4px solid #C9A84C;">
          <p>${message}</p>
        </div>
      </div>
    `,
  };
}

// ==========================================
// Subscription lifecycle email templates
// ==========================================

const BRAND_URL = process.env.NEXT_PUBLIC_APP_URL || "https://www.ziratadrichalut.co.il";

function brandWrap(title: string, body: string): string {
  return `
  <div dir="rtl" style="font-family:Heebo,Arial,sans-serif;max-width:600px;margin:0 auto;background:#0a0a0a;color:#e5e5e5;padding:40px;border-radius:12px;border:1px solid #C9A84C33;">
    <div style="text-align:center;margin-bottom:24px;">
      <h1 style="color:#C9A84C;font-size:24px;margin:0;">זירת האדריכלות</h1>
      <p style="color:#888;font-size:13px;margin:4px 0 0;">קהילה שהיא בית</p>
    </div>
    <h2 style="color:#fff;font-size:20px;">${title}</h2>
    ${body}
    <hr style="border:none;border-top:1px solid #222;margin:30px 0;" />
    <p style="color:#666;font-size:11px;text-align:center;">© ${new Date().getFullYear()} זירת האדריכלות — אם לא ביקשת אימייל זה, ניתן להתעלם.</p>
  </div>`;
}

function brandButton(label: string, href: string): string {
  return `<div style="text-align:center;margin:24px 0;"><a href="${href}" style="display:inline-block;background:#C9A84C;color:#000;padding:12px 28px;border-radius:8px;text-decoration:none;font-weight:700;">${label}</a></div>`;
}

export function subscriptionReceiptEmail(
  name: string,
  planName: string,
  amount: number,
  invoiceNumber: string | null,
  periodEnd: Date,
  gender?: string
) {
  return {
    subject: `קבלה על תשלום מנוי — ${planName}`,
    html: brandWrap(
      `תודה על התשלום, ${name}!`,
      `
      <p>התשלום עבור המנוי שלך התקבל בהצלחה.</p>
      <div style="background:#1a1a1a;padding:20px;border-radius:8px;border:1px solid #C9A84C33;">
        <p style="margin:6px 0;"><strong>תוכנית:</strong> ${planName}</p>
        <p style="margin:6px 0;"><strong>סכום:</strong> ₪${amount.toFixed(2)}</p>
        ${invoiceNumber ? `<p style="margin:6px 0;"><strong>מס' חשבונית:</strong> ${invoiceNumber}</p>` : ""}
        <p style="margin:6px 0;"><strong>תוקף עד:</strong> ${periodEnd.toLocaleDateString("he-IL")}</p>
      </div>
      <p style="color:#999;font-size:13px;">החשבונית המלאה תישלח אוטומטית ממערכת iCount.</p>
      ${brandButton(g(gender, "צפה בפרטי המנוי", "צפי בפרטי המנוי"), `${BRAND_URL}/designer`)}
      `
    ),
  };
}

export function trialEndingEmail(name: string, daysLeft: number, trialEndsAt: Date, gender?: string) {
  return {
    subject: `תקופת הניסיון שלך מסתיימת בעוד ${daysLeft} ימים`,
    html: brandWrap(
      `שלום ${name},`,
      `
      <p>תקופת הניסיון החינמית שלך בזירת האדריכלות תסתיים ב־<strong>${trialEndsAt.toLocaleDateString("he-IL")}</strong>.</p>
      <p>כדי להמשיך ליהנות מכל הכלים המתקדמים — CRM, כרטיס ביקור דיגיטלי, חוזים, ופורטפוליו — הזינו פרטי תשלום כבר עכשיו:</p>
      ${brandButton(g(gender, "המשך למנוי בתשלום", "המשיכי למנוי בתשלום"), `${BRAND_URL}/designer`)}
      <p style="color:#999;font-size:13px;">אם לא ${g(gender, "תמשיך", "תמשיכי")}, החשבון יעבור אוטומטית למנוי החינמי ${g(gender, "ותוכל", "ותוכלי")} להמשיך ליהנות מהקהילה, האירועים וההגרלות.</p>
      `
    ),
  };
}

export function renewalReminderEmail(name: string, amount: number, renewAt: Date, gender?: string) {
  return {
    subject: `תזכורת: החיוב החודשי יתבצע ב־${renewAt.toLocaleDateString("he-IL")}`,
    html: brandWrap(
      `שלום ${name},`,
      `
      <p>זוהי תזכורת ידידותית: בתאריך <strong>${renewAt.toLocaleDateString("he-IL")}</strong> יתבצע חיוב אוטומטי של <strong>₪${amount.toFixed(2)}</strong> עבור חידוש המנוי החודשי שלך.</p>
      <p>אם ${g(gender, "אתה רוצה", "את רוצה")} לעדכן את פרטי התשלום, לשדרג/לשנמך תוכנית, או לבטל את המנוי — ${g(gender, "אתה מוזמן", "את מוזמנת")} לעשות זאת בכל עת:</p>
      ${brandButton("לניהול המנוי", `${BRAND_URL}/designer`)}
      `
    ),
  };
}

export function paymentFailedEmail(name: string, attempt: number, maxAttempts: number, nextRetry: Date, gender?: string) {
  return {
    subject: `⚠️ כשל בחיוב המנוי (ניסיון ${attempt}/${maxAttempts})`,
    html: brandWrap(
      `שלום ${name},`,
      `
      <p>ניסינו לחייב את המנוי החודשי שלך — והחיוב נכשל.</p>
      <div style="background:#2a1a1a;padding:16px;border-radius:8px;border-right:4px solid #e74c3c;">
        <p style="margin:4px 0;"><strong>ניסיון:</strong> ${attempt} מתוך ${maxAttempts}</p>
        <p style="margin:4px 0;"><strong>ניסיון חוזר ב־:</strong> ${nextRetry.toLocaleDateString("he-IL")}</p>
      </div>
      <p style="margin-top:16px;">אנא ${g(gender, "ודא", "ודאי")} שפרטי כרטיס האשראי מעודכנים כדי להימנע מסגירת המנוי.</p>
      ${brandButton(g(gender, "עדכן פרטי תשלום", "עדכני פרטי תשלום"), `${BRAND_URL}/designer`)}
      <p style="color:#999;font-size:12px;">אם החיוב ימשיך להיכשל לאחר ${maxAttempts} ניסיונות, המנוי יעבור למצב "קריאה בלבד" עם 30 ימים להוריד את כל המידע שלך.</p>
      `
    ),
  };
}

export function subscriptionCancelledEmail(name: string, effectiveDate: Date, downloadUntil: Date, gender?: string) {
  return {
    subject: `אישור ביטול המנוי שלך`,
    html: brandWrap(
      `שלום ${name},`,
      `
      <p>ביטול המנוי שלך נרשם בהצלחה.</p>
      <div style="background:#1a1a1a;padding:20px;border-radius:8px;border:1px solid #C9A84C33;">
        <p style="margin:6px 0;"><strong>הביטול ייכנס לתוקף ב־:</strong> ${effectiveDate.toLocaleDateString("he-IL")}</p>
        <p style="margin:6px 0;"><strong>חלון הורדת מידע עד:</strong> ${downloadUntil.toLocaleDateString("he-IL")}</p>
      </div>
      <p>עד לתאריך הנ"ל ${g(gender, "תוכל", "תוכלי")} להיכנס לחשבון ולהוריד את כל המידע שלך — לקוחות, פרויקטים, חוזים וקבצים.</p>
      ${brandButton("להורדת המידע", `${BRAND_URL}/designer`)}
      <p style="color:#999;font-size:13px;">חבל ${g(gender, "שאתה עוזב", "שאת עוזבת")} — אם ${g(gender, "תחליט", "תחליטי")} לחזור, החשבון שלך יהיה כאן ${g(gender, "מחכה", "מחכה")} לך.</p>
      `
    ),
  };
}

export function subscriptionPausedEmail(name: string, resumeAt: Date, gender?: string) {
  return {
    subject: `המנוי שלך הושהה`,
    html: brandWrap(
      `שלום ${name},`,
      `
      <p>המנוי שלך הושהה בהצלחה ולא ${g(gender, "תחויב", "תחויבי")} עד להפעלה מחדש.</p>
      <p><strong>השהיה מתוכננת עד:</strong> ${resumeAt.toLocaleDateString("he-IL")}</p>
      <p>באפשרותך להפעיל את המנוי מחדש בכל עת:</p>
      ${brandButton(g(gender, "הפעל מחדש", "הפעילי מחדש"), `${BRAND_URL}/designer`)}
      `
    ),
  };
}

export function promotionNearEmail(name: string, currentCount: number, needed: number, gender?: string) {
  return {
    subject: `🌟 עוד ${needed - currentCount} שיתופי פעולה למנוי מופחת!`,
    html: brandWrap(
      `כמעט שם, ${name}!`,
      `
      <p>עוד <strong>${needed - currentCount}</strong> שיתופי פעולה עם ספקי הקהילה — ${g(gender, "ותזכה", "ותזכי")} אוטומטית למנוי המקצועי <strong>במחיר מופחת</strong>!</p>
      <div style="background:#1a1a1a;padding:20px;border-radius:8px;text-align:center;">
        <div style="font-size:32px;color:#C9A84C;font-weight:bold;">${currentCount} / ${needed}</div>
        <div style="color:#999;font-size:13px;margin-top:4px;">שיתופי פעולה ב־30 הימים האחרונים</div>
      </div>
      ${brandButton("ספקי הקהילה", `${BRAND_URL}/designer`)}
      `
    ),
  };
}

export function promotionGrantedEmail(name: string, newPlanName: string, savedAmount: number, gender?: string) {
  return {
    subject: `🎉 שודרגת למנוי ${newPlanName}!`,
    html: brandWrap(
      `מזל טוב, ${name}!`,
      `
      <p>בזכות שיתוף הפעולה שלך עם ספקי הקהילה, שודרגת אוטומטית למנוי <strong>${newPlanName}</strong>.</p>
      <p>${g(gender, "אתה חוסך", "את חוסכת")} עכשיו <strong>₪${savedAmount.toFixed(2)} כל חודש</strong> 💰</p>
      ${brandButton(g(gender, "צפה במנוי החדש", "צפי במנוי החדש"), `${BRAND_URL}/designer`)}
      `
    ),
  };
}

export function downgradeReminderEmail(name: string, downgradeAt: Date, gender?: string) {
  return {
    subject: `תזכורת: שינמוך תוכנית מתקרב`,
    html: brandWrap(
      `שלום ${name},`,
      `
      <p>בתאריך <strong>${downgradeAt.toLocaleDateString("he-IL")}</strong> תוכנית המנוי שלך תשונמך אוטומטית לתוכנית חינמית.</p>
      <p>אחרי המעבר, ${g(gender, "תקבל", "תקבלי")} חודש גישה של "קריאה בלבד" כדי להוריד את כל המידע שלך.</p>
      <p>אם ברצונך לבטל את השינוי:</p>
      ${brandButton(g(gender, "בטל את השינמוך", "בטלי את השינמוך"), `${BRAND_URL}/designer`)}
      `
    ),
  };
}

// ============================================================================
// Client-facing transactional emails (meetings)
// ----------------------------------------------------------------------------
// These are the ONLY templates in this file that are sent to end-clients (the
// designer's customers), not to designers. Two variants: invite on meeting
// creation, and reminder before the meeting.
//
// Both support two languages: `he` (default) and `en`. Language is chosen per
// client at creation time (see CrmClient.language) so the designer decides
// what each customer receives.
//
// PRIVACY: callers must already have loaded the client record via a designer-
// scoped query (x-user-id → designerId → client). Never call these with a
// client record fetched by a public route.
// ============================================================================

type ClientMeetingEmailInput = {
  clientName: string;
  designerName: string;
  language?: string | null; // "he" | "en" (default "he")
  title: string;
  startAt: Date;
  endAt: Date;
  location?: string | null;
  description?: string | null;
  /** Optional — only used by the reminder variant. */
  hoursBefore?: number;
};

function formatMeetingDate(startAt: Date, lang: "he" | "en") {
  const locale = lang === "en" ? "en-US" : "he-IL";
  const date = startAt.toLocaleDateString(locale, {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  const time = startAt.toLocaleTimeString(locale, {
    hour: "2-digit",
    minute: "2-digit",
  });
  return { date, time };
}

function normalizeLang(language?: string | null): "he" | "en" {
  return language === "en" ? "en" : "he";
}

/** Client meeting invite — sent immediately when a designer creates a meeting
 *  with `notifyClient=true` and the client has an email on file. */
export function clientMeetingInviteEmail(input: ClientMeetingEmailInput) {
  const lang = normalizeLang(input.language);
  const { date, time } = formatMeetingDate(input.startAt, lang);
  const endTime = input.endAt.toLocaleTimeString(lang === "en" ? "en-US" : "he-IL", {
    hour: "2-digit", minute: "2-digit",
  });

  if (lang === "en") {
    return {
      subject: `Meeting invitation from ${input.designerName}: ${input.title}`,
      html: `
<div dir="ltr" style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;background:#0a0a0a;color:#e5e5e5;padding:40px;border-radius:12px;">
  <div style="text-align:center;margin-bottom:24px;">
    <h1 style="color:#C9A84C;font-size:22px;margin:0;">Meeting invitation</h1>
  </div>
  <p>Hello ${input.clientName},</p>
  <p>${input.designerName} has scheduled a meeting with you:</p>
  <div style="background:#1a1a1a;padding:20px;border-radius:8px;border:1px solid #C9A84C33;">
    <p style="margin:6px 0;"><strong>Title:</strong> ${input.title}</p>
    <p style="margin:6px 0;"><strong>Date:</strong> ${date}</p>
    <p style="margin:6px 0;"><strong>Time:</strong> ${time} – ${endTime}</p>
    ${input.location ? `<p style="margin:6px 0;"><strong>Location:</strong> ${input.location}</p>` : ""}
    ${input.description ? `<p style="margin:6px 0;"><strong>Details:</strong> ${input.description}</p>` : ""}
  </div>
  <p style="color:#999;font-size:13px;margin-top:20px;">If you need to reschedule, please contact ${input.designerName} directly.</p>
  <hr style="border:none;border-top:1px solid #222;margin:30px 0;" />
  <p style="color:#666;font-size:11px;text-align:center;">Sent via Zirat Architecture.</p>
</div>`,
    };
  }

  // Hebrew (default)
  return {
    subject: `הזמנה לפגישה מ־${input.designerName}: ${input.title}`,
    html: `
<div dir="rtl" style="font-family:Heebo,Arial,sans-serif;max-width:600px;margin:0 auto;background:#0a0a0a;color:#e5e5e5;padding:40px;border-radius:12px;">
  <div style="text-align:center;margin-bottom:24px;">
    <h1 style="color:#C9A84C;font-size:22px;margin:0;">הזמנה לפגישה</h1>
  </div>
  <p>שלום ${input.clientName},</p>
  <p>${input.designerName} קבעו איתך פגישה:</p>
  <div style="background:#1a1a1a;padding:20px;border-radius:8px;border:1px solid #C9A84C33;">
    <p style="margin:6px 0;"><strong>נושא:</strong> ${input.title}</p>
    <p style="margin:6px 0;"><strong>תאריך:</strong> ${date}</p>
    <p style="margin:6px 0;"><strong>שעה:</strong> ${time} – ${endTime}</p>
    ${input.location ? `<p style="margin:6px 0;"><strong>מיקום:</strong> ${input.location}</p>` : ""}
    ${input.description ? `<p style="margin:6px 0;"><strong>פרטים:</strong> ${input.description}</p>` : ""}
  </div>
  <p style="color:#999;font-size:13px;margin-top:20px;">במקרה שצריך לדחות — אנא ${"צרו"} קשר ישירות עם ${input.designerName}.</p>
  <hr style="border:none;border-top:1px solid #222;margin:30px 0;" />
  <p style="color:#666;font-size:11px;text-align:center;">נשלח באמצעות זירת האדריכלות.</p>
</div>`,
  };
}

/** Client meeting reminder — sent `hoursBefore` hours before the meeting
 *  start (24h by default). Triggered by the reminders cron. */
export function clientMeetingReminderEmail(input: ClientMeetingEmailInput) {
  const lang = normalizeLang(input.language);
  const { date, time } = formatMeetingDate(input.startAt, lang);
  const hours = input.hoursBefore ?? 24;

  if (lang === "en") {
    return {
      subject: `Reminder: meeting with ${input.designerName} in ${hours} hours`,
      html: `
<div dir="ltr" style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;background:#0a0a0a;color:#e5e5e5;padding:40px;border-radius:12px;">
  <div style="text-align:center;margin-bottom:24px;">
    <h1 style="color:#C9A84C;font-size:22px;margin:0;">Meeting reminder</h1>
  </div>
  <p>Hello ${input.clientName},</p>
  <p>A reminder that your meeting with ${input.designerName} is in about <strong>${hours} hours</strong>:</p>
  <div style="background:#1a1a1a;padding:20px;border-radius:8px;border-right:4px solid #C9A84C;">
    <p style="margin:6px 0;"><strong>Title:</strong> ${input.title}</p>
    <p style="margin:6px 0;"><strong>Date:</strong> ${date}</p>
    <p style="margin:6px 0;"><strong>Time:</strong> ${time}</p>
    ${input.location ? `<p style="margin:6px 0;"><strong>Location:</strong> ${input.location}</p>` : ""}
  </div>
</div>`,
    };
  }

  return {
    subject: `תזכורת: פגישה עם ${input.designerName} בעוד ${hours} שעות`,
    html: `
<div dir="rtl" style="font-family:Heebo,Arial,sans-serif;max-width:600px;margin:0 auto;background:#0a0a0a;color:#e5e5e5;padding:40px;border-radius:12px;">
  <div style="text-align:center;margin-bottom:24px;">
    <h1 style="color:#C9A84C;font-size:22px;margin:0;">תזכורת לפגישה</h1>
  </div>
  <p>שלום ${input.clientName},</p>
  <p>תזכורת שבעוד <strong>${hours} שעות</strong> יש לך פגישה עם ${input.designerName}:</p>
  <div style="background:#1a1a1a;padding:20px;border-radius:8px;border-right:4px solid #C9A84C;">
    <p style="margin:6px 0;"><strong>נושא:</strong> ${input.title}</p>
    <p style="margin:6px 0;"><strong>תאריך:</strong> ${date}</p>
    <p style="margin:6px 0;"><strong>שעה:</strong> ${time}</p>
    ${input.location ? `<p style="margin:6px 0;"><strong>מיקום:</strong> ${input.location}</p>` : ""}
  </div>
</div>`,
  };
}

