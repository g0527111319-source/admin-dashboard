import { redirect, notFound } from "next/navigation";
import prisma from "@/lib/prisma";
import OnboardingWizard from "@/components/subscription/OnboardingWizard";
import type { Plan } from "@/components/subscription/PlanComparisonTable";

const GOLD = "#C9A84C";

export const dynamic = "force-dynamic";

type PageProps = {
  params: { id: string };
};

export default async function DesignerOnboardingPage({ params }: PageProps) {
  const designerId = params.id;

  const designer = await prisma.designer.findUnique({
    where: { id: designerId },
    select: { id: true, fullName: true },
  });

  if (!designer) {
    notFound();
  }

  const existingSub = await prisma.designerSubscription.findUnique({
    where: { designerId },
  });

  if (
    existingSub &&
    !existingSub.deletedAt &&
    existingSub.status !== "cancelled" &&
    existingSub.status !== "expired"
  ) {
    redirect(`/designer/${designerId}`);
  }

  const rawPlans = await prisma.subscriptionPlan.findMany({
    where: { isActive: true },
    orderBy: { sortOrder: "asc" },
  });

  const plans: Plan[] = rawPlans.map((p) => ({
    id: p.id,
    name: p.name,
    slug: p.slug,
    price: p.price?.toString?.() ?? String(p.price),
    currency: p.currency || "ILS",
    description: p.description,
    features: (p.features as Record<string, boolean>) || {},
  }));

  return (
    <main
      dir="rtl"
      style={{
        minHeight: "100vh",
        background: "#0f0f1e",
        color: "#fff",
        padding: "60px 20px",
      }}
    >
      <div style={{ maxWidth: 1100, margin: "0 auto" }}>
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <h1
            style={{
              fontSize: 14,
              letterSpacing: 4,
              color: GOLD,
              textTransform: "uppercase",
              marginBottom: 8,
            }}
          >
            ZIRAT COMMUNITY
          </h1>
          <p style={{ color: "rgba(255,255,255,0.5)", fontSize: 14 }}>
            תהליך הרשמה — שלוש צעדים בלבד
          </p>
        </div>
        <OnboardingWizard designerId={designerId} plans={plans} />
      </div>
    </main>
  );
}
