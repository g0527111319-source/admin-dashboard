"use client";
import { useState, useMemo } from "react";
import {
  MessageCircle, Wifi, WifiOff, QrCode, Send, Clock, RefreshCw,
  AlertTriangle, Plus, X, Users, Filter, CheckCircle, Eye,
  Calendar, BarChart3, Edit3, Copy, Search,
} from "lucide-react";

// --- Demo Data ---

const AREAS = ["צפון", "חיפה", "שרון", "מרכז", "תל אביב", "שפלה", "ירושלים", "דרום"];

const TEMPLATES = [
  {
    id: 1,
    name: "ברוכה הבאה",
    body: "היי {name} 👋\nברוכה הבאה לקהילת זירת! אנחנו שמחות שהצטרפת. אם יש לך שאלות — אנחנו כאן בשבילך.",
    variables: ["{name}"],
  },
  {
    id: 2,
    name: "תזכורת אירוע",
    body: "שלום {name},\nרצינו להזכיר — {event} מתקיים מחר! נשמח לראותך שם 🎉",
    variables: ["{name}", "{event}"],
  },
  {
    id: 3,
    name: "תזכורת תשלום",
    body: "היי {name},\nרצינו להזכיר שיש לך תשלום פתוח בסך {deal_amount} ₪. ניתן לשלם דרך הלינק באזור האישי.",
    variables: ["{name}", "{deal_amount}"],
  },
  {
    id: 4,
    name: "עסקה חדשה",
    body: "מזל טוב {name}! 🎊\nנסגרה עסקה חדשה בסך {deal_amount} ₪ באירוע {event}. פרטים נוספים באזור האישי.",
    variables: ["{name}", "{deal_amount}", "{event}"],
  },
];

const PAST_BROADCASTS = [
  {
    id: 1,
    date: "2026-03-17",
    preview: "היי {name}, תזכורת — מפגש נטוורקינג מחר ב-18:00!",
    recipientsCount: 124,
    sent: 124,
    delivered: 118,
    read: 95,
    failed: 6,
  },
  {
    id: 2,
    date: "2026-03-14",
    preview: "שלום {name}, הזדמנות עסקית חדשה באזור מרכז!",
    recipientsCount: 67,
    sent: 67,
    delivered: 65,
    read: 41,
    failed: 2,
  },
  {
    id: 3,
    date: "2026-03-10",
    preview: "ברוכות הבאות לחודש מרץ! 🌸 הנה הפעילויות...",
    recipientsCount: 210,
    sent: 210,
    delivered: 198,
    read: 152,
    failed: 12,
  },
];

const MESSAGE_LOGS = [
  { time: "09:15", dir: "שליחה", phone: "052-***-4567", msg: "תזכורת פרסום — סטון דיזיין", status: "נמסר" },
  { time: "09:10", dir: "קבלה", phone: "050-***-1234", msg: "דיווח עסקה חדשה", status: "נקרא" },
  { time: "08:45", dir: "שליחה", phone: "054-***-2233", msg: "אישור פרסום", status: "נשלח" },
];

// --- Component ---

export default function WhatsAppPage() {
  const [isConnected] = useState(false);
  const [showQR, setShowQR] = useState(false);

  // Tabs
  type TabKey = "broadcast" | "templates" | "history" | "log";
  const [activeTab, setActiveTab] = useState<TabKey>("broadcast");

  // Broadcast composer state
  const [recipientType, setRecipientType] = useState<"all" | "area" | "activity" | "custom">("all");
  const [selectedAreas, setSelectedAreas] = useState<string[]>([]);
  const [activityLevel, setActivityLevel] = useState<"high" | "medium" | "low">("high");
  const [messageText, setMessageText] = useState("");
  const [scheduleNow, setScheduleNow] = useState(true);
  const [scheduleDate, setScheduleDate] = useState("");
  const [scheduleTime, setScheduleTime] = useState("");

  // Preview with demo values
  const previewText = useMemo(() => {
    return messageText
      .replace(/\{name\}/g, "דנה כהן")
      .replace(/\{event\}/g, "מפגש נטוורקינג מרץ")
      .replace(/\{deal_amount\}/g, "2,500");
  }, [messageText]);

  const insertVariable = (v: string) => {
    setMessageText((prev) => prev + v);
  };

  const toggleArea = (area: string) => {
    setSelectedAreas((prev) =>
      prev.includes(area) ? prev.filter((a) => a !== area) : [...prev, area]
    );
  };

  const copyTemplateToComposer = (body: string) => {
    setMessageText(body);
    setActiveTab("broadcast");
  };

  const recipientLabel = useMemo(() => {
    if (recipientType === "all") return "כל החברות";
    if (recipientType === "area") return selectedAreas.length > 0 ? selectedAreas.join(", ") : "לא נבחרו אזורים";
    if (recipientType === "activity") {
      const labels = { high: "פעילות גבוהה", medium: "פעילות בינונית", low: "פעילות נמוכה" };
      return labels[activityLevel];
    }
    return "רשימה מותאמת";
  }, [recipientType, selectedAreas, activityLevel]);

  // --- Tabs config ---
  const tabs: { key: TabKey; label: string; icon: React.ReactNode }[] = [
    { key: "broadcast", label: "שידור חדש", icon: <Plus className="w-4 h-4" /> },
    { key: "templates", label: "תבניות", icon: <Copy className="w-4 h-4" /> },
    { key: "history", label: "היסטוריה", icon: <BarChart3 className="w-4 h-4" /> },
    { key: "log", label: "לוג הודעות", icon: <Eye className="w-4 h-4" /> },
  ];

  // --- Render helpers ---

  const renderStatBar = (value: number, total: number, color: string) => (
    <div className="flex items-center gap-2">
      <div className="w-20 h-2 bg-bg-surface rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full ${color}`}
          style={{ width: `${total > 0 ? (value / total) * 100 : 0}%` }}
        />
      </div>
      <span className="text-xs text-text-muted">{value}</span>
    </div>
  );

  return (
    <div className="space-y-6 animate-in">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-heading text-text-primary flex items-center gap-2">
          <MessageCircle className="w-7 h-7" />
          {"מרכז שידורים — וואטסאפ"}
        </h1>
        <p className="text-text-muted text-sm mt-1">
          {"ניהול שידורים, תבניות והודעות אוטומטיות"}
        </p>
      </div>

      {/* Connection Status */}
      <div className={`card-static border ${isConnected ? "border-green-500/30" : "border-red-500/30"}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {isConnected ? (
              <Wifi className="w-8 h-8 text-emerald-600" />
            ) : (
              <WifiOff className="w-8 h-8 text-red-500" />
            )}
            <div>
              <p className={`font-bold ${isConnected ? "text-emerald-600" : "text-red-500"}`}>
                {isConnected ? "מחובר" : "מנותק"}
              </p>
              <p className="text-text-muted text-xs">
                {isConnected
                  ? "מספר: 972-52-XXX-XXXX | מחובר מאז 08:30"
                  : "יש לסרוק QR Code כדי להתחבר"}
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            {isConnected ? (
              <button className="btn-outline text-sm flex items-center gap-1">
                <RefreshCw className="w-4 h-4" />{"נתק וחבר מחדש"}
              </button>
            ) : (
              <button onClick={() => setShowQR(true)} className="btn-gold text-sm flex items-center gap-1">
                <QrCode className="w-4 h-4" />{"התחבר"}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* QR Code */}
      {showQR && !isConnected && (
        <div className="card-static text-center">
          <QrCode className="w-48 h-48 mx-auto text-gold opacity-50 mb-4" />
          <p className="text-text-muted text-sm">
            {"סרקי את הקוד מהוואטסאפ בטלפון ← 3 נקודות ← מכשירים מקושרים ← קישור מכשיר"}
          </p>
          <p className="text-text-muted text-xs mt-2">{"הקוד מתחדש כל 60 שניות"}</p>
        </div>
      )}

      {/* Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="card-static text-center">
          <Send className="w-6 h-6 text-gold mx-auto mb-2" />
          <p className="text-gold font-mono text-2xl font-bold">47</p>
          <p className="text-text-muted text-xs">{"הודעות היום"}</p>
        </div>
        <div className="card-static text-center">
          <Clock className="w-6 h-6 text-gold mx-auto mb-2" />
          <p className="text-gold font-mono text-2xl font-bold">3</p>
          <p className="text-text-muted text-xs">{"תזכורות ממתינות"}</p>
        </div>
        <div className="card-static text-center">
          <AlertTriangle className="w-6 h-6 text-yellow-400 mx-auto mb-2" />
          <p className="text-yellow-400 font-mono text-2xl font-bold">0</p>
          <p className="text-text-muted text-xs">{"שגיאות שליחה"}</p>
        </div>
      </div>

      {/* Safety Rules */}
      <div className="card-static">
        <h2 className="text-lg font-heading text-text-primary mb-3">
          {"כללי זהירות — מניעת חסימת מספר"}
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div className="space-y-2">
            <p className="text-emerald-600 flex items-center gap-2">{"✅ מספר SIM ייעודי בלבד"}</p>
            <p className="text-emerald-600 flex items-center gap-2">{"✅ מקסימום 150 הודעות ביום"}</p>
            <p className="text-emerald-600 flex items-center gap-2">{"✅ השהייה 3-8 שניות בין הודעות"}</p>
            <p className="text-emerald-600 flex items-center gap-2">{"✅ שליחה רק ל-08:00-23:00"}</p>
          </div>
          <div className="space-y-2">
            <p className="text-red-500 flex items-center gap-2">{"❌ אין שליחה המונית"}</p>
            <p className="text-red-500 flex items-center gap-2">{"❌ אין לינקים חשודים"}</p>
            <p className="text-red-500 flex items-center gap-2">{"❌ לא לשנות מספר טלפון"}</p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="card-static">
        <div className="flex gap-1 border-b border-gold/20 pb-3 mb-4 overflow-x-auto">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-t text-sm font-medium transition-colors whitespace-nowrap ${
                activeTab === tab.key
                  ? "bg-gold/10 text-gold border-b-2 border-gold"
                  : "text-text-muted hover:text-text-primary"
              }`}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab: New Broadcast */}
        {activeTab === "broadcast" && (
          <div className="space-y-6">
            {/* Recipient Selection */}
            <div>
              <h3 className="text-sm font-heading text-text-primary mb-3 flex items-center gap-2">
                <Users className="w-4 h-4 text-gold" />
                {"בחירת נמענות"}
              </h3>
              <div className="flex flex-wrap gap-3">
                {([
                  { value: "all", label: "כולן" },
                  { value: "area", label: "לפי אזור" },
                  { value: "activity", label: "לפי רמת פעילות" },
                  { value: "custom", label: "רשימה מותאמת" },
                ] as const).map((opt) => (
                  <label key={opt.value} className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="recipientType"
                      value={opt.value}
                      checked={recipientType === opt.value}
                      onChange={() => setRecipientType(opt.value)}
                      className="accent-gold"
                    />
                    <span className="text-sm text-text-primary">{opt.label}</span>
                  </label>
                ))}
              </div>

              {/* Area checkboxes */}
              {recipientType === "area" && (
                <div className="mt-3 flex flex-wrap gap-2">
                  {AREAS.map((area) => (
                    <label
                      key={area}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded border cursor-pointer text-sm transition-colors ${
                        selectedAreas.includes(area)
                          ? "border-gold bg-gold/10 text-gold"
                          : "border-gold/20 text-text-muted hover:border-gold/40"
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={selectedAreas.includes(area)}
                        onChange={() => toggleArea(area)}
                        className="accent-gold w-3.5 h-3.5"
                      />
                      {area}
                    </label>
                  ))}
                </div>
              )}

              {/* Activity level */}
              {recipientType === "activity" && (
                <div className="mt-3 flex gap-4">
                  {([
                    { value: "high", label: "פעילות גבוהה" },
                    { value: "medium", label: "פעילות בינונית" },
                    { value: "low", label: "פעילות נמוכה" },
                  ] as const).map((lvl) => (
                    <label key={lvl.value} className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="activityLevel"
                        value={lvl.value}
                        checked={activityLevel === lvl.value}
                        onChange={() => setActivityLevel(lvl.value)}
                        className="accent-gold"
                      />
                      <span className="text-sm text-text-primary">{lvl.label}</span>
                    </label>
                  ))}
                </div>
              )}

              {/* Custom list placeholder */}
              {recipientType === "custom" && (
                <div className="mt-3">
                  <div className="flex items-center gap-2">
                    <Search className="w-4 h-4 text-text-muted" />
                    <input
                      type="text"
                      placeholder="חיפוש חברות לפי שם או טלפון..."
                      className="input-dark text-sm flex-1"
                    />
                  </div>
                  <p className="text-text-muted text-xs mt-2">
                    {"הקלידי שם או מספר טלפון להוספה לרשימה"}
                  </p>
                </div>
              )}

              <p className="text-text-muted text-xs mt-2 flex items-center gap-1">
                <Filter className="w-3 h-3" />
                {"נמענות: "}{recipientLabel}
              </p>
            </div>

            {/* Message Composer */}
            <div>
              <h3 className="text-sm font-heading text-text-primary mb-3 flex items-center gap-2">
                <Edit3 className="w-4 h-4 text-gold" />
                {"תוכן ההודעה"}
              </h3>
              <div className="flex flex-wrap gap-2 mb-2">
                {["{name}", "{event}", "{deal_amount}"].map((v) => (
                  <button
                    key={v}
                    onClick={() => insertVariable(v)}
                    className="btn-outline text-xs px-2 py-1 flex items-center gap-1"
                  >
                    <Plus className="w-3 h-3" />
                    {v}
                  </button>
                ))}
              </div>
              <textarea
                value={messageText}
                onChange={(e) => setMessageText(e.target.value)}
                rows={5}
                placeholder="כתבי את הודעת השידור כאן..."
                className="input-dark w-full text-sm resize-none"
                dir="rtl"
              />
              <p className="text-text-muted text-xs mt-1">
                {messageText.length}{" / 1000 תווים"}
              </p>
            </div>

            {/* Preview */}
            {messageText.length > 0 && (
              <div>
                <h3 className="text-sm font-heading text-text-primary mb-3 flex items-center gap-2">
                  <Eye className="w-4 h-4 text-gold" />
                  {"תצוגה מקדימה"}
                </h3>
                <div className="bg-bg-surface rounded-lg p-4 border border-gold/10">
                  <div className="bg-emerald-900/20 rounded-lg p-3 max-w-sm mr-auto">
                    <p className="text-sm text-text-primary whitespace-pre-wrap">{previewText}</p>
                    <p className="text-[10px] text-text-muted text-left mt-1">{"✓✓ 09:30"}</p>
                  </div>
                  <p className="text-text-muted text-xs mt-2">
                    {"* ערכים לדוגמה: דנה כהן, מפגש נטוורקינג מרץ, 2,500 ₪"}
                  </p>
                </div>
              </div>
            )}

            {/* Schedule */}
            <div>
              <h3 className="text-sm font-heading text-text-primary mb-3 flex items-center gap-2">
                <Calendar className="w-4 h-4 text-gold" />
                {"תזמון שליחה"}
              </h3>
              <div className="flex items-center gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={scheduleNow}
                    onChange={(e) => setScheduleNow(e.target.checked)}
                    className="accent-gold"
                  />
                  <span className="text-sm text-text-primary">{"שלח עכשיו"}</span>
                </label>
                {!scheduleNow && (
                  <div className="flex items-center gap-2">
                    <input
                      type="date"
                      value={scheduleDate}
                      onChange={(e) => setScheduleDate(e.target.value)}
                      className="input-dark text-sm"
                    />
                    <input
                      type="time"
                      value={scheduleTime}
                      onChange={(e) => setScheduleTime(e.target.value)}
                      className="input-dark text-sm"
                    />
                  </div>
                )}
              </div>
            </div>

            {/* Send Button */}
            <div className="flex items-center justify-between pt-2 border-t border-gold/10">
              <p className="text-text-muted text-xs">
                {!isConnected && (
                  <span className="text-red-400 flex items-center gap-1">
                    <AlertTriangle className="w-3 h-3" />
                    {"יש להתחבר לוואטסאפ לפני שליחת שידור"}
                  </span>
                )}
              </p>
              <button
                disabled={!isConnected || messageText.length === 0}
                className="btn-gold flex items-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <Send className="w-4 h-4" />
                {"שלח שידור"}
              </button>
            </div>
          </div>
        )}

        {/* Tab: Templates */}
        {activeTab === "templates" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-heading text-text-primary flex items-center gap-2">
                <Copy className="w-4 h-4 text-gold" />
                {"ספריית תבניות"}
              </h3>
              <button className="btn-outline text-xs flex items-center gap-1">
                <Plus className="w-3 h-3" />
                {"תבנית חדשה"}
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {TEMPLATES.map((tpl) => (
                <div key={tpl.id} className="bg-bg-surface rounded-lg p-4 border border-gold/10">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="text-sm font-bold text-text-primary">{tpl.name}</h4>
                    <div className="flex gap-1">
                      {tpl.variables.map((v) => (
                        <span key={v} className="badge-gold text-[10px]">{v}</span>
                      ))}
                    </div>
                  </div>
                  <p className="text-xs text-text-muted whitespace-pre-wrap mb-3 leading-relaxed">
                    {tpl.body}
                  </p>
                  <div className="flex justify-end gap-2">
                    <button className="btn-outline text-xs flex items-center gap-1">
                      <Edit3 className="w-3 h-3" />
                      {"עריכה"}
                    </button>
                    <button
                      onClick={() => copyTemplateToComposer(tpl.body)}
                      className="btn-gold text-xs flex items-center gap-1"
                    >
                      <Copy className="w-3 h-3" />
                      {"העתק לשידור"}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Tab: Broadcast History */}
        {activeTab === "history" && (
          <div className="space-y-4">
            <h3 className="text-sm font-heading text-text-primary flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-gold" />
              {"היסטוריית שידורים"}
            </h3>
            <div className="overflow-x-auto">
              <table className="table-luxury w-full text-sm">
                <thead>
                  <tr>
                    <th className="text-right px-3 py-2 text-text-muted font-medium">{"תאריך"}</th>
                    <th className="text-right px-3 py-2 text-text-muted font-medium">{"תוכן"}</th>
                    <th className="text-center px-3 py-2 text-text-muted font-medium">{"נמענות"}</th>
                    <th className="text-center px-3 py-2 text-text-muted font-medium">{"נשלח"}</th>
                    <th className="text-center px-3 py-2 text-text-muted font-medium">{"נמסר"}</th>
                    <th className="text-center px-3 py-2 text-text-muted font-medium">{"נקרא"}</th>
                    <th className="text-center px-3 py-2 text-text-muted font-medium">{"נכשל"}</th>
                  </tr>
                </thead>
                <tbody>
                  {PAST_BROADCASTS.map((b) => (
                    <tr key={b.id} className="border-t border-gold/10">
                      <td className="px-3 py-3 text-text-primary whitespace-nowrap">{b.date}</td>
                      <td className="px-3 py-3 text-text-muted max-w-[200px] truncate">{b.preview}</td>
                      <td className="px-3 py-3 text-center">
                        <span className="badge-gold">{b.recipientsCount}</span>
                      </td>
                      <td className="px-3 py-3">
                        {renderStatBar(b.sent, b.recipientsCount, "bg-blue-500")}
                      </td>
                      <td className="px-3 py-3">
                        {renderStatBar(b.delivered, b.sent, "bg-emerald-500")}
                      </td>
                      <td className="px-3 py-3">
                        {renderStatBar(b.read, b.sent, "bg-gold")}
                      </td>
                      <td className="px-3 py-3">
                        {renderStatBar(b.failed, b.sent, "bg-red-500")}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Summary cards per broadcast */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
              {PAST_BROADCASTS.map((b) => (
                <div key={b.id} className="bg-bg-surface rounded-lg p-4 border border-gold/10">
                  <p className="text-xs text-text-muted mb-2">{b.date}</p>
                  <p className="text-sm text-text-primary mb-3 truncate">{b.preview}</p>
                  <div className="space-y-1.5">
                    <div className="flex justify-between text-xs">
                      <span className="text-text-muted flex items-center gap-1">
                        <Send className="w-3 h-3" />{"נשלח"}
                      </span>
                      <span className="text-blue-400">{b.sent}</span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-text-muted flex items-center gap-1">
                        <CheckCircle className="w-3 h-3" />{"נמסר"}
                      </span>
                      <span className="text-emerald-400">{b.delivered}</span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-text-muted flex items-center gap-1">
                        <Eye className="w-3 h-3" />{"נקרא"}
                      </span>
                      <span className="text-gold">{b.read}</span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-text-muted flex items-center gap-1">
                        <X className="w-3 h-3" />{"נכשל"}
                      </span>
                      <span className="text-red-400">{b.failed}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Tab: Message Log */}
        {activeTab === "log" && (
          <div className="space-y-4">
            <h3 className="text-sm font-heading text-text-primary mb-3 flex items-center gap-2">
              <MessageCircle className="w-4 h-4 text-gold" />
              {"לוג הודעות אחרון"}
            </h3>
            <div className="space-y-2 text-sm">
              {MESSAGE_LOGS.map((log, i) => (
                <div key={i} className="flex items-center justify-between p-3 bg-bg-surface rounded">
                  <div className="flex items-center gap-3">
                    <span className={`text-xs ${log.dir === "שליחה" ? "text-blue-600" : "text-emerald-600"}`}>
                      {log.dir}
                    </span>
                    <span className="text-text-muted">{log.phone}</span>
                    <span className="text-text-primary">{log.msg}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-text-muted text-xs">{log.time}</span>
                    <span className="text-xs text-emerald-600">{log.status}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
