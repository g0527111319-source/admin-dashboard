import { txt } from "@/content/siteText";
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
export const dynamic = "force-dynamic";
// GET /api/designers — רשימת מעצבות
export async function GET(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url);
        const area = searchParams.get("area");
        const specialization = searchParams.get("specialization");
        const search = searchParams.get("search");
        const where: Record<string, unknown> = { isActive: true };
        if (area)
            where.area = area;
        if (specialization)
            where.specialization = specialization;
        if (search) {
            where.OR = [
                { fullName: { contains: search, mode: "insensitive" } },
                { city: { contains: search, mode: "insensitive" } },
                { email: { contains: search, mode: "insensitive" } },
            ];
        }
        const designers = await prisma.designer.findMany({
            where,
            orderBy: { totalDealsReported: "desc" },
        });
        return NextResponse.json(designers);
    }
    catch (error) {
        console.error("Designers fetch error:", error);
        return NextResponse.json({ error: txt("src/app/api/designers/route.ts::001", "\u05E9\u05D2\u05D9\u05D0\u05D4 \u05D1\u05D8\u05E2\u05D9\u05E0\u05EA \u05DE\u05E2\u05E6\u05D1\u05D5\u05EA") }, { status: 500 });
    }
}
