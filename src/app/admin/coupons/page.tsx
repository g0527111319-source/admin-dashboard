import prisma from "@/lib/prisma";
import CouponsManager from "@/components/admin/CouponsManager";

export const dynamic = "force-dynamic";

const GOLD = "#C9A84C";

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
    <div
      dir="rtl"
      style={{
        minHeight: "100vh",
        background: "#050505",
        color: "white",
        padding: 24,
      }}
    >
      <div style={{ maxWidth: 1280, margin: "0 auto" }}>
        <header style={{ marginBottom: 24 }}>
          <h1 style={{ color: GOLD, fontSize: 28, fontWeight: 700, margin: 0 }}>
            ניהול קופונים והנחות
          </h1>
          <p
            style={{
              color: "rgba(255,255,255,0.6)",
              fontSize: 14,
              marginTop: 6,
            }}
          >
            יצירה, ניהול והשבתה של קופוני הנחה למעצבות
          </p>
        </header>

        <CouponsManager plans={plans} />
      </div>
    </div>
  );
}
