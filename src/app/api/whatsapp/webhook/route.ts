// ==========================================
// WhatsApp Webhook — Green API Incoming Messages
// ==========================================
// POST endpoint that receives messages from Green API,
// processes them through the AI engine, and responds.

import { NextRequest, NextResponse } from "next/server";
import { validateWebhookSignature, isRateLimited, sanitizeMessage, logInteraction, isBlocked, detectInjection, recordInjectionAttempt, logSecurityEvent, notifyAdminOfBlock, INJECTION_REJECTION_MESSAGE } from "@/lib/whatsapp/security";
import { resolveUser, UNKNOWN_USER_MESSAGE, normalizePhone } from "@/lib/whatsapp/user-resolver";
import { processMessage } from "@/lib/whatsapp/conversation-engine";
import { sendMessage, incrementMessageCounter } from "@/lib/whatsapp/green-api";

// ==========================================
// Types for Green API webhook payload
// ==========================================
interface GreenApiWebhookBody {
  typeWebhook: string;
  instanceData: {
    idInstance: number;
    wid: string;
    typeInstance: string;
  };
  timestamp: number;
  idMessage: string;
  senderData: {
    chatId: string;
    chatName: string;
    sender: string;
    senderName: string;
  };
  messageData: {
    typeMessage: string;
    textMessageData?: {
      textMessage: string;
    };
    extendedTextMessageData?: {
      text: string;
    };
    imageMessageData?: {
      downloadUrl: string;
      caption: string;
    };
    audioMessageData?: {
      downloadUrl: string;
    };
    documentMessageData?: {
      downloadUrl: string;
      fileName: string;
    };
  };
}

// ==========================================
// POST — Receive incoming webhook
// ==========================================
export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as GreenApiWebhookBody;

    // 1. Only process incoming messages
    if (body.typeWebhook !== "incomingMessageReceived") {
      // Acknowledge non-message webhooks (status updates, etc.)
      return NextResponse.json({ status: "ok", type: body.typeWebhook });
    }

    // 2. Validate webhook signature
    if (!validateWebhookSignature(body as unknown as Record<string, unknown>)) {
      console.warn("[Webhook] Invalid webhook signature");
      return NextResponse.json({ error: "Invalid signature" }, { status: 403 });
    }

    // 3. Extract message data
    const senderPhone = extractPhoneFromChatId(body.senderData.chatId);
    const { text, messageType } = extractMessageContent(body.messageData);
    const normalizedPhone = normalizePhone(senderPhone);

    if (!text) {
      // Unsupported message type
      return NextResponse.json({ status: "ok", reason: "unsupported_message_type" });
    }

    // 4. Check if phone is blocked
    if (isBlocked(normalizedPhone)) {
      console.log(`[Webhook] Blocked phone attempted contact: ${normalizedPhone}`);
      return NextResponse.json({ status: "ok", reason: "blocked" });
    }

    // 5. Check rate limiting
    if (isRateLimited(normalizedPhone)) {
      console.warn(`[Webhook] Rate limited: ${normalizedPhone}`);
      await sendMessage(senderPhone, "הגעת למגבלת ההודעות. נסה שוב בעוד דקה.");
      return NextResponse.json({ status: "ok", reason: "rate_limited" });
    }

    // 6. Detect prompt injection attempts (before sanitizing)
    const injectionResult = detectInjection(text);
    if (injectionResult.isInjection) {
      // Log the security event
      logSecurityEvent({
        phone: normalizedPhone,
        severity: injectionResult.severity!,
        category: injectionResult.category!,
        matchedPattern: injectionResult.matchedPattern!,
        originalMessage: text,
      }).catch((err) => console.error("[Webhook] Security log error:", err));

      // Record attempt and check if should be temporarily blocked
      const shouldBlock = recordInjectionAttempt(normalizedPhone);
      if (shouldBlock) {
        // Notify admin about temporary block
        notifyAdminOfBlock(
          normalizedPhone,
          `ניסיונות הזרקה חוזרים (${injectionResult.category})`
        ).catch((err) => console.error("[Webhook] Admin notify error:", err));
      }

      // Send rejection message
      await sendMessage(senderPhone, INJECTION_REJECTION_MESSAGE);
      return NextResponse.json({ status: "ok", reason: "injection_blocked" });
    }

    // 7. Sanitize message
    const sanitizedText = sanitizeMessage(text);
    if (!sanitizedText) {
      return NextResponse.json({ status: "ok", reason: "empty_after_sanitize" });
    }

    // 8. Resolve user
    const user = await resolveUser(normalizedPhone);

    if (!user) {
      // Unknown user — respond and log
      await sendMessage(senderPhone, UNKNOWN_USER_MESSAGE);
      await logInteraction({
        phone: normalizedPhone,
        userType: "unknown",
        direction: "inbound",
        message: sanitizedText,
      });
      await logInteraction({
        phone: normalizedPhone,
        userType: "unknown",
        direction: "outbound",
        message: UNKNOWN_USER_MESSAGE,
      });
      return NextResponse.json({ status: "ok", userType: "unknown" });
    }

    // 9. Log incoming message
    await logInteraction({
      phone: normalizedPhone,
      userType: user.type,
      userId: user.id,
      direction: "inbound",
      message: sanitizedText,
    });

    incrementMessageCounter();

    // 10. Process message through AI engine
    const { response, toolUsed } = await processMessage(
      user,
      sanitizedText,
      messageType
    );

    // 11. Send response back
    await sendMessage(senderPhone, response);
    incrementMessageCounter();

    // 12. Log outgoing message
    await logInteraction({
      phone: normalizedPhone,
      userType: user.type,
      userId: user.id,
      direction: "outbound",
      message: response,
      toolUsed,
    });

    return NextResponse.json({
      status: "ok",
      userType: user.type,
      toolUsed: toolUsed || null,
    });
  } catch (error) {
    console.error("[Webhook] Error processing message:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// ==========================================
// Helper Functions
// ==========================================

/**
 * Extract phone number from Green API chatId format
 * chatId format: "972521234567@c.us" or "972521234567@g.us" (group)
 */
function extractPhoneFromChatId(chatId: string): string {
  // Ignore group messages
  if (chatId.endsWith("@g.us")) {
    return "";
  }
  return chatId.replace("@c.us", "").replace("@s.whatsapp.net", "");
}

/**
 * Extract text content and message type from webhook payload
 */
function extractMessageContent(messageData: GreenApiWebhookBody["messageData"]): {
  text: string;
  messageType: "text" | "audio" | "image";
} {
  switch (messageData.typeMessage) {
    case "textMessage":
      return {
        text: messageData.textMessageData?.textMessage || "",
        messageType: "text",
      };

    case "extendedTextMessage":
      return {
        text: messageData.extendedTextMessageData?.text || "",
        messageType: "text",
      };

    case "imageMessage":
      return {
        text: messageData.imageMessageData?.caption || "[תמונה ללא כיתוב]",
        messageType: "image",
      };

    case "audioMessage":
      // Note: Audio transcription would need to be handled separately
      // For now, we note it was an audio message
      return {
        text: "[הודעה קולית — תמלול אוטומטי אינו זמין כרגע. אנא שלח הודעת טקסט.]",
        messageType: "audio",
      };

    case "documentMessage":
      return {
        text: `[מסמך: ${messageData.documentMessageData?.fileName || "ללא שם"}]`,
        messageType: "text",
      };

    default:
      return { text: "", messageType: "text" };
  }
}

// ==========================================
// GET — Health check for the webhook
// ==========================================
export async function GET() {
  return NextResponse.json({
    status: "ok",
    service: "whatsapp-webhook",
    timestamp: new Date().toISOString(),
  });
}
