export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { sendEmail } from "@/lib/email";
import { getSession } from "@/lib/auth";

const ADMIN_NOTIFY_EMAIL = "z.adrichalut@gmail.com";

type FeedbackType = "BUG" | "FEATURE";

function typeLabel(t: FeedbackType): string {
  return t === "BUG" ? "דיווח על תקלה" : "הצעה לשיפור";
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export async function POST(request: NextRequest) {
  try {
    const session = await getSession();

    const body = await request.json().catch(() => null);
    if (!body || typeof body !== "object") {
      return NextResponse.json({ error: "נתונים לא תקינים" }, { status: 400 });
    }

    const type = body.type as FeedbackType | undefined;
    const message = typeof body.message === "string" ? body.message.trim() : "";
    const subject = typeof body.subject === "string" ? body.subject.trim() : "";
    const imageUrl = typeof body.imageUrl === "string" ? body.imageUrl.trim() : "";
    const pageUrl = typeof body.pageUrl === "string" ? body.pageUrl.trim() : "";

    if (type !== "BUG" && type !== "FEATURE") {
      return NextResponse.json({ error: "סוג דיווח לא חוקי" }, { status: 400 });
    }
    if (!message || message.length < 3) {
      return NextResponse.json({ error: "יש להזין תיאור" }, { status: 400 });
    }
    if (message.length > 5000) {
      return NextResponse.json({ error: "התיאור ארוך מדי" }, { status: 400 });
    }

    const senderName = session?.name || null;
    const senderEmail = session?.email || null;
    const designerId = session?.role === "designer" ? session?.userId ?? null : null;
    const userAgent = request.headers.get("user-agent") || null;

    const created = await prisma.feedback.create({
      data: {
        type,
        senderName,
        senderEmail,
        designerId,
        subject: subject || null,
        message,
        imageUrl: imageUrl || null,
        pageUrl: pageUrl || null,
        userAgent,
      },
    });

    const label = typeLabel(type);
    const fromLine = senderName || senderEmail || "משתמשת אנונימית";
    const html = `
      <div dir="rtl" style="font-family:Arial,sans-serif;max-width:640px;margin:0 auto;padding:24px;color:#111">
        <h2 style="margin:0 0 12px;color:#B8901E">${label} חדש/ה מזירת האדריכלות</h2>
        <p style="margin:0 0 4px"><b>מאת:</b> ${escapeHtml(fromLine)}${senderEmail ? ` (${escapeHtml(senderEmail)})` : ""}</p>
        ${subject ? `<p style="margin:0 0 4px"><b>נושא:</b> ${escapeHtml(subject)}</p>` : ""}
        ${pageUrl ? `<p style="margin:0 0 4px"><b>עמוד:</b> <a href="${escapeHtml(pageUrl)}">${escapeHtml(pageUrl)}</a></p>` : ""}
        <hr style="margin:16px 0;border:0;border-top:1px solid #eee" />
        <div style="white-space:pre-wrap;line-height:1.6">${escapeHtml(message)}</div>
        ${imageUrl ? `<div style="margin-top:20px"><img src="${escapeHtml(imageUrl)}" alt="צילום מצורף" style="max-width:100%;border:1px solid #ddd;border-radius:8px" /></div>` : ""}
        <p style="margin-top:20px;font-size:12px;color:#777">Feedback ID: ${created.id}</p>
      </div>
    `;

    sendEmail({
      to: ADMIN_NOTIFY_EMAIL,
      subject: `[זירה] ${label}${subject ? ` — ${subject}` : ""}`,
      html,
    }).catch((err) => console.error("[feedback] email send failed:", err));

    return NextResponse.json({ ok: true, id: created.id });
  } catch (error) {
    console.error("[feedback] create error:", error);
    return NextResponse.json({ error: "שגיאה בשמירת הדיווח" }, { status: 500 });
  }
}
