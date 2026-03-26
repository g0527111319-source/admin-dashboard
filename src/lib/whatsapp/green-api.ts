// ==========================================
// Green API Client — WhatsApp Integration
// ==========================================
// Professional wrapper for Green API with retry logic,
// rate limiting, and mock mode when credentials are missing.

const GREEN_API_INSTANCE_ID = process.env.GREEN_API_INSTANCE_ID || "";
const GREEN_API_TOKEN = process.env.GREEN_API_TOKEN || "";
const GREEN_API_BASE = `https://api.green-api.com/waInstance${GREEN_API_INSTANCE_ID}`;

const IS_MOCK_MODE = !GREEN_API_INSTANCE_ID || !GREEN_API_TOKEN;

// ==========================================
// Rate Limiter — max 20 messages per minute
// ==========================================
const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX = 20;
const messageTimes: number[] = [];

function checkRateLimit(): boolean {
  const now = Date.now();
  // Remove timestamps outside the window
  while (messageTimes.length > 0 && messageTimes[0] < now - RATE_LIMIT_WINDOW_MS) {
    messageTimes.shift();
  }
  return messageTimes.length < RATE_LIMIT_MAX;
}

function recordMessage(): void {
  messageTimes.push(Date.now());
}

// ==========================================
// Retry Logic
// ==========================================
const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 2000;

async function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function greenApiRequest<T>(
  method: string,
  endpoint: string,
  body?: Record<string, unknown>
): Promise<T> {
  if (IS_MOCK_MODE) {
    console.log(`[Green API MOCK] ${method} ${endpoint}`, body ? JSON.stringify(body).substring(0, 200) : "");
    return { sent: true, mock: true } as T;
  }

  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      const url = `${GREEN_API_BASE}/${endpoint}`;
      const options: RequestInit = {
        method,
        headers: {
          "Content-Type": "application/json",
        },
      };

      if (body) {
        options.body = JSON.stringify(body);
      }

      const response = await fetch(url, options);

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Green API error ${response.status}: ${errorText}`);
      }

      return (await response.json()) as T;
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      console.error(`[Green API] Attempt ${attempt}/${MAX_RETRIES} failed for ${endpoint}:`, lastError.message);

      if (attempt < MAX_RETRIES) {
        await sleep(RETRY_DELAY_MS * attempt);
      }
    }
  }

  throw lastError || new Error("Green API request failed after retries");
}

// ==========================================
// Phone Number Formatting
// ==========================================
export function formatPhoneForGreenApi(phone: string): string {
  let clean = phone.replace(/[\s\-\(\)\+]/g, "");
  // Israeli number normalization: 05X -> 9725X
  if (clean.startsWith("05")) {
    clean = "972" + clean.slice(1);
  }
  if (clean.startsWith("972")) {
    // already correct
  } else if (clean.startsWith("0")) {
    clean = "972" + clean.slice(1);
  }
  return `${clean}@c.us`;
}

// ==========================================
// Public API Methods
// ==========================================

export interface GreenApiSendResult {
  idMessage?: string;
  sent?: boolean;
  mock?: boolean;
}

/**
 * Send a text message to a WhatsApp number
 */
export async function sendMessage(phone: string, text: string): Promise<GreenApiSendResult> {
  if (!checkRateLimit()) {
    console.warn("[Green API] Rate limit reached (20 msg/min). Queuing...");
    await sleep(RATE_LIMIT_WINDOW_MS - (Date.now() - messageTimes[0]));
  }

  recordMessage();

  const chatId = formatPhoneForGreenApi(phone);

  if (IS_MOCK_MODE) {
    console.log(`[Green API MOCK] sendMessage to ${chatId}: ${text.substring(0, 100)}...`);
    return { sent: true, mock: true };
  }

  return greenApiRequest<GreenApiSendResult>("POST", `sendMessage/${GREEN_API_TOKEN}`, {
    chatId,
    message: text,
  });
}

/**
 * Send an image with optional caption
 */
export async function sendImage(
  phone: string,
  imageUrl: string,
  caption?: string
): Promise<GreenApiSendResult> {
  if (!checkRateLimit()) {
    await sleep(RATE_LIMIT_WINDOW_MS - (Date.now() - messageTimes[0]));
  }

  recordMessage();

  const chatId = formatPhoneForGreenApi(phone);

  if (IS_MOCK_MODE) {
    console.log(`[Green API MOCK] sendImage to ${chatId}: ${imageUrl} caption=${caption?.substring(0, 50)}`);
    return { sent: true, mock: true };
  }

  return greenApiRequest<GreenApiSendResult>("POST", `sendFileByUrl/${GREEN_API_TOKEN}`, {
    chatId,
    urlFile: imageUrl,
    fileName: "image.jpg",
    caption: caption || "",
  });
}

/**
 * Send a document/file
 */
export async function sendDocument(
  phone: string,
  fileUrl: string,
  fileName: string
): Promise<GreenApiSendResult> {
  if (!checkRateLimit()) {
    await sleep(RATE_LIMIT_WINDOW_MS - (Date.now() - messageTimes[0]));
  }

  recordMessage();

  const chatId = formatPhoneForGreenApi(phone);

  if (IS_MOCK_MODE) {
    console.log(`[Green API MOCK] sendDocument to ${chatId}: ${fileName}`);
    return { sent: true, mock: true };
  }

  return greenApiRequest<GreenApiSendResult>("POST", `sendFileByUrl/${GREEN_API_TOKEN}`, {
    chatId,
    urlFile: fileUrl,
    fileName,
  });
}

/**
 * Send buttons as numbered text options (WhatsApp buttons API is deprecated)
 */
export async function sendButtons(
  phone: string,
  text: string,
  buttons: { id: string; text: string }[]
): Promise<GreenApiSendResult> {
  const buttonText = buttons.map((b, i) => `${i + 1}. ${b.text}`).join("\n");
  const fullMessage = `${text}\n\n${buttonText}`;
  return sendMessage(phone, fullMessage);
}

/**
 * Check the Green API instance connection status
 */
export async function getInstanceStatus(): Promise<{
  stateInstance: string;
  isOnline: boolean;
}> {
  if (IS_MOCK_MODE) {
    console.log("[Green API MOCK] getInstanceStatus");
    return { stateInstance: "mock", isOnline: false };
  }

  try {
    const result = await greenApiRequest<{ stateInstance: string }>(
      "GET",
      `getStateInstance/${GREEN_API_TOKEN}`
    );
    return {
      stateInstance: result.stateInstance,
      isOnline: result.stateInstance === "authorized",
    };
  } catch (error) {
    console.error("[Green API] Failed to get instance status:", error);
    return { stateInstance: "error", isOnline: false };
  }
}

/**
 * Get QR code for connecting the instance
 */
export async function getQRCode(): Promise<{ type: string; message: string } | null> {
  if (IS_MOCK_MODE) {
    console.log("[Green API MOCK] getQRCode");
    return null;
  }

  try {
    return await greenApiRequest<{ type: string; message: string }>(
      "GET",
      `qr/${GREEN_API_TOKEN}`
    );
  } catch {
    return null;
  }
}

/**
 * Check if running in mock mode (no API keys)
 */
export function isMockMode(): boolean {
  return IS_MOCK_MODE;
}

// ==========================================
// Message counter for stats
// ==========================================
let messagesProcessed24h = 0;
let lastResetTime = Date.now();

export function incrementMessageCounter(): void {
  const now = Date.now();
  // Reset counter every 24 hours
  if (now - lastResetTime > 24 * 60 * 60 * 1000) {
    messagesProcessed24h = 0;
    lastResetTime = now;
  }
  messagesProcessed24h++;
}

export function getMessagesProcessed24h(): number {
  const now = Date.now();
  if (now - lastResetTime > 24 * 60 * 60 * 1000) {
    messagesProcessed24h = 0;
    lastResetTime = now;
  }
  return messagesProcessed24h;
}
