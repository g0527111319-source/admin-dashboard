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

/** Read-only features: designer can view/download but not edit/add */
export type AccessLevel = "full" | "read_only" | "none";

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

export type SubscriptionStatus = {
  features: Record<Feature, boolean>;
  accessLevel: AccessLevel;
  status: string;
  planName?: string;
  isPaused: boolean;
  isReadOnly: boolean;
  isInGrace: boolean;
  isTrialing: boolean;
  trialEndsAt?: Date | null;
  gracePeriodEndsAt?: Date | null;
  readOnlyUntil?: Date | null;
  pauseEndsAt?: Date | null;
  currentPeriodEnd?: Date | null;
};

export async function getDesignerSubscriptionStatus(
  designerId: string
): Promise<SubscriptionStatus> {
  const subscription = await prisma.designerSubscription.findUnique({
    where: { designerId },
    include: { plan: true },
  });

  const now = new Date();
  const freeStatus: SubscriptionStatus = {
    features: { ...FREE_FEATURES },
    accessLevel: "full",
    status: "free",
    isPaused: false,
    isReadOnly: false,
    isInGrace: false,
    isTrialing: false,
  };

  if (!subscription || subscription.deletedAt || subscription.status === "cancelled" || subscription.status === "expired") {
    return freeStatus;
  }

  // Paused -> paid features locked until resume
  if (subscription.status === "paused") {
    return {
      ...freeStatus,
      status: "paused",
      planName: subscription.plan?.name,
      isPaused: true,
      pauseEndsAt: subscription.pauseEndsAt,
    };
  }

  // Read-only -> paid features visible but not editable
  if (subscription.status === "read_only") {
    const features = normaliseFeatures(subscription.plan?.features);
    return {
      features,
      accessLevel: "read_only",
      status: "read_only",
      planName: subscription.plan?.name,
      isPaused: false,
      isReadOnly: true,
      isInGrace: false,
      isTrialing: false,
      readOnlyUntil: subscription.readOnlyUntil,
    };
  }

  // Trial expired
  if (
    subscription.status === "trialing" &&
    subscription.trialEndsAt &&
    subscription.trialEndsAt < now
  ) {
    return freeStatus;
  }

  // Period ended and not renewed (and not trialing)
  if (
    subscription.currentPeriodEnd &&
    subscription.currentPeriodEnd < now &&
    subscription.status !== "trialing" &&
    subscription.status !== "past_due"
  ) {
    return freeStatus;
  }

  return {
    features: normaliseFeatures(subscription.plan?.features),
    accessLevel: "full",
    status: subscription.status,
    planName: subscription.plan?.name,
    isPaused: false,
    isReadOnly: false,
    isInGrace: subscription.status === "past_due",
    isTrialing: subscription.status === "trialing",
    trialEndsAt: subscription.trialEndsAt,
    gracePeriodEndsAt: subscription.gracePeriodEndsAt,
    currentPeriodEnd: subscription.currentPeriodEnd,
  };
}

export async function getDesignerFeatures(
  designerId: string
): Promise<Record<Feature, boolean>> {
  const s = await getDesignerSubscriptionStatus(designerId);
  return s.features;
}

export async function canAccessFeature(
  designerId: string,
  feature: Feature
): Promise<boolean> {
  const features = await getDesignerFeatures(designerId);
  return features[feature] === true;
}

export async function canEditFeature(
  designerId: string,
  feature: Feature
): Promise<boolean> {
  const s = await getDesignerSubscriptionStatus(designerId);
  return s.features[feature] === true && s.accessLevel === "full";
}
