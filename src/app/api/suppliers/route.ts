import { txt } from "@/content/siteText";
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
export const dynamic = "force-dynamic";
// GET /api/suppliers — רשימת ספקים
export async function GET(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url);
        const category = searchParams.get("category");
        const area = searchParams.get("area");
        const active = searchParams.get("active");
        const where: Record<string, unknown> = {
            approvalStatus: "APPROVED",
        };
        if (category)
            where.category = category;
        if (area)
            where.area = area;
        if (active !== null)
            where.isActive = active === "true";
        const suppliers = await prisma.supplier.findMany({
            where,
            orderBy: { averageRating: "desc" },
        });
        return NextResponse.json(suppliers);
    }
    catch (error) {
        console.error("Suppliers fetch error:", error);
        return NextResponse.json({ error: txt("src/app/api/suppliers/route.ts::001", "\u05E9\u05D2\u05D9\u05D0\u05D4 \u05D1\u05D8\u05E2\u05D9\u05E0\u05EA \u05E1\u05E4\u05E7\u05D9\u05DD") }, { status: 500 });
    }
}
// POST /api/suppliers — הוספת ספק חדש
export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { name, contactName, phone, email, category, city, area, monthlyFee } = body;
        if (!name || !contactName || !phone || !category) {
            return NextResponse.json({ error: txt("src/app/api/suppliers/route.ts::002", "\u05D7\u05E1\u05E8\u05D9\u05DD \u05E9\u05D3\u05D5\u05EA \u05D7\u05D5\u05D1\u05D4") }, { status: 400 });
        }
        const supplier = await prisma.supplier.create({
            data: {
                name,
                contactName,
                phone,
                email,
                category,
                city,
                area,
                monthlyFee: monthlyFee ? Number(monthlyFee) : null,
                loginToken: crypto.randomUUID(),
            },
        });
        return NextResponse.json({ success: true, supplier }, { status: 201 });
    }
    catch (error) {
        console.error("Supplier create error:", error);
        return NextResponse.json({ error: txt("src/app/api/suppliers/route.ts::003", "\u05E9\u05D2\u05D9\u05D0\u05D4 \u05D1\u05D9\u05E6\u05D9\u05E8\u05EA \u05E1\u05E4\u05E7") }, { status: 500 });
    }
}
