import prisma from "@/lib/prisma";

export type PlanFeatures = {
  events: boolean;
  suppliers: boolean;
  raffles: boolean;
  crm: boolean;
  businessCard: boolean;
  contracts: boolean;
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
    },
    sortOrder: 1,
  },
  {
    slug: "pro",
    name: "מקצועי",
    price: 149,
    description: "גישה מלאה — CRM, ניהול לקוחות, כרטיס ביקור וחוזים",
    features: {
      events: true,
      suppliers: true,
      raffles: true,
      crm: true,
      businessCard: true,
      contracts: true,
    },
    sortOrder: 2,
  },
  {
    slug: "pro-discounted",
    name: "מקצועי מופחת",
    price: 79,
    description: "מחיר מופחת למעצבות ששיתפו פעולה עם ספקים",
    features: {
      events: true,
      suppliers: true,
      raffles: true,
      crm: true,
      businessCard: true,
      contracts: true,
    },
    sortOrder: 3,
  },
  {
    slug: "premium-free",
    name: "פרימיום חינם",
    price: 0,
    description: "שדרוג חינם למעצבות המובילות בשיתופי פעולה",
    features: {
      events: true,
      suppliers: true,
      raffles: true,
      crm: true,
      businessCard: true,
      contracts: true,
    },
    sortOrder: 4,
  },
];

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
      results.push({ created: false, plan: existing });
    }
  }
  return results;
}
