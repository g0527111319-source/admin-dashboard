/**
 * In-app notifications library (item 13).
 * Use alongside email — bell icon in header reads unread count.
 */
import prisma from "./prisma";

export type NotificationType =
  | "trial_ending"
  | "renewal_reminder"
  | "payment_failed"
  | "payment_success"
  | "payment_retry"
  | "subscription_cancelled"
  | "subscription_paused"
  | "pause_ending"
  | "feature_locked"
  | "promotion_near"
  | "promotion_granted"
  | "downgrade_reminder"
  | "downgrade_applied"
  | "grace_period"
  | "welcome"
  | "admin_alert";

export type CreateNotificationParams = {
  userId: string;
  userType?: "designer" | "admin";
  type: NotificationType;
  title: string;
  body: string;
  linkUrl?: string;
  icon?: string;
};

export async function createNotification(p: CreateNotificationParams) {
  try {
    return await prisma.inAppNotification.create({
      data: {
        userId: p.userId,
        userType: p.userType || "designer",
        type: p.type,
        title: p.title,
        body: p.body,
        linkUrl: p.linkUrl,
        icon: p.icon || iconForType(p.type),
      },
    });
  } catch (err) {
    console.error("[Notifications] Create failed:", err);
    return null;
  }
}

export async function listNotifications(
  userId: string,
  opts: { userType?: "designer" | "admin"; limit?: number; unreadOnly?: boolean } = {}
) {
  return prisma.inAppNotification.findMany({
    where: {
      userId,
      userType: opts.userType || "designer",
      ...(opts.unreadOnly ? { readAt: null } : {}),
    },
    orderBy: { createdAt: "desc" },
    take: opts.limit || 30,
  });
}

export async function unreadCount(userId: string, userType: "designer" | "admin" = "designer") {
  return prisma.inAppNotification.count({
    where: { userId, userType, readAt: null },
  });
}

export async function markRead(id: string, userId: string) {
  return prisma.inAppNotification.updateMany({
    where: { id, userId },
    data: { readAt: new Date() },
  });
}

export async function markAllRead(userId: string, userType: "designer" | "admin" = "designer") {
  return prisma.inAppNotification.updateMany({
    where: { userId, userType, readAt: null },
    data: { readAt: new Date() },
  });
}

function iconForType(type: NotificationType): string {
  const map: Record<NotificationType, string> = {
    trial_ending: "⏰",
    renewal_reminder: "🔁",
    payment_failed: "⚠️",
    payment_success: "✅",
    payment_retry: "🔄",
    subscription_cancelled: "❌",
    subscription_paused: "⏸️",
    pause_ending: "▶️",
    feature_locked: "🔒",
    promotion_near: "🌟",
    promotion_granted: "🎉",
    downgrade_reminder: "📉",
    downgrade_applied: "📋",
    grace_period: "🛟",
    welcome: "👋",
    admin_alert: "🚨",
  };
  return map[type] || "🔔";
}
