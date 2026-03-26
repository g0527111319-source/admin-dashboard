"use client";
import { useState, useEffect, useCallback } from "react";
import {
  Bot, Wifi, WifiOff, RefreshCw, MessageCircle, Users,
  Shield, Clock, Activity, AlertTriangle, Search,
  Pause, Play, BarChart3, Send, Eye, Settings,
} from "lucide-react";
import Link from "next/link";

// ==========================================
// Types
// ==========================================
interface BotStatus {
  connected: boolean;
  instanceStatus: string;
  mockMode: boolean;
  messagesProcessed24h: number;
  activeConversations: number;
  inMemoryConversations: number;
  scheduledTasks: number;
  security: {
    activeRateLimits: number;
    blockedPhones: number;
  };
  timestamp: string;
}

interface AuditLogEntry {
  id: string;
  phone: string;
  userType: string;
  userId: string | null;
  direction: string;
  message: string;
  toolUsed: string | null;
  createdAt: string;
}

// ==========================================
// Component
// ==========================================
export default function WhatsAppBotPage() {
  const [status, setStatus] = useState<BotStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"overview" | "conversations" | "logs">("overview");
  const [recentLogs, setRecentLogs] = useState<AuditLogEntry[]>([]);
  const [searchQuery, setSearchQuery] = useState("");

  // Fetch status
  const fetchStatus = useCallback(async () => {
    try {
      const res = await fetch("/api/whatsapp/status");
      if (!res.ok) throw new Error("Failed to fetch status");
      const data = await res.json();
      setStatus(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "שגיאה בטעינת סטטוס");
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch audit logs
  const fetchLogs = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/whatsapp-bot/logs");
      if (res.ok) {
        const data = await res.json();
        setRecentLogs(data.logs || []);
      }
    } catch {
      // Logs endpoint may not exist yet
    }
  }, []);

  useEffect(() => {
    fetchStatus();
    fetchLogs();
    // Auto-refresh every 30 seconds
    const interval = setInterval(fetchStatus, 30_000);
    return () => clearInterval(interval);
  }, [fetchStatus, fetchLogs]);

  const filteredLogs = recentLogs.filter((log) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      log.phone.includes(q) ||
      log.message.toLowerCase().includes(q) ||
      log.userType.toLowerCase().includes(q) ||
      (log.toolUsed && log.toolUsed.toLowerCase().includes(q))
    );
  });

  // ==========================================
  // Tabs
  // ==========================================
  const tabs: { key: typeof activeTab; label: string; icon: React.ReactNode }[] = [
    { key: "overview", label: "סקירה כללית", icon: <BarChart3 className="w-4 h-4" /> },
    { key: "conversations", label: "שיחות", icon: <MessageCircle className="w-4 h-4" /> },
    { key: "logs", label: "לוג פעילות", icon: <Eye className="w-4 h-4" /> },
  ];

  return (
    <div className="space-y-6 animate-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-heading text-text-primary flex items-center gap-2">
            <Bot className="w-7 h-7 text-gold" />
            {"בוט AI — וואטסאפ"}
          </h1>
          <p className="text-text-muted text-sm mt-1">
            {"בוט חכם מבוסס Claude AI — עונה למעצבות וספקים אוטומטית"}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/admin/whatsapp-bot/settings"
            className="btn-gold text-sm flex items-center gap-1.5"
          >
            <Settings className="w-4 h-4" />
            {"הגדרות בוט"}
          </Link>
          <button
            onClick={() => { setLoading(true); fetchStatus(); }}
            disabled={loading}
            className="btn-outline text-sm flex items-center gap-1.5"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            {"רענן"}
          </button>
        </div>
      </div>

      {/* Error Banner */}
      {error && (
        <div className="card-static border border-red-500/30 bg-red-500/5">
          <div className="flex items-center gap-2 text-red-400">
            <AlertTriangle className="w-5 h-5" />
            <span className="text-sm">{error}</span>
          </div>
        </div>
      )}

      {/* Connection Status */}
      <div className={`card-static border ${
        status?.connected ? "border-emerald-500/30" : status?.mockMode ? "border-yellow-500/30" : "border-red-500/30"
      }`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {status?.connected ? (
              <Wifi className="w-8 h-8 text-emerald-500" />
            ) : status?.mockMode ? (
              <Activity className="w-8 h-8 text-yellow-400" />
            ) : (
              <WifiOff className="w-8 h-8 text-red-500" />
            )}
            <div>
              <p className={`font-bold ${
                status?.connected ? "text-emerald-500" : status?.mockMode ? "text-yellow-400" : "text-red-500"
              }`}>
                {loading ? "בודק..." : status?.connected ? "מחובר ופעיל" : status?.mockMode ? "מצב מדומה (Mock)" : "לא מחובר"}
              </p>
              <p className="text-text-muted text-xs">
                {status?.mockMode
                  ? "GREEN_API_INSTANCE_ID / GREEN_API_TOKEN לא מוגדרים — הודעות נרשמות לקונסול"
                  : status?.connected
                    ? `Green API Instance: ${status.instanceStatus}`
                    : "הגדר משתני סביבה לחיבור Green API"}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium ${
              status?.connected
                ? "bg-emerald-500/10 text-emerald-400"
                : status?.mockMode
                  ? "bg-yellow-500/10 text-yellow-400"
                  : "bg-red-500/10 text-red-400"
            }`}>
              <span className={`w-2 h-2 rounded-full ${
                status?.connected ? "bg-emerald-400 animate-pulse" : status?.mockMode ? "bg-yellow-400" : "bg-red-400"
              }`} />
              {status?.connected ? "Online" : status?.mockMode ? "Mock" : "Offline"}
            </span>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="card-static text-center">
          <Send className="w-5 h-5 text-gold mx-auto mb-2" />
          <p className="text-gold font-mono text-2xl font-bold">
            {status?.messagesProcessed24h ?? "—"}
          </p>
          <p className="text-text-muted text-xs">{"הודעות 24 שעות"}</p>
        </div>
        <div className="card-static text-center">
          <MessageCircle className="w-5 h-5 text-gold mx-auto mb-2" />
          <p className="text-gold font-mono text-2xl font-bold">
            {status?.activeConversations ?? "—"}
          </p>
          <p className="text-text-muted text-xs">{"שיחות פעילות"}</p>
        </div>
        <div className="card-static text-center">
          <Clock className="w-5 h-5 text-gold mx-auto mb-2" />
          <p className="text-gold font-mono text-2xl font-bold">
            {status?.scheduledTasks ?? "—"}
          </p>
          <p className="text-text-muted text-xs">{"משימות מתוזמנות"}</p>
        </div>
        <div className="card-static text-center">
          <Shield className="w-5 h-5 text-gold mx-auto mb-2" />
          <p className="text-gold font-mono text-2xl font-bold">
            {status?.security?.blockedPhones ?? "—"}
          </p>
          <p className="text-text-muted text-xs">{"מספרים חסומים"}</p>
        </div>
      </div>

      {/* AI Configuration */}
      <div className="card-static">
        <h2 className="text-lg font-heading text-text-primary mb-4 flex items-center gap-2">
          <Bot className="w-5 h-5 text-gold" />
          {"הגדרות הבוט"}
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-bg-surface rounded-lg p-4 border border-gold/10">
            <h3 className="text-sm font-bold text-text-primary mb-2">{"תפקידי משתמשים"}</h3>
            <div className="space-y-2 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-text-muted flex items-center gap-1.5">
                  <Users className="w-3.5 h-3.5" />
                  {"מעצבות"}
                </span>
                <span className="text-emerald-400 text-xs">{"דיווח עסקאות, דירוג ספקים, אישור הגעה"}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-text-muted flex items-center gap-1.5">
                  <Users className="w-3.5 h-3.5" />
                  {"ספקים"}
                </span>
                <span className="text-emerald-400 text-xs">{"אישור עסקאות, בדיקת פרסום"}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-text-muted flex items-center gap-1.5">
                  <Shield className="w-3.5 h-3.5" />
                  {"מנהלת"}
                </span>
                <span className="text-emerald-400 text-xs">{"גישה מלאה, שידורים, סטטיסטיקות"}</span>
              </div>
            </div>
          </div>

          <div className="bg-bg-surface rounded-lg p-4 border border-gold/10">
            <h3 className="text-sm font-bold text-text-primary mb-2">{"אבטחה"}</h3>
            <div className="space-y-2 text-sm">
              <p className="text-text-muted flex items-center gap-1.5">
                <Shield className="w-3.5 h-3.5 text-emerald-400" />
                {"30 הודעות/דקה למשתמש"}
              </p>
              <p className="text-text-muted flex items-center gap-1.5">
                <Shield className="w-3.5 h-3.5 text-emerald-400" />
                {"20 הודעות/דקה שליחה (Green API)"}
              </p>
              <p className="text-text-muted flex items-center gap-1.5">
                <Shield className="w-3.5 h-3.5 text-emerald-400" />
                {"סינון הזרקת פרומפט"}
              </p>
              <p className="text-text-muted flex items-center gap-1.5">
                <Shield className="w-3.5 h-3.5 text-emerald-400" />
                {"לוג ביקורת מלא"}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Environment Variables Status */}
      <div className="card-static">
        <h2 className="text-lg font-heading text-text-primary mb-4 flex items-center gap-2">
          <Activity className="w-5 h-5 text-gold" />
          {"סטטוס משתני סביבה"}
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <EnvStatus name="GREEN_API_INSTANCE_ID" status={!status?.mockMode} />
          <EnvStatus name="GREEN_API_TOKEN" status={!status?.mockMode} />
          <EnvStatus name="ANTHROPIC_API_KEY" status={status !== null && !status.mockMode} hint="נדרש ל-Claude AI" />
          <EnvStatus name="ADMIN_WHATSAPP_PHONES" status={true} hint="טלפונים מופרדים בפסיק" />
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

        {/* Tab: Overview */}
        {activeTab === "overview" && (
          <div className="space-y-4">
            <h3 className="text-sm font-heading text-text-primary flex items-center gap-2">
              <Bot className="w-4 h-4 text-gold" />
              {"כלים זמינים לבוט"}
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {[
                { name: "report_deal", label: "דיווח עסקה", role: "מעצבת", icon: "💰" },
                { name: "rate_supplier", label: "דירוג ספק", role: "מעצבת", icon: "⭐" },
                { name: "confirm_deal", label: "אישור עסקה", role: "ספק", icon: "✅" },
                { name: "check_post_requirements", label: "בדיקת פרסום", role: "ספק", icon: "📋" },
                { name: "confirm_event_attendance", label: "אישור הגעה", role: "מעצבת", icon: "📅" },
                { name: "get_my_deals", label: "העסקאות שלי", role: "מעצבת/ספק", icon: "📊" },
                { name: "get_community_suppliers", label: "ספקי הקהילה", role: "מעצבת", icon: "🏢" },
                { name: "admin_broadcast", label: "שידור", role: "מנהלת", icon: "📤" },
                { name: "admin_get_stats", label: "סטטיסטיקות", role: "מנהלת", icon: "📈" },
                { name: "admin_create_event", label: "יצירת אירוע", role: "מנהלת", icon: "🎪" },
                { name: "admin_get_all_info", label: "חיפוש מידע", role: "מנהלת", icon: "🔍" },
              ].map((tool) => (
                <div key={tool.name} className="flex items-center justify-between p-3 bg-bg-surface rounded border border-gold/10">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">{tool.icon}</span>
                    <div>
                      <p className="text-sm text-text-primary font-medium">{tool.label}</p>
                      <p className="text-xs text-text-muted font-mono">{tool.name}</p>
                    </div>
                  </div>
                  <span className="badge-gold text-[10px]">{tool.role}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Tab: Conversations */}
        {activeTab === "conversations" && (
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Search className="w-4 h-4 text-text-muted" />
              <input
                type="text"
                placeholder="חיפוש לפי טלפון, סוג משתמש..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="input-dark text-sm flex-1"
                dir="rtl"
              />
            </div>

            {status?.inMemoryConversations === 0 ? (
              <div className="text-center py-8 text-text-muted">
                <MessageCircle className="w-12 h-12 mx-auto mb-3 opacity-30" />
                <p className="text-sm">{"אין שיחות פעילות כרגע"}</p>
                <p className="text-xs mt-1">{"שיחות יופיעו כאן כשמשתמשים ישלחו הודעות לבוט"}</p>
              </div>
            ) : (
              <div className="text-center py-8 text-text-muted">
                <MessageCircle className="w-12 h-12 mx-auto mb-3 opacity-30" />
                <p className="text-sm">{`${status?.inMemoryConversations || 0} שיחות בזיכרון`}</p>
                <p className="text-xs mt-1">{"פרטי שיחות זמינים בלוג הביקורת"}</p>
              </div>
            )}
          </div>
        )}

        {/* Tab: Activity Log */}
        {activeTab === "logs" && (
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Search className="w-4 h-4 text-text-muted" />
              <input
                type="text"
                placeholder="חיפוש בלוג..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="input-dark text-sm flex-1"
                dir="rtl"
              />
            </div>

            {filteredLogs.length === 0 ? (
              <div className="text-center py-8 text-text-muted">
                <Eye className="w-12 h-12 mx-auto mb-3 opacity-30" />
                <p className="text-sm">{"אין רשומות בלוג"}</p>
                <p className="text-xs mt-1">{"פעילות הבוט תתועד כאן אוטומטית"}</p>
              </div>
            ) : (
              <div className="space-y-2 text-sm">
                {filteredLogs.map((log) => (
                  <div key={log.id} className="flex items-center justify-between p-3 bg-bg-surface rounded border border-gold/10">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <span className={`text-xs px-2 py-0.5 rounded ${
                        log.direction === "inbound"
                          ? "bg-blue-500/10 text-blue-400"
                          : "bg-emerald-500/10 text-emerald-400"
                      }`}>
                        {log.direction === "inbound" ? "נכנס" : "יוצא"}
                      </span>
                      <span className="text-text-muted text-xs">{log.phone.slice(0, 3)}***{log.phone.slice(-4)}</span>
                      <span className={`badge-gold text-[10px] ${
                        log.userType === "admin" ? "!bg-purple-500/20 !text-purple-300" :
                        log.userType === "supplier" ? "!bg-blue-500/20 !text-blue-300" : ""
                      }`}>
                        {log.userType}
                      </span>
                      <span className="text-text-primary truncate">{log.message.substring(0, 60)}</span>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {log.toolUsed && (
                        <span className="text-xs text-gold bg-gold/10 px-2 py-0.5 rounded">
                          {log.toolUsed}
                        </span>
                      )}
                      <span className="text-text-muted text-xs whitespace-nowrap">
                        {new Date(log.createdAt).toLocaleTimeString("he-IL", { hour: "2-digit", minute: "2-digit" })}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Webhook URL Info */}
      <div className="card-static">
        <h2 className="text-lg font-heading text-text-primary mb-3 flex items-center gap-2">
          <Activity className="w-5 h-5 text-gold" />
          {"הגדרת Green API"}
        </h2>
        <div className="bg-bg-surface rounded-lg p-4 border border-gold/10 space-y-3">
          <div>
            <p className="text-xs text-text-muted mb-1">{"Webhook URL (הגדר ב-Green API):"}</p>
            <code className="text-sm text-gold bg-gold/5 px-3 py-1.5 rounded block" dir="ltr">
              {"https://your-domain.com/api/whatsapp/webhook"}
            </code>
          </div>
          <div>
            <p className="text-xs text-text-muted mb-1">{"משתני סביבה נדרשים:"}</p>
            <code className="text-xs text-text-muted bg-bg-surface px-3 py-1.5 rounded block space-y-1 leading-relaxed" dir="ltr">
              {"GREEN_API_INSTANCE_ID=your_instance_id"}<br />
              {"GREEN_API_TOKEN=your_api_token"}<br />
              {"ANTHROPIC_API_KEY=your_claude_api_key"}<br />
              {"ADMIN_WHATSAPP_PHONES=972521234567,972541234567"}
            </code>
          </div>
        </div>
      </div>
    </div>
  );
}

// ==========================================
// Helper Components
// ==========================================

function EnvStatus({
  name,
  status,
  hint,
}: {
  name: string;
  status: boolean;
  hint?: string;
}) {
  return (
    <div className={`flex items-center gap-2 p-3 rounded border ${
      status ? "border-emerald-500/20 bg-emerald-500/5" : "border-red-500/20 bg-red-500/5"
    }`}>
      {status ? (
        <Play className="w-4 h-4 text-emerald-400" />
      ) : (
        <Pause className="w-4 h-4 text-red-400" />
      )}
      <div className="min-w-0">
        <p className="text-xs font-mono text-text-primary truncate">{name}</p>
        {hint && <p className="text-[10px] text-text-muted">{hint}</p>}
      </div>
      <span className={`text-[10px] px-1.5 py-0.5 rounded mr-auto ${
        status ? "bg-emerald-500/20 text-emerald-400" : "bg-red-500/20 text-red-400"
      }`}>
        {status ? "OK" : "Missing"}
      </span>
    </div>
  );
}
