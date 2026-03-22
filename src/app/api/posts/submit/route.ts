import { txt } from "@/content/siteText";
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
export const dynamic = "force-dynamic";
// POST /api/posts/submit — ספק שולח פרסום חדש
export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { supplierId, imageUrl, caption, scheduledSlot, scheduledDate } = body;
        if (!supplierId || !caption) {
            return NextResponse.json({ error: txt("src/app/api/posts/submit/route.ts::001", "\u05D7\u05E1\u05E8\u05D9\u05DD \u05E9\u05D3\u05D5\u05EA \u05D7\u05D5\u05D1\u05D4") }, { status: 400 });
        }
        // בדיקת ספק קיים
        const supplier = await prisma.supplier.findUnique({
            where: { id: supplierId },
        });
        if (!supplier) {
            return NextResponse.json({ error: txt("src/app/api/posts/submit/route.ts::002", "\u05E1\u05E4\u05E7 \u05DC\u05D0 \u05E0\u05DE\u05E6\u05D0") }, { status: 404 });
        }
        // יצירת פרסום
        const post = await prisma.post.create({
            data: {
                supplierId,
                imageUrl: imageUrl || null,
                caption,
                scheduledTime: scheduledSlot || "10:30",
                scheduledDate: scheduledDate ? new Date(scheduledDate) : new Date(),
                status: "PENDING",
            },
        });
        // TODO: שליחת הודעת WhatsApp לתמר
        // await sendMessage(ADMIN_PHONE, templates.postApprovalRequest(supplier.name));
        return NextResponse.json({ success: true, post }, { status: 201 });
    }
    catch (error) {
        console.error("Post submit error:", error);
        return NextResponse.json({ error: txt("src/app/api/posts/submit/route.ts::003", "\u05E9\u05D2\u05D9\u05D0\u05D4 \u05D1\u05E9\u05DC\u05D9\u05D7\u05EA \u05D4\u05E4\u05E8\u05E1\u05D5\u05DD") }, { status: 500 });
    }
}
