"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Send, MessageCircle, Loader2, Bell, User } from "lucide-react";

type Message = {
  id: string;
  senderType: "designer" | "client";
  senderName?: string;
  content: string;
  isRead: boolean;
  createdAt: string;
};

type Project = {
  id: string;
  name: string;
  client: { id: string; name: string };
};

const DEMO_MESSAGES: Message[] = [
  {
    id: "demo-1",
    senderType: "designer",
    senderName: "המעצבת",
    content: "שלום! ברוכים הבאים לפרויקט. אשמח לענות על כל שאלה.",
    isRead: true,
    createdAt: new Date(Date.now() - 86400000 * 2).toISOString(),
  },
  {
    id: "demo-2",
    senderType: "client",
    senderName: "הלקוח",
    content: "תודה רבה! רציתי לשאול לגבי הצבע של הסלון, האם אפשר לשנות לגוון חם יותר?",
    isRead: true,
    createdAt: new Date(Date.now() - 86400000).toISOString(),
  },
  {
    id: "demo-3",
    senderType: "designer",
    senderName: "המעצבת",
    content: "בהחלט! אני אכין לך כמה אפשרויות עם גוונים חמים ואשלח לאישור. צפי למענה תוך יום עבודה.",
    isRead: true,
    createdAt: new Date(Date.now() - 43200000).toISOString(),
  },
  {
    id: "demo-4",
    senderType: "client",
    senderName: "הלקוח",
    content: "מעולה, תודה! גם רציתי לדעת מה המצב עם תכנית החשמל?",
    isRead: false,
    createdAt: new Date(Date.now() - 3600000).toISOString(),
  },
];

export default function CrmChat() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const [hasNewMessages, setHasNewMessages] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  // Fetch projects
  useEffect(() => {
    fetch("/api/designer/crm/projects")
      .then((r) => (r.ok ? r.json() : []))
      .then((d) => {
        const projs = Array.isArray(d) ? d : d.projects || [];
        setProjects(projs);
        if (projs.length > 0) setSelectedProjectId(projs[0].id);
      });
  }, []);

  // Fetch messages
  const fetchMessages = useCallback(async () => {
    if (!selectedProjectId) return;
    setLoading(true);
    try {
      const res = await fetch(
        `/api/designer/crm/projects/${selectedProjectId}/messages`
      );
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data) && data.length > 0) {
          setMessages(data);
          const unread = data.some(
            (m: Message) => !m.isRead && m.senderType === "client"
          );
          setHasNewMessages(unread);
        } else {
          // Use demo messages if no real messages
          setMessages(DEMO_MESSAGES);
          setHasNewMessages(true);
        }
      } else {
        setMessages(DEMO_MESSAGES);
        setHasNewMessages(true);
      }
    } catch {
      setMessages(DEMO_MESSAGES);
      setHasNewMessages(true);
    } finally {
      setLoading(false);
    }
  }, [selectedProjectId]);

  useEffect(() => {
    fetchMessages();
  }, [fetchMessages]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !selectedProjectId) return;

    setSending(true);
    try {
      const res = await fetch(
        `/api/designer/crm/projects/${selectedProjectId}/messages`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ content: newMessage.trim(), senderType: "designer" }),
        }
      );
      if (res.ok) {
        setNewMessage("");
        fetchMessages();
      } else {
        // Demo mode: add message locally
        const demoMsg: Message = {
          id: `local-${Date.now()}`,
          senderType: "designer",
          senderName: "המעצבת",
          content: newMessage.trim(),
          isRead: true,
          createdAt: new Date().toISOString(),
        };
        setMessages((prev) => [...prev, demoMsg]);
        setNewMessage("");
      }
    } catch {
      // Demo mode fallback
      const demoMsg: Message = {
        id: `local-${Date.now()}`,
        senderType: "designer",
        senderName: "המעצבת",
        content: newMessage.trim(),
        isRead: true,
        createdAt: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, demoMsg]);
      setNewMessage("");
    } finally {
      setSending(false);
    }
  };

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffDays = Math.floor(
      (now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24)
    );

    const time = date.toLocaleString("he-IL", {
      hour: "2-digit",
      minute: "2-digit",
    });

    if (diffDays === 0) return `היום ${time}`;
    if (diffDays === 1) return `אתמול ${time}`;
    return `${date.toLocaleDateString("he-IL", { day: "2-digit", month: "2-digit" })} ${time}`;
  };

  return (
    <div className="space-y-4 animate-in" dir="rtl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h2 className="text-xl font-heading text-text-primary">צ׳אט עם לקוחות</h2>
          {hasNewMessages && (
            <span className="flex items-center gap-1 px-2 py-0.5 bg-red-50 text-red-600 rounded-full text-xs font-medium animate-pulse">
              <Bell className="w-3 h-3" />
              הודעה חדשה
            </span>
          )}
        </div>
      </div>

      {/* Project selector */}
      <select
        className="select-field"
        value={selectedProjectId}
        onChange={(e) => setSelectedProjectId(e.target.value)}
      >
        <option value="">בחרי פרויקט...</option>
        {projects.map((p) => (
          <option key={p.id} value={p.id}>
            {p.name} -- {p.client?.name}
          </option>
        ))}
      </select>

      {!selectedProjectId ? (
        <div className="card-static text-center py-12 text-text-muted">
          <MessageCircle className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p>בחרי פרויקט כדי לצפות בהודעות</p>
        </div>
      ) : loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="w-6 h-6 text-gold animate-spin" />
        </div>
      ) : (
        <div className="card-static overflow-hidden p-0">
          {/* Messages list */}
          <div className="h-[450px] overflow-y-auto p-4 space-y-3 bg-bg-surface/30">
            {messages.length === 0 ? (
              <div className="text-center py-12">
                <MessageCircle className="w-12 h-12 text-text-muted mx-auto mb-3 opacity-30" />
                <p className="text-text-muted text-sm">אין הודעות עדיין</p>
                <p className="text-text-muted text-xs mt-1">שלחי הודעה ראשונה ללקוח</p>
              </div>
            ) : (
              messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex ${msg.senderType === "designer" ? "justify-start" : "justify-end"}`}
                >
                  <div className="flex items-end gap-2 max-w-[80%]">
                    {msg.senderType === "designer" && (
                      <div className="w-7 h-7 rounded-full bg-gold/20 flex items-center justify-center flex-shrink-0 mb-1">
                        <User className="w-3.5 h-3.5 text-gold" />
                      </div>
                    )}
                    <div>
                      <div
                        className={`rounded-2xl px-4 py-2.5 ${
                          msg.senderType === "designer"
                            ? "bg-gold/10 border border-gold/20 text-text-primary rounded-br-sm"
                            : "bg-white border border-border-subtle text-text-primary rounded-bl-sm shadow-sm"
                        }`}
                      >
                        <p className="text-sm whitespace-pre-wrap leading-relaxed">{msg.content}</p>
                      </div>
                      <div className="flex items-center gap-2 mt-1 px-1">
                        <p className="text-[10px] text-text-muted">
                          {formatTime(msg.createdAt)}
                        </p>
                        {!msg.isRead && msg.senderType === "client" && (
                          <span className="w-2 h-2 rounded-full bg-red-400"></span>
                        )}
                      </div>
                    </div>
                    {msg.senderType === "client" && (
                      <div className="w-7 h-7 rounded-full bg-gray-200 flex items-center justify-center flex-shrink-0 mb-1">
                        <User className="w-3.5 h-3.5 text-gray-500" />
                      </div>
                    )}
                  </div>
                </div>
              ))
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input area */}
          <form
            onSubmit={handleSend}
            className="border-t border-border-subtle p-3 flex gap-2 bg-white"
          >
            <input
              type="text"
              className="input-field flex-1"
              placeholder="כתבי הודעה..."
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              dir="rtl"
            />
            <button
              type="submit"
              disabled={sending || !newMessage.trim()}
              className="btn-gold flex items-center gap-1.5 px-4 disabled:opacity-50"
            >
              {sending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  <span className="text-sm">שלחי</span>
                </>
              )}
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
