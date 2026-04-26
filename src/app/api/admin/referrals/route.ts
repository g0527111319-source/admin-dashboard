export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireRole, ADMIN_ONLY } from "@/lib/api-auth";

const CODE_REGEX = /^[A-Z0-9_-]{2,64}$/;

function normalizeCode(input: unknown): string | null {
  if (typeof input !== "string") return null;
  const code = input.trim().toUpperCase();
  if (!CODE_REGEX.test(code)) return null;
  return code;
}

export async function GET(req: NextRequest) {
  const auth = requireRole(req, ADMIN_ONLY);
  if (!auth.ok) return auth.response;
  try {
    const links = await prisma.referralLink.findMany({
      orderBy: { createdAt: "desc" },
      take: 200,
    });
    if (links.length === 0) return NextResponse.json({ items: [] });

    const codes = links.map((l) => l.code);

    const designers = await prisma.designer.findMany({
      where: { referralCode: { in: codes } },
      select: {
        id: true,
        fullName: true,
        email: true,
        approvalStatus: true,
        referralCode: true,
        createdAt: true,
        subscription: {
          select: { id: true, status: true, planId: true },
        },
      },
    });

    const ACTIVE_PAID_STATUSES = new Set(["active", "trialing", "grace", "past_due"]);

    const items = links.map((link) => {
      const matched = designers.filter((d) => d.referralCode === link.code);
      const registered = matched.length;
      const paid = matched.filter(
        (d) => d.subscription && ACTIVE_PAID_STATUSES.has(d.subscription.status),
      ).length;
      const approved = matched.filter((d) => d.approvalStatus === "APPROVED").length;
      return {
        id: link.id,
        code: link.code,
        partnerName: link.partnerName,
        notes: link.notes,
        active: link.active,
        createdAt: link.createdAt,
        updatedAt: link.updatedAt,
        stats: { registered, approved, paid },
        designers: matched.map((d) => ({
          id: d.id,
          fullName: d.fullName,
          email: d.email,
          approvalStatus: d.approvalStatus,
          createdAt: d.createdAt,
          subscriptionStatus: d.subscription?.status || null,
        })),
      };
    });

    return NextResponse.json({ items });
  } catch (error) {
    console.error("[admin/referrals] list error:", error);
    return NextResponse.json({ error: "שגיאה בטעינת הלינקים" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const auth = requireRole(request, ADMIN_ONLY);
  if (!auth.ok) return auth.response;
  try {
    const body = await request.json().catch(() => null);
    const code = normalizeCode(body?.code);
    const partnerName = typeof body?.partnerName === "string" ? body.partnerName.trim() : "";
    const notes = typeof body?.notes === "string" ? body.notes.trim() : "";

    if (!code) {
      return NextResponse.json(
        { error: "קוד לא תקין — אותיות לועזיות, ספרות, מקף או קו תחתון (2-64 תווים)" },
        { status: 400 },
      );
    }
    if (!partnerName) {
      return NextResponse.json({ error: "שם השותף חובה" }, { status: 400 });
    }

    const exists = await prisma.referralLink.findUnique({ where: { code } });
    if (exists) {
      return NextResponse.json({ error: "קוד זה כבר קיים" }, { status: 409 });
    }

    const link = await prisma.referralLink.create({
      data: {
        code,
        partnerName,
        notes: notes || null,
        active: true,
      },
    });

    return NextResponse.json({ link }, { status: 201 });
  } catch (error) {
    console.error("[admin/referrals] create error:", error);
    return NextResponse.json({ error: "שגיאה ביצירה" }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  const auth = requireRole(request, ADMIN_ONLY);
  if (!auth.ok) return auth.response;
  try {
    const body = await request.json().catch(() => null);
    const id = typeof body?.id === "string" ? body.id : null;
    if (!id) return NextResponse.json({ error: "חסר מזהה" }, { status: 400 });

    const data: { partnerName?: string; notes?: string | null; active?: boolean } = {};
    if (typeof body.partnerName === "string") {
      const v = body.partnerName.trim();
      if (!v) return NextResponse.json({ error: "שם השותף חובה" }, { status: 400 });
      data.partnerName = v;
    }
    if (typeof body.notes === "string") {
      data.notes = body.notes.trim() || null;
    }
    if (typeof body.active === "boolean") {
      data.active = body.active;
    }

    if (Object.keys(data).length === 0) {
      return NextResponse.json({ error: "אין מה לעדכן" }, { status: 400 });
    }

    await prisma.referralLink.update({ where: { id }, data });
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[admin/referrals] update error:", error);
    return NextResponse.json({ error: "שגיאה בעדכון" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  const auth = requireRole(request, ADMIN_ONLY);
  if (!auth.ok) return auth.response;
  try {
    const url = new URL(request.url);
    const id = url.searchParams.get("id");
    if (!id) return NextResponse.json({ error: "חסר מזהה" }, { status: 400 });
    await prisma.referralLink.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[admin/referrals] delete error:", error);
    return NextResponse.json({ error: "שגיאה במחיקה" }, { status: 500 });
  }
}
