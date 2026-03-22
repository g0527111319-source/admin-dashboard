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
          <a href="${process.env.NEXT_PUBLIC_APP_URL || "https://admin-dashboard-nu-mocha.vercel.app"}/login"
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
