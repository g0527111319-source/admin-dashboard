"use client";

import { useState, useEffect, useRef } from "react";
import {
  MessageCircle, Send, Settings, Plus, Phone, User,
  CheckCircle2, Clock, XCircle, AlertTriangle, Wifi, WifiOff,
  QrCode, Loader2, Unplug
} from "lucide-react";

type WhatsAppConfig = {
  phoneNumberId: string | null;
  accessToken: string | null;
  webhookSecret: string | null;
  isActive: boolean;
};

type WhatsAppMessage = {
  id: string;
  direction: "inbound" | "outbound";
  phoneNumber: string;
  content: string;
  status: string;
  messageType: string;
  createdAt: string;
  client?: { id: string; name: string; phone: string } | null;
};

type Client = {
  id: string;
  name: string;
  phone: string | null;
};

type ConnectionState = "disconnected" | "connecting" | "qr_ready" | "connected";

export default function CrmWhatsApp() {
  const [view, setView] = useState<"messages" | "settings" | "unofficial">("messages");
  const [config, setConfig] = useState<WhatsAppConfig>({ phoneNumberId: null, accessToken: null, webhookSecret: null, isActive: false });
  const [messages, setMessages] = useState<WhatsAppMessage[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [showSend, setShowSend] = useState(false);
  const [selectedClient, setSelectedClient] = useState<string>("");
  const [messageText, setMessageText] = useState("");
  const [sending, setSending] = useState(false);
  const [saving, setSaving] = useState(false);

  // Unofficial WhatsApp state
  const [connectionState, setConnectionState] = useState<ConnectionState>("disconnected");
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [connecting, setConnecting] = useState(false);
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Config form
  const [configForm, setConfigForm] = useState({
    phoneNumberId: "",
    accessToken: "",
    webhookSecret: "",
    isActive: false,
  });

  useEffect(() => {
    fetchData();
    checkConnectionStatus();
    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current);
    };
  }, []);

  async function fetchData() {
    try {
      const [configRes, messagesRes, clientsRes] = await Promise.all([
        fetch("/api/designer/crm/whatsapp?type=config"),
        fetch("/api/designer/crm/whatsapp?type=messages"),
        fetch("/api/designer/crm/clients"),
      ]);

      if (configRes.ok) {
        const c = await configRes.json();
        setConfig(c);
        setConfigForm({
          phoneNumberId: c.phoneNumberId || "",
          accessToken: c.accessToken || "",
          webhookSecret: c.webhookSecret || "",
          isActive: c.isActive || false,
        });
      }
      if (messagesRes.ok) setMessages(await messagesRes.json());
      if (clientsRes.ok) setClients(await clientsRes.json());
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  async function checkConnectionStatus() {
    try {
      const res = await fetch("/api/designer/crm/whatsapp/connect");
      if (res.ok) {
        const data = await res.json();
        setConnectionState(data.state);
        if (data.qr) setQrCode(data.qr);
      }
    } catch {
      // API not available
    }
  }

  async function startConnection() {
    setConnecting(true);
    try {
      const res = await fetch("/api/designer/crm/whatsapp/connect", {
        method: "POST",
      });
      if (res.ok) {
        const data = await res.json();
        setConnectionState(data.state);
        if (data.qr) setQrCode(data.qr);

        // Start polling for state changes
        if (pollingRef.current) clearInterval(pollingRef.current);
        pollingRef.current = setInterval(async () => {
          try {
            const statusRes = await fetch("/api/designer/crm/whatsapp/connect");
            if (statusRes.ok) {
              const statusData = await statusRes.json();
              setConnectionState(statusData.state);
              if (statusData.qr) setQrCode(statusData.qr);
              if (statusData.state === "connected" || statusData.state === "disconnected") {
                if (pollingRef.current) clearInterval(pollingRef.current);
              }
            }
          } catch {
            // ignore polling errors
          }
        }, 3000);
      }
    } catch (e) {
      console.error("Connection error:", e);
    } finally {
      setConnecting(false);
    }
  }

  async function handleDisconnect() {
    try {
      const res = await fetch("/api/designer/crm/whatsapp/connect", {
        method: "DELETE",
      });
      if (res.ok) {
        setConnectionState("disconnected");
        setQrCode(null);
        if (pollingRef.current) clearInterval(pollingRef.current);
      }
    } catch (e) {
      console.error("Disconnect error:", e);
    }
  }

  async function saveConfig() {
    setSaving(true);
    try {
      const res = await fetch("/api/designer/crm/whatsapp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "save-config", ...configForm }),
      });
      if (res.ok) {
        const updated = await res.json();
        setConfig(updated);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setSaving(false);
    }
  }

  async function sendMessage() {
    if (!messageText.trim()) return;
    const client = clients.find(c => c.id === selectedClient);
    if (!client?.phone) return;

    setSending(true);
    try {
      const res = await fetch("/api/designer/crm/whatsapp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "send-message",
          clientId: selectedClient,
          phoneNumber: client.phone,
          content: messageText.trim(),
        }),
      });
      if (res.ok) {
        const msg = await res.json();
        setMessages(prev => [msg, ...prev]);
        setMessageText("");
        setShowSend(false);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setSending(false);
    }
  }

  const statusIcon = (status: string) => {
    switch (status) {
      case "delivered": case "read": return <CheckCircle2 size={12} className="text-green-500" />;
      case "sent": return <Clock size={12} className="text-blue-500" />;
      case "failed": return <XCircle size={12} className="text-red-500" />;
      default: return <Clock size={12} className="text-gray-400" />;
    }
  };

  const connectionStateLabel: Record<ConnectionState, { label: string; color: string; icon: typeof Wifi }> = {
    disconnected: { label: "מנותק", color: "text-red-600", icon: WifiOff },
    connecting: { label: "מתחבר...", color: "text-yellow-600", icon: Loader2 },
    qr_ready: { label: "ממתין לסריקה", color: "text-blue-600", icon: QrCode },
    connected: { label: "מחובר", color: "text-green-600", icon: Wifi },
  };

  if (loading) {
    return <div className="flex justify-center py-12"><div className="w-8 h-8 border-4 border-green-500 border-t-transparent rounded-full animate-spin" /></div>;
  }

  return (
    <div className="space-y-6" dir="rtl">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
          <MessageCircle className="w-5 h-5 text-green-600" />
          WhatsApp
        </h2>
        <div className="flex gap-2">
          <button onClick={() => setView("messages")} className={`px-3 py-1.5 rounded-lg text-sm ${view === "messages" ? "bg-green-600 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}>
            הודעות
          </button>
          <button onClick={() => setView("unofficial")} className={`px-3 py-1.5 rounded-lg text-sm ${view === "unofficial" ? "bg-green-600 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}>
            <Wifi size={14} className="inline ml-1" />
            חיבור ישיר
          </button>
          <button onClick={() => setView("settings")} className={`px-3 py-1.5 rounded-lg text-sm ${view === "settings" ? "bg-green-600 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}>
            <Settings size={14} className="inline ml-1" />
            הגדרות API
          </button>
        </div>
      </div>

      {/* Status bar */}
      <div className={`px-4 py-2 rounded-lg text-sm flex items-center gap-2 ${
        connectionState === "connected"
          ? "bg-green-50 text-green-700"
          : config.isActive
            ? "bg-green-50 text-green-700"
            : "bg-yellow-50 text-yellow-700"
      }`}>
        <div className={`w-2 h-2 rounded-full ${
          connectionState === "connected" ? "bg-green-500" : config.isActive ? "bg-green-500" : "bg-yellow-500"
        }`} />
        {connectionState === "connected"
          ? "WhatsApp מחובר (חיבור ישיר)"
          : config.isActive
            ? "WhatsApp מחובר ופעיל (API)"
            : "WhatsApp לא מוגדר"
        }
      </div>

      {view === "messages" ? (
        <>
          {/* Send message */}
          {!showSend ? (
            <button onClick={() => setShowSend(true)} className="w-full border-2 border-dashed border-gray-300 rounded-xl p-3 text-gray-500 hover:border-green-400 hover:text-green-500 flex items-center justify-center gap-2">
              <Plus size={16} /> שלח הודעה ללקוח
            </button>
          ) : (
            <div className="bg-white border rounded-xl p-4 space-y-3">
              <select value={selectedClient} onChange={e => setSelectedClient(e.target.value)} className="w-full border rounded-lg px-3 py-2 text-sm">
                <option value="">— בחר לקוח —</option>
                {clients.filter(c => c.phone).map(c => (
                  <option key={c.id} value={c.id}>{c.name} ({c.phone})</option>
                ))}
              </select>
              <textarea
                value={messageText}
                onChange={e => setMessageText(e.target.value)}
                placeholder="כתוב הודעה..."
                className="w-full border rounded-lg px-3 py-2 text-sm h-20 resize-none"
              />
              <div className="flex gap-2 justify-end">
                <button onClick={() => { setShowSend(false); setMessageText(""); }} className="px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-100 rounded-lg">ביטול</button>
                <button onClick={sendMessage} disabled={!selectedClient || !messageText.trim() || sending} className="px-4 py-1.5 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 flex items-center gap-1">
                  <Send size={14} />
                  {sending ? "שולח..." : "שלח"}
                </button>
              </div>
            </div>
          )}

          {/* Message list */}
          <div className="space-y-2">
            {messages.map(msg => (
              <div key={msg.id} className={`bg-white border rounded-xl p-3 ${msg.direction === "outbound" ? "border-r-4 border-r-green-400" : "border-r-4 border-r-blue-400"}`}>
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2 text-sm">
                    {msg.direction === "outbound" ? (
                      <span className="text-green-600 font-medium">נשלח</span>
                    ) : (
                      <span className="text-blue-600 font-medium">התקבל</span>
                    )}
                    {msg.client && <span className="text-gray-500">• {msg.client.name}</span>}
                    <span className="text-gray-400 text-xs">{msg.phoneNumber}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    {statusIcon(msg.status)}
                    <span className="text-xs text-gray-400">
                      {new Date(msg.createdAt).toLocaleDateString("he-IL")} {new Date(msg.createdAt).toLocaleTimeString("he-IL", { hour: "2-digit", minute: "2-digit" })}
                    </span>
                  </div>
                </div>
                <p className="text-sm text-gray-700">{msg.content}</p>
              </div>
            ))}

            {messages.length === 0 && (
              <div className="text-center py-12 text-gray-400">
                <MessageCircle size={40} className="mx-auto mb-3 opacity-30" />
                <p>אין הודעות עדיין</p>
              </div>
            )}
          </div>
        </>
      ) : view === "unofficial" ? (
        /* ===== UNOFFICIAL / DIRECT CONNECTION (Baileys) ===== */
        <div className="space-y-5 max-w-xl">
          {/* Warning banner */}
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <div>
              <h4 className="text-sm font-semibold text-amber-800 mb-1">שימו לב — חיבור לא רשמי</h4>
              <p className="text-xs text-amber-700 leading-relaxed">
                חיבור זה משתמש בספריית קוד פתוח (Baileys) ואינו חלק מ-WhatsApp Business API הרשמי.
                חיבור זה <strong>עלול להיחסם</strong> אם יזוהה שימוש חריג על ידי WhatsApp.
                מומלץ לא לשלוח הודעות בכמות גדולה או בתדירות גבוהה.
              </p>
            </div>
          </div>

          {/* Connection status card */}
          <div className="bg-white border rounded-xl p-5">
            <h3 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
              <Phone className="w-4 h-4" />
              חיבור ישיר ל-WhatsApp
            </h3>

            {/* Current status */}
            <div className="flex items-center gap-3 mb-5">
              {(() => {
                const stateInfo = connectionStateLabel[connectionState];
                const StateIcon = stateInfo.icon;
                return (
                  <>
                    <StateIcon className={`w-5 h-5 ${stateInfo.color} ${connectionState === "connecting" ? "animate-spin" : ""}`} />
                    <span className={`text-sm font-medium ${stateInfo.color}`}>{stateInfo.label}</span>
                  </>
                );
              })()}
            </div>

            {/* QR Code display */}
            {connectionState === "qr_ready" && qrCode && (
              <div className="text-center mb-5">
                <div className="bg-white border-2 border-gray-200 rounded-xl p-4 inline-block mb-3">
                  {/* QR code as text — in production, use qrcode library to render */}
                  <div className="w-48 h-48 bg-gray-50 rounded-lg flex items-center justify-center">
                    <div className="text-center">
                      <QrCode className="w-16 h-16 text-gray-400 mx-auto mb-2" />
                      <p className="text-xs text-gray-500 max-w-[160px]">
                        QR Code מוכן לסריקה
                      </p>
                      <p className="text-[10px] text-gray-400 mt-1 break-all max-w-[160px]">
                        {qrCode.substring(0, 30)}...
                      </p>
                    </div>
                  </div>
                </div>
                <p className="text-sm text-gray-600">
                  סרקו את הקוד באפליקציית WhatsApp שלכם
                </p>
                <p className="text-xs text-gray-400 mt-1">
                  WhatsApp → הגדרות → מכשירים מקושרים → קישור מכשיר
                </p>
              </div>
            )}

            {/* Connected state */}
            {connectionState === "connected" && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-5 text-center">
                <CheckCircle2 className="w-8 h-8 text-green-500 mx-auto mb-2" />
                <p className="text-sm font-medium text-green-700">WhatsApp מחובר בהצלחה!</p>
                <p className="text-xs text-green-600 mt-1">ניתן כעת לשלוח ולקבל הודעות דרך המערכת</p>
              </div>
            )}

            {/* Action buttons */}
            <div className="flex gap-3">
              {connectionState === "disconnected" && (
                <button
                  onClick={startConnection}
                  disabled={connecting}
                  className="flex-1 bg-green-600 text-white py-2.5 rounded-lg text-sm hover:bg-green-700 disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {connecting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      מתחבר...
                    </>
                  ) : (
                    <>
                      <Wifi className="w-4 h-4" />
                      התחבר ל-WhatsApp
                    </>
                  )}
                </button>
              )}

              {(connectionState === "connecting" || connectionState === "qr_ready") && (
                <button
                  onClick={handleDisconnect}
                  className="flex-1 bg-gray-100 text-gray-700 py-2.5 rounded-lg text-sm hover:bg-gray-200 flex items-center justify-center gap-2"
                >
                  <XCircle className="w-4 h-4" />
                  ביטול
                </button>
              )}

              {connectionState === "connected" && (
                <button
                  onClick={handleDisconnect}
                  className="flex-1 bg-red-50 text-red-600 py-2.5 rounded-lg text-sm hover:bg-red-100 border border-red-200 flex items-center justify-center gap-2"
                >
                  <Unplug className="w-4 h-4" />
                  נתק חיבור
                </button>
              )}
            </div>
          </div>

          {/* Instructions */}
          <div className="bg-gray-50 border rounded-xl p-4">
            <h4 className="text-sm font-semibold text-gray-700 mb-2">איך זה עובד?</h4>
            <ol className="text-xs text-gray-600 space-y-2 list-decimal list-inside">
              <li>לחצו על &quot;התחבר ל-WhatsApp&quot;</li>
              <li>סרקו את קוד ה-QR שיופיע באפליקציית WhatsApp שלכם</li>
              <li>לאחר הסריקה, החיבור יתבצע אוטומטית</li>
              <li>תוכלו לשלוח הודעות ללקוחות ישירות מהמערכת</li>
            </ol>
          </div>
        </div>
      ) : (
        /* ===== SETTINGS — Business API ===== */
        <div className="card-static space-y-4 max-w-xl">
          <h3 className="font-semibold text-gray-800">הגדרות WhatsApp Business API</h3>
          <p className="text-xs text-gray-500">חבר את חשבון WhatsApp Business שלך כדי לשלוח ולקבל הודעות ישירות מהמערכת.</p>

          <div>
            <label className="text-sm text-gray-600 block mb-1">Phone Number ID</label>
            <input value={configForm.phoneNumberId} onChange={e => setConfigForm({ ...configForm, phoneNumberId: e.target.value })} className="w-full border rounded-lg px-3 py-2 text-sm" dir="ltr" placeholder="מ-Meta Business Suite" />
          </div>
          <div>
            <label className="text-sm text-gray-600 block mb-1">Access Token</label>
            <input value={configForm.accessToken} onChange={e => setConfigForm({ ...configForm, accessToken: e.target.value })} className="w-full border rounded-lg px-3 py-2 text-sm" dir="ltr" type="password" placeholder="Permanent token" />
          </div>
          <div>
            <label className="text-sm text-gray-600 block mb-1">Webhook Verify Token</label>
            <input value={configForm.webhookSecret} onChange={e => setConfigForm({ ...configForm, webhookSecret: e.target.value })} className="w-full border rounded-lg px-3 py-2 text-sm" dir="ltr" placeholder="Custom verify string" />
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600">הפעל חיבור</span>
            <div onClick={() => setConfigForm({ ...configForm, isActive: !configForm.isActive })} className={`w-11 h-6 rounded-full transition-colors relative cursor-pointer ${configForm.isActive ? "bg-green-600" : "bg-gray-300"}`}>
              <div className={`w-5 h-5 bg-white rounded-full absolute top-0.5 transition-transform shadow ${configForm.isActive ? "right-0.5" : "right-[22px]"}`} />
            </div>
          </div>
          <button onClick={saveConfig} disabled={saving} className="w-full bg-green-600 text-white py-2 rounded-lg text-sm hover:bg-green-700 disabled:opacity-50">
            {saving ? "שומר..." : "שמור הגדרות"}
          </button>
        </div>
      )}
    </div>
  );
}
