// ==========================================
// Conversation Engine — Claude AI for WhatsApp
// ==========================================
// The brain of the WhatsApp bot. Processes messages
// through Claude AI with role-based system prompts,
// conversation history, and tool calling.

import prisma from "@/lib/prisma";
import type { WhatsAppUser } from "./user-resolver";
import { executeTool, getAnthropicTools } from "./tools";

// ==========================================
// Configuration
// ==========================================
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY || "";
const IS_MOCK_AI = !ANTHROPIC_API_KEY;
const ANTHROPIC_API_URL = "https://api.anthropic.com/v1/messages";
const MODEL = "claude-sonnet-4-20250514";
const MAX_TOKENS = 1024;
const MAX_HISTORY_MESSAGES = 10;

// ==========================================
// Admin Bot Settings (cached from DB)
// ==========================================
interface AdminBotSettings {
  generalInstructions: string;
  roleInstructions: {
    designer: string;
    supplier: string;
    admin: string;
  };
  preparedResponses: Array<{
    id: string;
    trigger: string;
    response: string;
  }>;
  blockedWords: string;
  general: {
    botActive: boolean;
    maxMessagesPerDay: number;
    responseLanguage: string;
    botName: string;
  };
}

let cachedBotSettings: AdminBotSettings | null = null;
let settingsCacheTime = 0;
const SETTINGS_CACHE_TTL = 60_000; // 1 minute cache

/**
 * Fetch admin bot settings from DB with caching.
 */
async function getAdminBotSettings(): Promise<AdminBotSettings | null> {
  const now = Date.now();
  if (cachedBotSettings && now - settingsCacheTime < SETTINGS_CACHE_TTL) {
    return cachedBotSettings;
  }

  try {
    const setting = await prisma.systemSetting.findUnique({
      where: { key: "whatsapp_bot_config" },
    });

    if (setting) {
      cachedBotSettings = setting.value as unknown as AdminBotSettings;
      settingsCacheTime = now;
      return cachedBotSettings;
    }
  } catch (error) {
    console.error("[ConversationEngine] Failed to load bot settings:", error);
  }

  return null;
}

/**
 * Check if message contains blocked words.
 */
function containsBlockedWords(
  message: string,
  blockedWords: string
): boolean {
  if (!blockedWords.trim()) return false;
  const words = blockedWords
    .split(",")
    .map((w) => w.trim().toLowerCase())
    .filter(Boolean);
  const lowerMsg = message.toLowerCase();
  return words.some((word) => lowerMsg.includes(word));
}

/**
 * Check if message matches a prepared response trigger.
 * Returns the response text if matched, null otherwise.
 */
function matchPreparedResponse(
  message: string,
  preparedResponses: AdminBotSettings["preparedResponses"]
): string | null {
  if (!preparedResponses || preparedResponses.length === 0) return null;
  const lowerMsg = message.toLowerCase().trim();
  for (const pair of preparedResponses) {
    if (!pair.trigger.trim()) continue;
    if (lowerMsg.includes(pair.trigger.toLowerCase().trim())) {
      return pair.response;
    }
  }
  return null;
}

// ==========================================
// Conversation History (in-memory + DB)
// ==========================================
interface ConversationMessage {
  role: "user" | "assistant";
  content: string;
}

const conversationHistory = new Map<string, ConversationMessage[]>();

/**
 * Get conversation history for a phone number.
 * Loads from DB if not in memory.
 */
async function getHistory(phone: string): Promise<ConversationMessage[]> {
  if (conversationHistory.has(phone)) {
    return conversationHistory.get(phone)!;
  }

  // Try loading from DB
  try {
    const conversation = await prisma.whatsAppConversation.findUnique({
      where: { phone },
    });

    if (conversation && conversation.messages) {
      const messages = conversation.messages as ConversationMessage[];
      conversationHistory.set(phone, messages);
      return messages;
    }
  } catch (error) {
    console.error("[ConversationEngine] Failed to load history from DB:", error);
  }

  const empty: ConversationMessage[] = [];
  conversationHistory.set(phone, empty);
  return empty;
}

/**
 * Save conversation history to memory and DB.
 */
async function saveHistory(
  phone: string,
  userType: string,
  userId: string | undefined,
  messages: ConversationMessage[]
): Promise<void> {
  // Keep only last N messages
  const trimmed = messages.slice(-MAX_HISTORY_MESSAGES);
  conversationHistory.set(phone, trimmed);

  // Persist to DB
  try {
    await prisma.whatsAppConversation.upsert({
      where: { phone },
      update: {
        messages: trimmed as unknown as Record<string, unknown>[],
        userType,
        userId: userId || null,
        updatedAt: new Date(),
      },
      create: {
        phone,
        userType,
        userId: userId || null,
        messages: trimmed as unknown as Record<string, unknown>[],
      },
    });
  } catch (error) {
    console.error("[ConversationEngine] Failed to save history to DB:", error);
  }
}

// ==========================================
// System Prompts (role-based)
// ==========================================

function getSystemPrompt(
  user: WhatsAppUser,
  adminSettings?: AdminBotSettings | null
): string {
  // Build the base prompt per role
  let basePrompt: string;
  switch (user.type) {
    case "designer":
      basePrompt = `את עוזרת דיגיטלית של זירת האדריכלות. את מדברת עם ${user.name}, מעצבת פנים.
את יכולה לעזור ב:
- שאלות על השימוש באתר ובאזור האישי
- דיווח על עסקה חדשה (שם ספק, סכום, תיאור) — השתמשי בכלי report_deal
- דירוג ספק (שם ספק, ציון 1-5, תגובה) — השתמשי בכלי rate_supplier
- אישור הגעה לאירוע — השתמשי בכלי confirm_event_attendance
- בירור סטטוס עסקאות — השתמשי בכלי get_my_deals
- מידע על ספקי הקהילה — השתמשי בכלי get_community_suppliers

כללים חשובים:
- אסור לך לחשוף מידע על מעצבות אחרות, ספקים אחרים, או דירוגים של ספקים
- ענה תמיד בעברית, בצורה חמה ומקצועית
- כשמדווחים על עסקה, וודא שיש שם ספק וסכום
- אם המשתמש שואל משהו שאינך יודעת, הפנה למנהלת הקהילה
- הודעות קצרות ותמציתיות — זה וואטסאפ, לא מייל`;
      break;

    case "supplier":
      basePrompt = `את עוזרת דיגיטלית של זירת האדריכלות. את מדברת עם ${user.name}, ספק בקהילה.
את יכולה לעזור ב:
- אישור/דחייה של עסקה שדווחה — השתמשי בכלי confirm_deal
- תיאום פרסום (בדיקת לוגו, קרדיט למעצבת, לוגו קהילה) — השתמשי בכלי check_post_requirements
- צפייה בעסקאות שלו — השתמשי בכלי get_my_deals
- עדכון פרטי קשר — הפנה לאתר

כללים חשובים:
- אסור לך לחשוף מידע על ספקים אחרים, מעצבות (חוץ משמות בעסקאות), או דירוגים
- ענה תמיד בעברית, בצורה מקצועית ואדיבה
- הודעות קצרות ותמציתיות`;
      break;

    case "admin":
      basePrompt = `את עוזרת דיגיטלית של זירת האדריכלות. את מדברת עם מנהלת הקהילה.
יש לך גישה מלאה לכל המידע:
- כל המעצבות, ספקים, עסקאות, דירוגים, אירועים
- ביצוע פקודות: יצירת אירוע — admin_create_event
- שליחת הודעה לכולם — admin_broadcast
- סטטיסטיקות — admin_get_stats
- חיפוש מידע — admin_get_all_info
- צפייה בעסקאות — get_my_deals (מראה הכל עבור אדמין)

ענה בצורה מקצועית ותמציתית. את יכולה לבצע כל פעולה שמנהלת הקהילה מבקשת.`;
      break;

    default:
      basePrompt = "את עוזרת דיגיטלית של זירת האדריכלות. ענה בעברית.";
  }

  // Prepend admin-configured instructions if available
  if (adminSettings) {
    const parts: string[] = [];

    // General instructions from admin
    if (adminSettings.generalInstructions?.trim()) {
      parts.push(`הנחיות כלליות:\n${adminSettings.generalInstructions.trim()}`);
    }

    // Role-specific instructions from admin
    const roleKey = user.type as keyof AdminBotSettings["roleInstructions"];
    const roleInstructions = adminSettings.roleInstructions?.[roleKey];
    if (roleInstructions?.trim()) {
      parts.push(`הנחיות נוספות לתפקיד:\n${roleInstructions.trim()}`);
    }

    if (parts.length > 0) {
      return parts.join("\n\n") + "\n\n---\n\n" + basePrompt;
    }
  }

  return basePrompt;
}

// ==========================================
// Claude API Call
// ==========================================

interface AnthropicMessage {
  role: "user" | "assistant";
  content: string | AnthropicContentBlock[];
}

interface AnthropicContentBlock {
  type: "text" | "tool_use" | "tool_result";
  text?: string;
  id?: string;
  name?: string;
  input?: Record<string, unknown>;
  tool_use_id?: string;
  content?: string;
}

interface AnthropicResponse {
  id: string;
  content: AnthropicContentBlock[];
  stop_reason: "end_turn" | "tool_use" | "max_tokens";
  usage: { input_tokens: number; output_tokens: number };
}

async function callClaude(
  systemPrompt: string,
  messages: AnthropicMessage[],
  tools: ReturnType<typeof getAnthropicTools>
): Promise<AnthropicResponse> {
  const response = await fetch(ANTHROPIC_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": ANTHROPIC_API_KEY,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: MAX_TOKENS,
      system: systemPrompt,
      messages,
      tools: tools.length > 0 ? tools : undefined,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Anthropic API error ${response.status}: ${errorText}`);
  }

  return (await response.json()) as AnthropicResponse;
}

// ==========================================
// Mock AI Response
// ==========================================
function getMockResponse(user: WhatsAppUser, message: string): string {
  const lowerMsg = message.toLowerCase();

  if (lowerMsg.includes("עסקה") || lowerMsg.includes("דיווח")) {
    return `[מצב מדומה] קיבלתי את הבקשה לדיווח עסקה, ${user.name}. במצב ייצור, Claude AI יעבד את הבקשה ויבצע את הפעולה.`;
  }
  if (lowerMsg.includes("דירוג") || lowerMsg.includes("ציון")) {
    return `[מצב מדומה] קיבלתי את הבקשה לדירוג ספק, ${user.name}. במצב ייצור, הדירוג יישמר.`;
  }
  if (lowerMsg.includes("אירוע")) {
    return `[מצב מדומה] קיבלתי את הבקשה בנושא אירוע, ${user.name}.`;
  }
  if (lowerMsg.includes("שלום") || lowerMsg.includes("היי")) {
    return `שלום ${user.name}! 👋\nאני העוזרת הדיגיטלית של זירת האדריכלות.\n[מצב מדומה — ANTHROPIC_API_KEY לא מוגדר]`;
  }

  return `שלום ${user.name}, קיבלתי את ההודעה שלך.\n[מצב מדומה — הגדירי ANTHROPIC_API_KEY להפעלה מלאה]`;
}

// ==========================================
// Main Processing Function
// ==========================================

/**
 * Process an incoming WhatsApp message through Claude AI.
 * Returns the response text to send back.
 */
export async function processMessage(
  user: WhatsAppUser,
  message: string,
  messageType: "text" | "audio" | "image" = "text"
): Promise<{ response: string; toolUsed?: string }> {
  // Fetch admin bot settings
  const adminSettings = await getAdminBotSettings();

  // Check if bot is disabled by admin
  if (adminSettings?.general?.botActive === false) {
    return { response: "" }; // Silent — bot is disabled
  }

  // Check for blocked words
  if (adminSettings && containsBlockedWords(message, adminSettings.blockedWords)) {
    console.log(`[ConversationEngine] Blocked word detected from ${user.phone}`);
    return { response: "לא ניתן לענות על שאלה זו" };
  }

  // Check for prepared responses (exact match overrides AI)
  if (adminSettings) {
    const preparedResponse = matchPreparedResponse(
      message,
      adminSettings.preparedResponses
    );
    if (preparedResponse) {
      console.log(`[ConversationEngine] Prepared response matched for ${user.phone}`);
      return { response: preparedResponse };
    }
  }

  // Mock mode
  if (IS_MOCK_AI) {
    console.log(`[ConversationEngine MOCK] Processing message from ${user.name} (${user.type}): ${message.substring(0, 50)}`);
    const response = getMockResponse(user, message);
    return { response };
  }

  try {
    // Get conversation history
    const history = await getHistory(user.phone);

    // Build system prompt with admin customizations
    const systemPrompt = getSystemPrompt(user, adminSettings);

    // Get available tools for this user's role
    const tools = getAnthropicTools(user.type);

    // Build message content based on type
    let userContent = message;
    if (messageType === "audio") {
      userContent = `[הודעה קולית — תמלול]: ${message}`;
    } else if (messageType === "image") {
      userContent = `[תמונה נשלחה]: ${message}`;
    }

    // Build messages array for Claude
    const apiMessages: AnthropicMessage[] = [
      ...history.map((m) => ({
        role: m.role as "user" | "assistant",
        content: m.content,
      })),
      { role: "user" as const, content: userContent },
    ];

    // Call Claude
    let claudeResponse = await callClaude(systemPrompt, apiMessages, tools);
    let toolUsed: string | undefined;

    // Handle tool calls (up to 3 iterations)
    let iterations = 0;
    while (claudeResponse.stop_reason === "tool_use" && iterations < 3) {
      iterations++;

      const toolUseBlocks = claudeResponse.content.filter(
        (b) => b.type === "tool_use"
      );

      if (toolUseBlocks.length === 0) break;

      // Execute each tool call
      const toolResults: AnthropicContentBlock[] = [];
      for (const toolBlock of toolUseBlocks) {
        const toolName = toolBlock.name!;
        const toolInput = toolBlock.input || {};

        console.log(`[ConversationEngine] Tool call: ${toolName}`, toolInput);

        const result = await executeTool(toolName, toolInput, user);
        toolUsed = toolName;

        toolResults.push({
          type: "tool_result",
          tool_use_id: toolBlock.id!,
          content: JSON.stringify(result),
        });
      }

      // Send tool results back to Claude
      apiMessages.push({
        role: "assistant",
        content: claudeResponse.content,
      });
      apiMessages.push({
        role: "user",
        content: toolResults,
      });

      claudeResponse = await callClaude(systemPrompt, apiMessages, tools);
    }

    // Extract final text response
    const textBlocks = claudeResponse.content.filter((b) => b.type === "text");
    const responseText =
      textBlocks.map((b) => b.text).join("\n") ||
      "לא הצלחתי לעבד את ההודעה. נסה שוב.";

    // Update conversation history
    history.push({ role: "user", content: userContent });
    history.push({ role: "assistant", content: responseText });
    await saveHistory(user.phone, user.type, user.id, history);

    return { response: responseText, toolUsed };
  } catch (error) {
    console.error("[ConversationEngine] Error processing message:", error);

    // Return a user-friendly error message
    return {
      response: "מצטערת, נתקלתי בשגיאה בעיבוד ההודעה. נסה שוב בעוד רגע.",
    };
  }
}

// ==========================================
// Active Conversations Count
// ==========================================
export function getActiveConversationsCount(): number {
  return conversationHistory.size;
}

/**
 * Clear conversation history for a specific phone
 */
export async function clearConversation(phone: string): Promise<void> {
  conversationHistory.delete(phone);
  try {
    await prisma.whatsAppConversation.delete({ where: { phone } });
  } catch {
    // Conversation might not exist in DB
  }
}
