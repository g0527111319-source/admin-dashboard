/**
 * Subscription audit logger (item 4).
 * Records every change to a subscription with actor, reason and metadata.
 */
import prisma from "./prisma";

export type AuditAction =
  | "created"
  | "plan_changed"
  | "status_changed"
  | "cancelled"
  | "paused"
  | "resumed"
  | "payment_succeeded"
  | "payment_failed"
  | "payment_retried"
  | "trial_granted"
  | "trial_ended"
  | "coupon_applied"
  | "coupon_removed"
  | "downgrade_scheduled"
  | "downgrade_applied"
  | "upgrade_applied"
  | "promoted_auto"
  | "grace_entered"
  | "grace_exited"
  | "deleted"
  | "restored";

export type AuditActor = "designer" | "admin" | "system" | "webhook";

export type LogParams = {
  subscriptionId: string;
  designerId: string;
  action: AuditAction;
  actorType: AuditActor;
  actorId?: string;
  actorName?: string;
  fromValue?: string | null;
  toValue?: string | null;
  metadata?: Record<string, unknown>;
  reason?: string;
  ipAddress?: string;
};

export async function logSubscriptionAudit(params: LogParams): Promise<void> {
  try {
    await prisma.subscriptionAuditLog.create({
      data: {
        subscriptionId: params.subscriptionId,
        designerId: params.designerId,
        action: params.action,
        actorType: params.actorType,
        actorId: params.actorId,
        actorName: params.actorName,
        fromValue: params.fromValue ?? undefined,
        toValue: params.toValue ?? undefined,
        metadata: params.metadata as never,
        reason: params.reason,
        ipAddress: params.ipAddress,
      },
    });
  } catch (err) {
    console.error("[SubscriptionAudit] Failed to log:", err);
  }
}

export async function getSubscriptionAuditTrail(subscriptionId: string, limit = 50) {
  return prisma.subscriptionAuditLog.findMany({
    where: { subscriptionId },
    orderBy: { createdAt: "desc" },
    take: limit,
  });
}

export async function getDesignerAuditTrail(designerId: string, limit = 100) {
  return prisma.subscriptionAuditLog.findMany({
    where: { designerId },
    orderBy: { createdAt: "desc" },
    take: limit,
  });
}
