import prisma from "./prisma";

export type Feature =
  | "crm"
  | "businessCard"
  | "contracts"
  | "events"
  | "suppliers"
  | "raffles"
  | "portfolio"
  | "messages";

const FREE_FEATURES: Record<Feature, boolean> = {
  crm: false,
  businessCard: false,
  contracts: false,
  events: true,
  suppliers: true,
  raffles: true,
  portfolio: false,
  messages: false,
};

function normaliseFeatures(raw: unknown): Record<Feature, boolean> {
  const base: Record<Feature, boolean> = { ...FREE_FEATURES };
  if (raw && typeof raw === "object") {
    for (const key of Object.keys(base) as Feature[]) {
      const v = (raw as Record<string, unknown>)[key];
      if (typeof v === "boolean") base[key] = v;
    }
  }
  return base;
}

export async function getDesignerFeatures(
  designerId: string
): Promise<Record<Feature, boolean>> {
  const subscription = await prisma.designerSubscription.findUnique({
    where: { designerId },
    include: { plan: true },
  });

  if (
    !subscription ||
    subscription.status === "cancelled" ||
    subscription.status === "expired"
  ) {
    return { ...FREE_FEATURES };
  }

  // Trial expired -> fall back to free
  if (
    subscription.status === "trial" &&
    subscription.trialEndsAt &&
    subscription.trialEndsAt < new Date()
  ) {
    return { ...FREE_FEATURES };
  }

  // Period ended and not renewed
  if (
    subscription.currentPeriodEnd &&
    subscription.currentPeriodEnd < new Date() &&
    subscription.status !== "trial"
  ) {
    return { ...FREE_FEATURES };
  }

  return normaliseFeatures(subscription.plan?.features);
}

export async function canAccessFeature(
  designerId: string,
  feature: Feature
): Promise<boolean> {
  const features = await getDesignerFeatures(designerId);
  return features[feature] === true;
}
