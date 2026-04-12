import { Resend } from "resend";

const resend = process.env.RESEND_API_KEY
  ? new Resend(process.env.RESEND_API_KEY)
  : null;

const FROM_EMAIL = process.env.FROM_EMAIL || "זירת האדריכלות <noreply@resend.dev>";

type SendEmailOptions = {
  to: string | string[];
  subject: string;
  html: string;
};

export async function sendEmail({ to, subject, html }: SendEmailOptions) {
  if (!resend) {
    console.log("[Email Mock] Would send:", { to, subject });
    return { success: true, mock: true };
  }

  try {
    const { data, error } = await resend.emails.send({
      from: FROM_EMAIL,
      to: Array.isArray(to) ? to : [to],
      subject,
      html,
    });

    if (error) {
      console.error("[Email Error]", error);
      return { success: false, error };
    }

    return { success: true, id: data?.id };
  } catch (err) {
    console.error("[Email Exception]", err);
    return { success: false, error: err };
  }
}

// --- Email Templates ---

export function welcomeDesignerEmail(name: string) {
  return {
    subject: `ברוכה הבאה לזירת האדריכלות, ${name}!`,
    html: `
      <div dir="rtl" style="font-family: Heebo, Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #0a0a0a; color: #e5e5e5; padding: 40px; border-radius: 12px;">
        <div style="text-align: center; margin-bottom: 30px;">
          <h1 style="color: #C9A84C; font-size: 28px; margin: 0;">זירת האדריכלות</h1>
          <p style="color: #888; font-size: 14px;">קהילה שהיא בית</p>
        </div>
        <h2 style="color: #fff;">שלום ${name}! 👋</h2>
        <p>שמחים שהצטרפת לקהילת מעצבות הפנים המובילה בישראל.</p>
        <p>באזור האישי שלך תוכלי:</p>
        <ul style="color: #C9A84C;">
          <li style="color: #e5e5e5; margin-bottom: 8px;">לנהל לקוחות ופרויקטים</li>
          <li style="color: #e5e5e5; margin-bottom: 8px;">לדווח עסקאות ולצבור נקודות</li>
          <li style="color: #e5e5e5; margin-bottom: 8px;">לחפש ספקים מומלצים</li>
          <li style="color: #e5e5e5; margin-bottom: 8px;">להשתתף באירועים והגרלות</li>
        </ul>
        <div style="text-align: center; margin-top: 30px;">
          <a href="${process.env.NEXT_PUBLIC_APP_URL || "https://zirat-design.vercel.app"}/login"
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

export function dealNotificationEmail(designerName: string, supplierName: string, amount: number) {
  return {
    subject: `עסקה חדשה דווחה — ${supplierName}`,
    html: `
      <div dir="rtl" style="font-family: Heebo, Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #0a0a0a; color: #e5e5e5; padding: 40px; border-radius: 12px;">
        <h1 style="color: #C9A84C; text-align: center;">עסקה חדשה 🤝</h1>
        <div style="background: #1a1a1a; padding: 20px; border-radius: 8px; border: 1px solid #C9A84C33;">
          <p><strong>מעצבת:</strong> ${designerName}</p>
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

const BRAND_URL = process.env.NEXT_PUBLIC_APP_URL || "https://zirat-design.vercel.app";

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
  periodEnd: Date
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
      ${brandButton("צפי בפרטי המנוי", `${BRAND_URL}/designer`)}
      `
    ),
  };
}

export function trialEndingEmail(name: string, daysLeft: number, trialEndsAt: Date) {
  return {
    subject: `תקופת הניסיון שלך מסתיימת בעוד ${daysLeft} ימים`,
    html: brandWrap(
      `שלום ${name},`,
      `
      <p>תקופת הניסיון החינמית שלך בזירת האדריכלות תסתיים ב־<strong>${trialEndsAt.toLocaleDateString("he-IL")}</strong>.</p>
      <p>כדי להמשיך ליהנות מכל הכלים המתקדמים — CRM, כרטיס ביקור דיגיטלי, חוזים, ופורטפוליו — הזינו פרטי תשלום כבר עכשיו:</p>
      ${brandButton("המשיכי למנוי בתשלום", `${BRAND_URL}/designer`)}
      <p style="color:#999;font-size:13px;">אם לא תמשיכי, החשבון יעבור אוטומטית למנוי החינמי ותוכלי להמשיך ליהנות מהקהילה, האירועים וההגרלות.</p>
      `
    ),
  };
}

export function renewalReminderEmail(name: string, amount: number, renewAt: Date) {
  return {
    subject: `תזכורת: החיוב החודשי יתבצע ב־${renewAt.toLocaleDateString("he-IL")}`,
    html: brandWrap(
      `שלום ${name},`,
      `
      <p>זוהי תזכורת ידידותית: בתאריך <strong>${renewAt.toLocaleDateString("he-IL")}</strong> יתבצע חיוב אוטומטי של <strong>₪${amount.toFixed(2)}</strong> עבור חידוש המנוי החודשי שלך.</p>
      <p>אם את רוצה לעדכן את פרטי התשלום, לשדרג/לשנמך תוכנית, או לבטל את המנוי — את מוזמנת לעשות זאת בכל עת:</p>
      ${brandButton("לניהול המנוי", `${BRAND_URL}/designer`)}
      `
    ),
  };
}

export function paymentFailedEmail(name: string, attempt: number, maxAttempts: number, nextRetry: Date) {
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
      <p style="margin-top:16px;">אנא ודאי שפרטי כרטיס האשראי מעודכנים כדי להימנע מסגירת המנוי.</p>
      ${brandButton("עדכני פרטי תשלום", `${BRAND_URL}/designer`)}
      <p style="color:#999;font-size:12px;">אם החיוב ימשיך להיכשל לאחר ${maxAttempts} ניסיונות, המנוי יעבור למצב "קריאה בלבד" עם 30 ימים להוריד את כל המידע שלך.</p>
      `
    ),
  };
}

export function subscriptionCancelledEmail(name: string, effectiveDate: Date, downloadUntil: Date) {
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
      <p>עד לתאריך הנ"ל תוכלי להיכנס לחשבון ולהוריד את כל המידע שלך — לקוחות, פרויקטים, חוזים וקבצים.</p>
      ${brandButton("להורדת המידע", `${BRAND_URL}/designer`)}
      <p style="color:#999;font-size:13px;">חבל שאת עוזבת — אם תחליטי לחזור, החשבון שלך יהיה כאן מחכה לך.</p>
      `
    ),
  };
}

export function subscriptionPausedEmail(name: string, resumeAt: Date) {
  return {
    subject: `המנוי שלך הושהה`,
    html: brandWrap(
      `שלום ${name},`,
      `
      <p>המנוי שלך הושהה בהצלחה ולא תחויבי עד להפעלה מחדש.</p>
      <p><strong>השהיה מתוכננת עד:</strong> ${resumeAt.toLocaleDateString("he-IL")}</p>
      <p>באפשרותך להפעיל את המנוי מחדש בכל עת:</p>
      ${brandButton("הפעילי מחדש", `${BRAND_URL}/designer`)}
      `
    ),
  };
}

export function promotionNearEmail(name: string, currentCount: number, needed: number) {
  return {
    subject: `🌟 עוד ${needed - currentCount} שיתופי פעולה למנוי מופחת!`,
    html: brandWrap(
      `כמעט שם, ${name}!`,
      `
      <p>עוד <strong>${needed - currentCount}</strong> שיתופי פעולה עם ספקי הקהילה — ותזכי אוטומטית למנוי המקצועי <strong>במחיר מופחת</strong>!</p>
      <div style="background:#1a1a1a;padding:20px;border-radius:8px;text-align:center;">
        <div style="font-size:32px;color:#C9A84C;font-weight:bold;">${currentCount} / ${needed}</div>
        <div style="color:#999;font-size:13px;margin-top:4px;">שיתופי פעולה ב־30 הימים האחרונים</div>
      </div>
      ${brandButton("ספקי הקהילה", `${BRAND_URL}/designer`)}
      `
    ),
  };
}

export function promotionGrantedEmail(name: string, newPlanName: string, savedAmount: number) {
  return {
    subject: `🎉 שודרגת למנוי ${newPlanName}!`,
    html: brandWrap(
      `מזל טוב, ${name}!`,
      `
      <p>בזכות שיתוף הפעולה שלך עם ספקי הקהילה, שודרגת אוטומטית למנוי <strong>${newPlanName}</strong>.</p>
      <p>את חוסכת עכשיו <strong>₪${savedAmount.toFixed(2)} כל חודש</strong> 💰</p>
      ${brandButton("צפי במנוי החדש", `${BRAND_URL}/designer`)}
      `
    ),
  };
}

export function downgradeReminderEmail(name: string, downgradeAt: Date) {
  return {
    subject: `תזכורת: שינמוך תוכנית מתקרב`,
    html: brandWrap(
      `שלום ${name},`,
      `
      <p>בתאריך <strong>${downgradeAt.toLocaleDateString("he-IL")}</strong> תוכנית המנוי שלך תשונמך אוטומטית לתוכנית חינמית.</p>
      <p>אחרי המעבר, תקבלי חודש גישה של "קריאה בלבד" כדי להוריד את כל המידע שלך.</p>
      <p>אם ברצונך לבטל את השינוי:</p>
      ${brandButton("בטלי את השינמוך", `${BRAND_URL}/designer`)}
      `
    ),
  };
}

