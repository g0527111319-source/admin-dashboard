"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { MessageCircle, X, Send, Sparkles, Copy, Check, ChevronDown, Trash2, Bot, BarChart3, Users, Trophy } from "lucide-react";

// ==========================================
// Types
// ==========================================

type ChatMessage = {
  id: string;
  text: string;
  sender: "bot" | "user";
  timestamp: Date;
  isTyping?: boolean;
  relatedTopics?: string[];
};

type QAPair = {
  keywords: string[];
  synonyms?: string[];
  answer: string;
  relatedTopics?: string[];
};

// ==========================================
// Admin Knowledge Base
// ==========================================

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

const adminQA: QAPair[] = [
  {
    keywords: ["כמה", "מעצבות", "רשומות", "סהכ"],
    synonyms: ["מספר מעצבות", "כמה יש", "מעצבות בקהילה"],
    answer: "כרגע יש 68 מעצבות רשומות בקהילה 🎨\nמתוכן 52 פעילות (ביצעו עסקה ב-3 חודשים אחרונים), 12 בפעילות בינונית ו-4 לא פעילות.",
    relatedTopics: ["מי הכי פעילה?", "מעצבות לא פעילות"],
  },
  {
    keywords: ["כמה", "ספקים", "רשומים"],
    synonyms: ["מספר ספקים", "כמה ספקים יש"],
    answer: "יש 48 ספקים רשומים בפלטפורמה 🏪\n44 פעילים, 3 מושעים ו-1 בהמתנה לאימות.\nהכנסה חודשית מדמי מנוי: ₪24,500",
    relatedTopics: ["ספקים באיחור", "ספקים מובילים"],
  },
  {
    keywords: ["מי", "פעילה", "הכי", "מובילה"],
    synonyms: ["מעצבת מובילה", "הכי טובה", "טופ"],
    answer: "🏆 TOP 3 מעצבות החודש:\n\n🥇 מיכל לוינשטיין — 24 עסקאות, ₪210,000\n🥈 רותם דיין — 15 עסקאות, ₪125,000\n🥉 נועה כהנוביץ׳ — 12 עסקאות, ₪85,000\n\nמיכל גם הכי פעילה בפרסומים עם 8 פוסטים החודש!",
    relatedTopics: ["ספקים מובילים", "כמה עסקאות השבוע?"],
  },
  {
    keywords: ["עסקאות", "השבוע", "החודש", "כמה עסקאות"],
    synonyms: ["דילים", "סגירות", "עסקאות חדשות"],
    answer: "📊 סטטיסטיקת עסקאות:\n\nהשבוע: 7 עסקאות חדשות (₪48,200)\nהחודש: 28 עסקאות (₪178,000)\nממוצע יומי: 1.3 עסקאות\n\nזה החודש הכי טוב השנה! 🚀",
    relatedTopics: ["מי הכי פעילה?", "ספקים מובילים"],
  },
  {
    keywords: ["ספקים", "לא פעילים", "בעייתיים", "מושעים"],
    synonyms: ["ספק לא פעיל", "מושעה", "בעיה עם ספק"],
    answer: "⚠️ ספקים שדורשים תשומת לב:\n\n🔴 אקווה בריכות — מושעה (תלונות חוזרות)\n🟡 אור תאורה — איחור תשלום 45 יום, ₪1,350 חוב\n🟡 צבע ועוד — ספקית חדשה, לא מאומתת\n🟡 סנטק פרו — לא פרסם החודש\n\nממליצה לשלוח תזכורות דרך WhatsApp.",
    relatedTopics: ["ספקים באיחור", "כמה ספקים?"],
  },
  {
    keywords: ["באיחור", "תשלום", "חוב", "גבייה"],
    synonyms: ["לא שילמו", "חובות", "איחור תשלום"],
    answer: "💰 מצב גבייה:\n\n3 ספקים באיחור תשלום:\n• אור תאורה — ₪1,350 (45 יום)\n• גלאם דקור — ₪900 (22 יום)\n• פלוריקס — ₪550 (8 יום)\n\nסה״כ חוב: ₪2,800\nשיעור גבייה כללי: 92% ✅",
    relatedTopics: ["כמה ספקים?", "הכנסות"],
  },
  {
    keywords: ["הגרלה", "הגרלות", "פרס", "זוכה"],
    synonyms: ["לוטו", "הגרלה חודשית", "פרסים"],
    answer: "🎰 הגרלות:\n\nהגרלה הבאה: מרץ 2026 — שובר הום סנטר ₪1,000\n34 מעצבות זכאיות | 3 זוכות\n\nזוכה אחרונה: מיכל לוינשטיין (פבר׳)\nסה״כ פרסים השנה: ₪9,800",
    relatedTopics: ["מי הכי פעילה?", "אירועים"],
  },
  {
    keywords: ["אירוע", "אירועים", "סדנה", "מפגש"],
    synonyms: ["אירוע הבא", "סדנאות", "נטוורקינג"],
    answer: "📅 אירועים קרובים:\n\n🔜 15.03 — סדנת חומרים חדשים (28/40 נרשמו)\n🔜 22.03 — מפגש נטוורקינג (42/60 נרשמו)\n\nממוצע נוכחות: 85%\nשביעות רצון ממוצעת: 4.6/5 ⭐",
    relatedTopics: ["כמה מעצבות?", "הגרלות"],
  },
  {
    keywords: ["דירוג", "דירוגים", "ביקורות", "כוכבים"],
    synonyms: ["ציון", "ציונים", "rating"],
    answer: "⭐ סטטיסטיקת דירוגים:\n\nממוצע כללי: 4.1/5\nסה״כ דירוגים: 58\n\n⭐5: 28 (48%)\n⭐4: 18 (31%)\n⭐3: 8 (14%)\n⭐2: 3 (5%)\n⭐1: 1 (2%)\n\n85% מהספקים מעל 3.5 כוכבים.",
    relatedTopics: ["ספקים מובילים", "ספקים לא פעילים"],
  },
  {
    keywords: ["פרסום", "פרסומים", "פוסטים", "תוכן"],
    synonyms: ["פוסט", "כתבה", "מאמר"],
    answer: "📝 מצב פרסומים:\n\nהחודש: 46 פרסומים חדשים\nממתינים לאישור: 5\nאחוז אישור: 89%\n\nספקים הכי פעילים בפרסום:\n1. קיטשן פלוס (4 החודש)\n2. סטון דיזיין (3 החודש)\n3. דלת הזהב (3 החודש)",
    relatedTopics: ["כמה ספקים?", "עסקאות החודש"],
  },
  {
    keywords: ["הכנסות", "רווח", "כסף", "תקציב"],
    synonyms: ["הכנסה", "revenue", "מחזור"],
    answer: "💵 סיכום פיננסי:\n\nהכנסות חודשיות (דמי מנוי): ₪24,500\nהכנסות מאירועים (חודשי): ₪3,360\nסה״כ עסקאות בקהילה: ₪178,000\n\nהכנסה שנתית (צפי): ₪334,300\nשיעור גבייה: 92%",
    relatedTopics: ["באיחור תשלום", "עסקאות החודש"],
  },
  {
    keywords: ["בריאות", "מצב", "סטטוס", "ציון בריאות"],
    synonyms: ["health", "סקירה", "מצב הקהילה"],
    answer: "💚 ציון בריאות הקהילה: 82/100\n\n✅ מעצבות פעילות: 76% (טוב)\n✅ ספקים מאומתים: 50% (צריך שיפור)\n✅ עסקאות חודשיות: 28 (הכי גבוה!)\n⚠️ ספקים לא פעילים: 3\n⚠️ תשלומים באיחור: 3\n\nהמגמה חיובית — עלייה של 12% מהחודש שעבר!",
    relatedTopics: ["כמה מעצבות?", "כמה ספקים?"],
  },
  {
    keywords: ["אוטומציות", "אוטומציה", "כללים"],
    synonyms: ["אוטומטי", "חוקים", "rules"],
    answer: "⚡ אוטומציות פעילות:\n\n4 כללים מוגדרים, 3 פעילים:\n1. ✅ עסקה מעל ₪10K → WhatsApp (הופעלה 12 פעמים)\n2. ✅ מעצבת חדשה → מייל ברוכה הבאה (38 פעמים)\n3. ✅ דירוג מתחת ל-3 → התראה (5 פעמים)\n4. ⏸️ תזכורת חידוש מנוי (מושבת)",
    relatedTopics: ["מצב הקהילה", "ספקים לא פעילים"],
  },
  {
    keywords: ["משימות", "לוח", "מטלות", "todo"],
    synonyms: ["מה צריך לעשות", "משימה", "task"],
    answer: "📋 משימות פתוחות:\n\n🔴 דחוף:\n• אשר 5 פרסומים חדשים\n• צור דוח חודשי מרץ\n\n🟡 רגיל:\n• בדוק תשלום — אור תאורה\n• תכנן אירוע הבא\n• הכן הגרלה חודשית\n\nסה״כ: 4 ממתינות, 3 בתהליך, 3 הושלמו",
    relatedTopics: ["מצב הקהילה", "פרסומים"],
  },
  {
    keywords: ["מפה", "אזור", "גיאוגרפי", "איפה"],
    synonyms: ["פיזור", "מיקום", "ערים"],
    answer: "🗺️ פיזור גיאוגרפי:\n\nמרכז + ת״א: 38% (26 מעצבות)\nשרון: 18% (12)\nירושלים: 12% (8)\nצפון + חיפה: 15% (10)\nשפלה: 10% (7)\nדרום: 7% (5)\n\nהאזור הפעיל ביותר: תל אביב-מרכז",
    relatedTopics: ["כמה מעצבות?", "ספקים מובילים"],
  },
];

// Quick query chips
const quickQueries = [
  "מי הכי פעילה?",
  "כמה עסקאות השבוע?",
  "ספקים לא פעילים?",
  "מצב הקהילה",
  "משימות פתוחות",
];

// ==========================================
// Matching
// ==========================================

function findAnswer(input: string): { answer: string; relatedTopics?: string[] } | null {
  const lower = input.toLowerCase().trim();

  // Greeting patterns
  if (/^(היי|הי|שלום|בוקר|ערב|צהריים|אהלן|מה קורה|מה נשמע)/.test(lower)) {
    return {
      answer: pick([
        "היי תמר! 👋 מה אני יכול לעזור לך היום?",
        "שלום תמר! 💛 איך אפשר לעזור?",
        "אהלן תמר! מוכן לכל שאלה על הקהילה 🚀",
      ]),
      relatedTopics: ["מצב הקהילה", "משימות פתוחות", "עסקאות החודש"],
    };
  }

  // Thanks patterns
  if (/^(תודה|תנקס|מעולה|אחלה|סבבה|מושלם)/.test(lower)) {
    return {
      answer: pick([
        "בכיף! 💛 תמיד פה בשבילך.",
        "שמח לעזור! אם יש עוד שאלות — אני כאן 😊",
        "בשמחה תמר! 🌟",
      ]),
    };
  }

  // Score-based matching
  let bestMatch: QAPair | null = null;
  let bestScore = 0;

  for (const qa of adminQA) {
    let score = 0;
    for (const kw of qa.keywords) {
      if (lower.includes(kw)) score += 2;
    }
    if (qa.synonyms) {
      for (const syn of qa.synonyms) {
        if (lower.includes(syn)) score += 3;
      }
    }
    if (score > bestScore) {
      bestScore = score;
      bestMatch = qa;
    }
  }

  if (bestMatch && bestScore >= 2) {
    return { answer: bestMatch.answer, relatedTopics: bestMatch.relatedTopics };
  }

  return null;
}

function getNoMatchMessage(): string {
  return pick([
    "לא בטוח שהבנתי 🤔 נסי לשאול על: מעצבות, ספקים, עסקאות, אירועים, הגרלות, או מצב הקהילה.",
    "הממ, לא מצאתי תשובה מתאימה. נסי לנסח אחרת או בחרי מהשאלות המהירות למטה 👇",
    "לא הצלחתי למצוא מידע על זה. אפשר לשאול אותי על כל מה שקשור לניהול הקהילה! 💡",
  ]);
}

// ==========================================
// Component
// ==========================================

export default function AdminChatBot() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "welcome",
      text: "היי תמר! 👋 אני הבוט של לוח הבקרה.\nאפשר לשאול אותי כל שאלה על הקהילה — מעצבות, ספקים, עסקאות, אירועים ועוד.",
      sender: "bot",
      timestamp: new Date(),
      relatedTopics: ["מצב הקהילה", "כמה עסקאות השבוע?", "משימות פתוחות"],
    },
  ]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = useCallback((text?: string) => {
    const msg = text || input.trim();
    if (!msg) return;

    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      text: msg,
      sender: "user",
      timestamp: new Date(),
    };
    setMessages(prev => [...prev, userMsg]);
    setInput("");
    setIsTyping(true);

    // Simulate typing delay
    setTimeout(() => {
      const result = findAnswer(msg);
      const botMsg: ChatMessage = {
        id: (Date.now() + 1).toString(),
        text: result?.answer || getNoMatchMessage(),
        sender: "bot",
        timestamp: new Date(),
        relatedTopics: result?.relatedTopics,
      };
      setMessages(prev => [...prev, botMsg]);
      setIsTyping(false);
    }, 600 + Math.random() * 800);
  }, [input]);

  const handleCopy = useCallback((text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  }, []);

  const handleClear = useCallback(() => {
    setMessages([{
      id: "welcome-new",
      text: "שיחה חדשה! 🔄 איך אפשר לעזור?",
      sender: "bot",
      timestamp: new Date(),
      relatedTopics: ["מצב הקהילה", "כמה עסקאות השבוע?", "משימות פתוחות"],
    }]);
  }, []);

  return (
    <>
      {/* FAB Button */}
      {!isOpen && (
        <button
          onClick={() => { setIsOpen(true); setTimeout(() => inputRef.current?.focus(), 300); }}
          className="fixed bottom-6 left-6 z-50 w-14 h-14 rounded-full bg-gold text-bg shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-300 flex items-center justify-center group"
          title="בוט ניהול"
        >
          <Bot className="w-6 h-6 group-hover:scale-110 transition-transform" />
          <span className="absolute -top-1 -right-1 w-3 h-3 bg-emerald-400 rounded-full animate-pulse" />
        </button>
      )}

      {/* Chat Panel */}
      {isOpen && (
        <div className="fixed bottom-6 left-6 z-50 w-[380px] max-h-[560px] flex flex-col rounded-2xl shadow-2xl overflow-hidden border border-border-gold/30 backdrop-blur-xl bg-white/95 animate-in">
          {/* Header */}
          <div className="bg-gradient-to-l from-[#C9A84C] to-[#B8963E] px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center">
                <Bot className="w-5 h-5 text-white" />
              </div>
              <div>
                <h3 className="text-white font-heading text-sm font-bold">בוט ניהול</h3>
                <p className="text-white/70 text-[10px] flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-300 animate-pulse" />
                  מוכן לעזור
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <button onClick={handleClear} className="text-white/60 hover:text-white p-1.5 rounded-full hover:bg-white/10 transition-colors" title="נקה שיחה">
                <Trash2 className="w-4 h-4" />
              </button>
              <button onClick={() => setIsOpen(false)} className="text-white/60 hover:text-white p-1.5 rounded-full hover:bg-white/10 transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Quick Chips */}
          <div className="px-3 py-2 flex gap-1.5 flex-wrap bg-[#faf8f3] border-b border-border-subtle">
            {quickQueries.map((q) => (
              <button key={q} onClick={() => handleSend(q)}
                className="text-[10px] px-2.5 py-1 rounded-full bg-gold/10 text-gold hover:bg-gold/20 transition-colors whitespace-nowrap border border-gold/20">
                {q}
              </button>
            ))}
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3 max-h-[340px] bg-[#faf8f3]">
            {messages.map((msg) => (
              <div key={msg.id} className={`flex ${msg.sender === "user" ? "justify-start" : "justify-end"}`}>
                <div className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed relative group ${
                  msg.sender === "user"
                    ? "bg-gold/10 text-text-primary rounded-tr-sm"
                    : "bg-white border border-border-subtle text-text-primary rounded-tl-sm shadow-sm"
                }`}>
                  <p className="whitespace-pre-wrap">{msg.text}</p>

                  {/* Related Topics */}
                  {msg.relatedTopics && msg.relatedTopics.length > 0 && msg.sender === "bot" && (
                    <div className="mt-2 pt-2 border-t border-border-subtle/50 flex flex-wrap gap-1">
                      {msg.relatedTopics.map((topic) => (
                        <button key={topic} onClick={() => handleSend(topic)}
                          className="text-[9px] px-2 py-0.5 rounded-full bg-gold/5 text-gold hover:bg-gold/15 transition-colors border border-gold/10">
                          {topic}
                        </button>
                      ))}
                    </div>
                  )}

                  {/* Copy button */}
                  {msg.sender === "bot" && (
                    <button onClick={() => handleCopy(msg.text, msg.id)}
                      className="absolute -left-7 top-2 opacity-0 group-hover:opacity-100 transition-opacity text-text-muted hover:text-gold">
                      {copiedId === msg.id ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  )}

                  <span className="block text-[9px] text-text-muted/60 mt-1">
                    {msg.timestamp.toLocaleTimeString("he-IL", { hour: "2-digit", minute: "2-digit" })}
                  </span>
                </div>
              </div>
            ))}

            {/* Typing indicator */}
            {isTyping && (
              <div className="flex justify-end">
                <div className="bg-white border border-border-subtle rounded-2xl rounded-tl-sm px-4 py-3 shadow-sm">
                  <div className="flex gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-gold animate-bounce" style={{ animationDelay: "0ms" }} />
                    <span className="w-2 h-2 rounded-full bg-gold animate-bounce" style={{ animationDelay: "150ms" }} />
                    <span className="w-2 h-2 rounded-full bg-gold animate-bounce" style={{ animationDelay: "300ms" }} />
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="px-3 py-2.5 border-t border-border-subtle bg-white">
            <div className="flex items-center gap-2">
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSend()}
                placeholder="שאלי על הקהילה..."
                className="flex-1 bg-[#faf8f3] border border-border-subtle rounded-full px-4 py-2 text-sm text-text-primary placeholder:text-text-muted/50 focus:outline-none focus:border-gold/50 transition-colors"
              />
              <button
                onClick={() => handleSend()}
                disabled={!input.trim() || isTyping}
                className="w-9 h-9 rounded-full bg-gold text-white flex items-center justify-center hover:bg-[#B8963E] disabled:opacity-40 disabled:cursor-not-allowed transition-all"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
            <p className="text-center text-[9px] text-text-muted/40 mt-1.5">
              בוט ניהול זירת · מבוסס נתוני דמו
            </p>
          </div>
        </div>
      )}
    </>
  );
}
