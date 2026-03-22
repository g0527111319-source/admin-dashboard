/* eslint-disable react-hooks/rules-of-hooks */
// ==========================================
// שירות וואטסאפ — WhatsApp Service via Baileys
// ==========================================

import makeWASocket, {
  DisconnectReason,
  useMultiFileAuthState,
  WASocket,
} from "@whiskeysockets/baileys";
import { EventEmitter } from "events";

let sock: WASocket | null = null;

const SESSION_PATH = process.env.WHATSAPP_SESSION_PATH || "./whatsapp-session";

// ==========================================
// Connection State Management
// ==========================================

export type WhatsAppConnectionState = "disconnected" | "connecting" | "qr_ready" | "connected";

let connectionState: WhatsAppConnectionState = "disconnected";
let currentQR: string | null = null;

export const whatsappEvents = new EventEmitter();

/** Get current connection state */
export function getConnectionState(): WhatsAppConnectionState {
  return connectionState;
}

/** Get current QR code (null if not in qr_ready state) */
export function getQRCode(): string | null {
  return currentQR;
}

/** פורמט מספר טלפון לפורמט WhatsApp */
function formatPhone(phone: string): string {
  // 0521234567 -> 972521234567@s.whatsapp.net
  let clean = phone.replace(/[\s\-\(\)]/g, "");
  if (clean.startsWith("0")) {
    clean = "972" + clean.slice(1);
  }
  if (!clean.includes("@")) {
    clean += "@s.whatsapp.net";
  }
  return clean;
}

/** התחברות ל-WhatsApp */
export async function connectWhatsApp(): Promise<WASocket> {
  if (sock && connectionState === "connected") return sock;

  connectionState = "connecting";
  currentQR = null;
  whatsappEvents.emit("state_change", connectionState);

  const { state, saveCreds } = await useMultiFileAuthState(SESSION_PATH);

  sock = makeWASocket({
    auth: state,
    printQRInTerminal: true,
  });

  sock.ev.on("creds.update", saveCreds);

  sock.ev.on("connection.update", (update) => {
    const { connection, lastDisconnect, qr } = update;

    // QR code received — emit it
    if (qr) {
      currentQR = qr;
      connectionState = "qr_ready";
      whatsappEvents.emit("qr", qr);
      whatsappEvents.emit("state_change", connectionState);
    }

    if (connection === "close") {
      currentQR = null;
      const shouldReconnect =
        (lastDisconnect?.error as { output?: { statusCode?: number } })?.output
          ?.statusCode !== DisconnectReason.loggedOut;

      if (shouldReconnect) {
        console.log("WhatsApp reconnecting...");
        connectionState = "connecting";
        whatsappEvents.emit("state_change", connectionState);
        sock = null;
        connectWhatsApp();
      } else {
        console.log("WhatsApp logged out");
        connectionState = "disconnected";
        whatsappEvents.emit("state_change", connectionState);
        sock = null;
      }
    }

    if (connection === "open") {
      console.log("WhatsApp connected successfully!");
      currentQR = null;
      connectionState = "connected";
      whatsappEvents.emit("state_change", connectionState);
    }
  });

  return sock;
}

/** ניתוק WhatsApp */
export async function disconnectWhatsApp(): Promise<void> {
  if (sock) {
    await sock.logout();
    sock = null;
  }
  connectionState = "disconnected";
  currentQR = null;
  whatsappEvents.emit("state_change", connectionState);
}

/** שליחת הודעת טקסט */
export async function sendMessage(phone: string, text: string): Promise<void> {
  const socket = await connectWhatsApp();
  const jid = formatPhone(phone);

  // השהיה אקראית למניעת חסימה (3-8 שניות)
  const delay = 3000 + Math.random() * 5000;
  await new Promise((resolve) => setTimeout(resolve, delay));

  await socket.sendMessage(jid, { text });
  console.log(`[WhatsApp] Sent to ${phone}: ${text.substring(0, 50)}...`);
}

/** שליחת הודעה עם תמונה */
export async function sendImage(
  phone: string,
  imageUrl: string,
  caption: string
): Promise<void> {
  const socket = await connectWhatsApp();
  const jid = formatPhone(phone);

  const delay = 3000 + Math.random() * 5000;
  await new Promise((resolve) => setTimeout(resolve, delay));

  await socket.sendMessage(jid, {
    image: { url: imageUrl },
    caption,
  });
}

/** שליחת הודעה עם כפתורים (כטקסט — buttons API הוסר בגרסאות חדשות של Baileys) */
export async function sendButtons(
  phone: string,
  text: string,
  buttons: { buttonId: string; buttonText: { displayText: string } }[]
): Promise<void> {
  const socket = await connectWhatsApp();
  const jid = formatPhone(phone);

  const delay = 3000 + Math.random() * 5000;
  await new Promise((resolve) => setTimeout(resolve, delay));

  // Buttons API no longer supported in newer Baileys — send as text with options
  const buttonText = buttons
    .map((b, i) => `${i + 1}. ${b.buttonText.displayText}`)
    .join("\n");
  await socket.sendMessage(jid, {
    text: `${text}\n\n${buttonText}`,
  });
}

// ==========================================
// תבניות הודעות — Message Templates
// ==========================================

export const templates = {
  /** הודעת אישור פרסום לתמר */
  postApprovalRequest: (supplierName: string) =>
    `🏛️ *זירת האדריכלות*\n\nספק *${supplierName}* שלח פרסום לאישור.\nלחצי לאישור או דחייה בדשבורד הניהול.`,

  /** הודעת אישור פרסום לספק */
  postApproved: (time: string) =>
    `✅ הפרסום שלך אושר ויפורסם ב-${time}.\nתודה! 🏛️`,

  /** הודעת דחיית פרסום לספק */
  postRejected: (reason: string) =>
    `❌ הפרסום שלך נדחה.\nסיבה: ${reason}\n\nניתן לשלוח פרסום מתוקן מהדשבורד שלך. 🏛️`,

  /** תזכורת פרסום לספק */
  postReminder: (days: number) =>
    `👋 שלום! עברו ${days} ימים מאז הפרסום האחרון שלך בזירת האדריכלות.\n\nהמעצבות ממתינות לתוכן חדש! 📸\nשלח פרסום מהדשבורד שלך.`,

  /** דיווח עסקה לאישור ספק */
  dealConfirmation: (designerName: string, amount: number) =>
    `🏛️ *זירת האדריכלות*\n\nמעצבת *${designerName}* מדווחת על עסקה בסך *₪${amount.toLocaleString()}*.\n\nהאם לאשר?\n✅ אשר\n❌ דחה`,

  /** הודעת זכייה בהגרלה */
  lotteryWinner: (prize: string) =>
    `🎉 *מזל טוב!*\n\nזכית בהגרלה החודשית של זירת האדריכלות!\n🏆 הפרס: *${prize}*\n\nנציגת הקהילה תיצור איתך קשר בקרוב.`,

  /** תזכורת אירוע */
  eventReminder: (eventName: string, date: string) =>
    `📅 *תזכורת אירוע*\n\n*${eventName}* מתקיים ב-${date}.\nנתראה שם! 🏛️`,
};

/** סטטוס חיבור (legacy — use getConnectionState() instead) */
export function getConnectionStatus(): string {
  if (!sock) return "disconnected";
  return "connected";
}
