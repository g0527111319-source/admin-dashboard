import prisma from "@/lib/prisma";
import CouponsManager from "@/components/admin/CouponsManager";

export const dynamic = "force-dynamic";

export default async function AdminCouponsPage() {
  let plans: { id: string; name: string; slug: string; price: string }[] = [];
  try {
    const dbPlans = await prisma.subscriptionPlan.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: "asc" },
      select: { id: true, name: true, slug: true, price: true },
    });
    plans = dbPlans.map((p) => ({
      id: p.id,
      name: p.name,
      slug: p.slug,
      price: String(p.price),
    }));
  } catch (error) {
    console.error("Failed loading plans for coupons page:", error);
  }

  return (
    <div dir="rtl" className="min-h-screen bg-bg py-8 px-6">
      <div className="max-w-[1280px] mx-auto">
        <header className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-1 h-8 bg-gradient-to-b from-gold to-gold-light rounded-full" />
            <h1 className="font-heading text-3xl md:text-4xl font-bold text-text-primary tracking-tight">
              ניהול קופונים והנחות
            </h1>
          </div>
          <p className="text-text-muted text-sm md:text-base leading-relaxed max-w-2xl">
            יצירה, ניהול והשבתה של קופוני הנחה למעצבות
          </p>
        </header>

        <CouponsManager plans={plans} />
      </div>
    </div>
  );
}
