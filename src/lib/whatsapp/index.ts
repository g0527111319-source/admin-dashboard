// ==========================================
// WhatsApp Bot — Module Exports
// ==========================================
// Central export point for the WhatsApp bot system.

export { sendMessage, sendImage, sendDocument, sendButtons, getInstanceStatus, isMockMode, getMessagesProcessed24h } from "./green-api";
export { resolveUser, normalizePhone, UNKNOWN_USER_MESSAGE } from "./user-resolver";
export type { WhatsAppUser } from "./user-resolver";
export { processMessage, getActiveConversationsCount, clearConversation } from "./conversation-engine";
export { validateWebhookSignature, isRateLimited, sanitizeMessage, logInteraction, isBlocked, blockPhone, unblockPhone, detectInjection, recordInjectionAttempt, isTemporarilyBlocked, logSecurityEvent, notifyAdminOfBlock, INJECTION_REJECTION_MESSAGE } from "./security";
export { executeTool, toolDefinitions, getAnthropicTools } from "./tools";
export { scheduleTask, listTasks, cancelTask, executeScheduledTasks, parseTaskCommand } from "./scheduled-tasks";
export { generateDailySummary } from "./daily-summary";
