import prisma from "@/lib/prisma";

export type PlanFeatures = {
  events: boolean;
  suppliers: boolean;
  raffles: boolean;
  crm: boolean;
  businessCard: boolean;
  contracts: boolean;
  portfolio: boolean;
  messages: boolean;
};

export const DEFAULT_PLANS: Array<{
  slug: string;
  name: string;
  price: number;
  description: string;
  features: PlanFeatures;
  sortOrder: number;
}> = [
  {
    slug: "free",
    name: "חינמי",
    price: 0,
    description: "גישה לאירועי קהילה, שיתופי פעולה עם ספקים והגרלות",
    features: {
      events: true,
      suppliers: true,
      raffles: true,
      crm: false,
      businessCard: false,
      contracts: false,
      portfolio: false,
      messages: false,
    },
    sortOrder: 1,
  },
  {
    slug: "pro",
    name: "מנוי בתשלום",
    price: 149,
    description: "גישה מלאה — CRM, ניהול לקוחות, כרטיס ביקור וחוזים",
    features: {
      events: true,
      suppliers: true,
      raffles: true,
      crm: true,
      businessCard: true,
      contracts: true,
      portfolio: true,
      messages: true,
    },
    sortOrder: 2,
  },
];

/** Legacy plan slugs that should be deactivated to keep only free + pro visible */
const LEGACY_PLAN_SLUGS = ["pro-discounted", "premium-free"];

export async function seedSubscriptionPlans() {
  const results = [];
  for (const plan of DEFAULT_PLANS) {
    const existing = await prisma.subscriptionPlan.findUnique({
      where: { slug: plan.slug },
    });
    if (!existing) {
      const created = await prisma.subscriptionPlan.create({
        data: {
          slug: plan.slug,
          name: plan.name,
          price: plan.price,
          description: plan.description,
          features: plan.features as unknown as object,
          sortOrder: plan.sortOrder,
          currency: "ILS",
          billingCycle: "monthly",
          isActive: true,
        },
      });
      results.push({ created: true, plan: created });
    } else {
      // Keep name/description/price/features aligned with current defaults
      const updated = await prisma.subscriptionPlan.update({
        where: { slug: plan.slug },
        data: {
          name: plan.name,
          description: plan.description,
          price: plan.price,
          features: plan.features as unknown as object,
          sortOrder: plan.sortOrder,
          isActive: true,
        },
      });
      results.push({ created: false, plan: updated });
    }
  }

  // Deactivate legacy plans that were replaced by the simplified two-tier system.
  // Existing subscriptions still keep their plan association, but new users only see free + pro.
  for (const slug of LEGACY_PLAN_SLUGS) {
    try {
      await prisma.subscriptionPlan.updateMany({
        where: { slug, isActive: true },
        data: { isActive: false },
      });
    } catch {
      // plan may not exist — ignore
    }
  }

  return results;
}
