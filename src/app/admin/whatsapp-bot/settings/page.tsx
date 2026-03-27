"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Bot,
  Save,
  ArrowRight,
  Plus,
  Trash2,
  MessageSquare,
  Users,
  Shield,
  Settings,
  Ban,
  CheckCircle,
  Loader2,
} from "lucide-react";
import Link from "next/link";

// ==========================================
// Types
// ==========================================
interface PreparedResponse {
  id: string;
  trigger: string;
  response: string;
}

interface BotSettings {
  generalInstructions: string;
  roleInstructions: {
    designer: string;
    supplier: string;
    admin: string;
  };
  preparedResponses: PreparedResponse[];
  blockedWords: string;
  general: {
    botActive: boolean;
    maxMessagesPerDay: number;
    responseLanguage: string;
    botName: string;
    dailyCostLimit: number;
  };
}

// ==========================================
// Toast Component
// ==========================================
function Toast({
  message,
  type,
  onClose,
}: {
  message: string;
  type: "success" | "error";
  onClose: () => void;
}) {
  useEffect(() => {
    const timer = setTimeout(onClose, 3000);
    return () => clearTimeout(timer);
  }, [onClose]);

  return (
    <div
      className={`fixed top-6 left-1/2 -translate-x-1/2 z-50 px-6 py-3 rounded-lg shadow-xl border text-sm font-medium animate-in flex items-center gap-2 ${
        type === "success"
          ? "bg-emerald-500/20 border-emerald-500/40 text-emerald-300"
          : "bg-red-500/20 border-red-500/40 text-red-300"
      }`}
    >
      {type === "success" ? (
        <CheckCircle className="w-4 h-4" />
      ) : (
        <Ban className="w-4 h-4" />
      )}
      {message}
    </div>
  );
}

// ==========================================
// Main Component
// ==========================================
export default function WhatsAppBotSettingsPage() {
  const [settings, setSettings] = useState<BotSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [toast, setToast] = useState<{
    message: string;
    type: "success" | "error";
  } | null>(null);

  // Fetch settings
  const fetchSettings = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/whatsapp-bot/settings");
      if (!res.ok) throw new Error("Failed to fetch settings");
      const data = await res.json();
      setSettings(data);
    } catch {
      setToast({ message: "שגיאה בטעינת ההגדרות", type: "error" });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  // Save section
  const saveSection = async (
    sectionKey: string,
    data: Partial<BotSettings>
  ) => {
    setSaving(sectionKey);
    try {
      const res = await fetch("/api/admin/whatsapp-bot/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to save");
      const result = await res.json();
      setSettings(result.settings);
      setToast({ message: "ההגדרות נשמרו בהצלחה", type: "success" });
    } catch {
      setToast({ message: "שגיאה בשמירת ההגדרות", type: "error" });
    } finally {
      setSaving(null);
    }
  };

  // Add prepared response
  const addPreparedResponse = () => {
    if (!settings) return;
    const newResponse: PreparedResponse = {
      id: crypto.randomUUID(),
      trigger: "",
      response: "",
    };
    setSettings({
      ...settings,
      preparedResponses: [...settings.preparedResponses, newResponse],
    });
  };

  // Remove prepared response
  const removePreparedResponse = (id: string) => {
    if (!settings) return;
    setSettings({
      ...settings,
      preparedResponses: settings.preparedResponses.filter((r) => r.id !== id),
    });
  };

  // Update prepared response
  const updatePreparedResponse = (
    id: string,
    field: "trigger" | "response",
    value: string
  ) => {
    if (!settings) return;
    setSettings({
      ...settings,
      preparedResponses: settings.preparedResponses.map((r) =>
        r.id === id ? { ...r, [field]: value } : r
      ),
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 text-gold animate-spin" />
      </div>
    );
  }

  if (!settings) {
    return (
      <div className="text-center py-12 text-text-muted">
        {"שגיאה בטעינת ההגדרות"}
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in">
      {/* Toast */}
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 text-text-muted text-sm mb-2">
            <Link
              href="/admin/whatsapp-bot"
              className="hover:text-gold transition-colors"
            >
              {"בוט AI — וואטסאפ"}
            </Link>
            <ArrowRight className="w-3 h-3 rotate-180" />
            <span className="text-gold">{"הגדרות בוט"}</span>
          </div>
          <h1 className="text-2xl font-heading text-text-primary flex items-center gap-2">
            <Settings className="w-7 h-7 text-gold" />
            {"הגדרות בוט AI"}
          </h1>
          <p className="text-text-muted text-sm mt-1">
            {"עריכת הנחיות, תשובות מוכנות, ומילים חסומות"}
          </p>
        </div>
      </div>

      {/* ============================================ */}
      {/* Section 1: הנחיות כלליות לבוט */}
      {/* ============================================ */}
      <div className="card-static">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-heading text-text-primary flex items-center gap-2">
            <Bot className="w-5 h-5 text-gold" />
            {"הנחיות כלליות לבוט"}
          </h2>
          <button
            onClick={() =>
              saveSection("general-instructions", {
                generalInstructions: settings.generalInstructions,
              })
            }
            disabled={saving === "general-instructions"}
            className="btn-gold text-sm flex items-center gap-1.5"
          >
            {saving === "general-instructions" ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Save className="w-4 h-4" />
            )}
            {"שמור"}
          </button>
        </div>
        <p className="text-text-muted text-xs mb-3">
          {"הנחיות אלה ישפיעו על אישיות הבוט והתנהגותו הכללית בכל השיחות."}
        </p>
        <textarea
          value={settings.generalInstructions}
          onChange={(e) =>
            setSettings({ ...settings, generalInstructions: e.target.value })
          }
          className="input-dark w-full h-32 resize-y text-sm"
          dir="rtl"
          placeholder="הנחיות כלליות לבוט..."
        />
      </div>

      {/* ============================================ */}
      {/* Section 2: הנחיות לפי תפקיד */}
      {/* ============================================ */}
      <div className="card-static">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-heading text-text-primary flex items-center gap-2">
            <Users className="w-5 h-5 text-gold" />
            {"הנחיות לפי תפקיד"}
          </h2>
          <button
            onClick={() =>
              saveSection("role-instructions", {
                roleInstructions: settings.roleInstructions,
              })
            }
            disabled={saving === "role-instructions"}
            className="btn-gold text-sm flex items-center gap-1.5"
          >
            {saving === "role-instructions" ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Save className="w-4 h-4" />
            )}
            {"שמור"}
          </button>
        </div>

        <div className="space-y-4">
          {/* Designer */}
          <div className="bg-bg-surface rounded-lg p-4 border border-gold/10">
            <label className="text-sm font-bold text-text-primary flex items-center gap-2 mb-2">
              <span className="w-2 h-2 rounded-full bg-pink-400" />
              {"הנחיות למעצבות"}
            </label>
            <p className="text-text-muted text-xs mb-2">
              {"מה הבוט יכול/לא יכול לעשות עבור מעצבות"}
            </p>
            <textarea
              value={settings.roleInstructions.designer}
              onChange={(e) =>
                setSettings({
                  ...settings,
                  roleInstructions: {
                    ...settings.roleInstructions,
                    designer: e.target.value,
                  },
                })
              }
              className="input-dark w-full h-24 resize-y text-sm"
              dir="rtl"
            />
          </div>

          {/* Supplier */}
          <div className="bg-bg-surface rounded-lg p-4 border border-gold/10">
            <label className="text-sm font-bold text-text-primary flex items-center gap-2 mb-2">
              <span className="w-2 h-2 rounded-full bg-blue-400" />
              {"הנחיות לספקים"}
            </label>
            <p className="text-text-muted text-xs mb-2">
              {"מה הבוט יכול/לא יכול לעשות עבור ספקים"}
            </p>
            <textarea
              value={settings.roleInstructions.supplier}
              onChange={(e) =>
                setSettings({
                  ...settings,
                  roleInstructions: {
                    ...settings.roleInstructions,
                    supplier: e.target.value,
                  },
                })
              }
              className="input-dark w-full h-24 resize-y text-sm"
              dir="rtl"
            />
          </div>

          {/* Admin */}
          <div className="bg-bg-surface rounded-lg p-4 border border-gold/10">
            <label className="text-sm font-bold text-text-primary flex items-center gap-2 mb-2">
              <span className="w-2 h-2 rounded-full bg-purple-400" />
              {"הנחיות למנהלת"}
            </label>
            <p className="text-text-muted text-xs mb-2">
              {"מה הבוט עושה עבור מנהלת הקהילה"}
            </p>
            <textarea
              value={settings.roleInstructions.admin}
              onChange={(e) =>
                setSettings({
                  ...settings,
                  roleInstructions: {
                    ...settings.roleInstructions,
                    admin: e.target.value,
                  },
                })
              }
              className="input-dark w-full h-24 resize-y text-sm"
              dir="rtl"
            />
          </div>
        </div>
      </div>

      {/* ============================================ */}
      {/* Section 3: תשובות מוכנות */}
      {/* ============================================ */}
      <div className="card-static">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-heading text-text-primary flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-gold" />
            {"תשובות מוכנות"}
          </h2>
          <div className="flex items-center gap-2">
            <button
              onClick={addPreparedResponse}
              className="btn-outline text-sm flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4" />
              {"הוסף תשובה"}
            </button>
            <button
              onClick={() =>
                saveSection("prepared-responses", {
                  preparedResponses: settings.preparedResponses,
                })
              }
              disabled={saving === "prepared-responses"}
              className="btn-gold text-sm flex items-center gap-1.5"
            >
              {saving === "prepared-responses" ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Save className="w-4 h-4" />
              )}
              {"שמור"}
            </button>
          </div>
        </div>
        <p className="text-text-muted text-xs mb-4">
          {
            "תשובות מוכנות עוקפות את ה-AI כשההודעה מכילה את משפט ההפעלה. הבוט יחזיר את התשובה המוכנה ישירות."
          }
        </p>

        {settings.preparedResponses.length === 0 ? (
          <div className="text-center py-8 text-text-muted border border-dashed border-gold/20 rounded-lg">
            <MessageSquare className="w-10 h-10 mx-auto mb-2 opacity-30" />
            <p className="text-sm">{"אין תשובות מוכנות"}</p>
            <p className="text-xs mt-1">
              {"לחצי על 'הוסף תשובה' כדי להוסיף תשובה מוכנה ראשונה"}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {settings.preparedResponses.map((pair, index) => (
              <div
                key={pair.id}
                className="bg-bg-surface rounded-lg p-4 border border-gold/10"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 space-y-3">
                    <div>
                      <label className="text-xs text-text-muted mb-1 block">
                        {`משפט הפעלה #${index + 1}`}
                      </label>
                      <input
                        type="text"
                        value={pair.trigger}
                        onChange={(e) =>
                          updatePreparedResponse(
                            pair.id,
                            "trigger",
                            e.target.value
                          )
                        }
                        className="input-dark w-full text-sm"
                        dir="rtl"
                        placeholder='לדוגמה: "מה שעות הפעילות"'
                      />
                    </div>
                    <div>
                      <label className="text-xs text-text-muted mb-1 block">
                        {"תשובה"}
                      </label>
                      <textarea
                        value={pair.response}
                        onChange={(e) =>
                          updatePreparedResponse(
                            pair.id,
                            "response",
                            e.target.value
                          )
                        }
                        className="input-dark w-full h-20 resize-y text-sm"
                        dir="rtl"
                        placeholder="התשובה שהבוט יחזיר..."
                      />
                    </div>
                  </div>
                  <button
                    onClick={() => removePreparedResponse(pair.id)}
                    className="text-red-400 hover:text-red-300 p-2 rounded hover:bg-red-500/10 transition-colors flex-shrink-0"
                    title="מחק תשובה"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ============================================ */}
      {/* Section 4: מילים חסומות */}
      {/* ============================================ */}
      <div className="card-static">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-heading text-text-primary flex items-center gap-2">
            <Ban className="w-5 h-5 text-gold" />
            {"מילים חסומות"}
          </h2>
          <button
            onClick={() =>
              saveSection("blocked-words", {
                blockedWords: settings.blockedWords,
              })
            }
            disabled={saving === "blocked-words"}
            className="btn-gold text-sm flex items-center gap-1.5"
          >
            {saving === "blocked-words" ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Save className="w-4 h-4" />
            )}
            {"שמור"}
          </button>
        </div>
        <p className="text-text-muted text-xs mb-3">
          {
            "הבוט לא יענה להודעות שמכילות מילים אלה. הפרדה בפסיקים."
          }
        </p>
        <textarea
          value={settings.blockedWords}
          onChange={(e) =>
            setSettings({ ...settings, blockedWords: e.target.value })
          }
          className="input-dark w-full h-24 resize-y text-sm"
          dir="rtl"
          placeholder="מילה1, מילה2, ביטוי חסום..."
        />
      </div>

      {/* ============================================ */}
      {/* Section 5: הגדרות כלליות */}
      {/* ============================================ */}
      <div className="card-static">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-heading text-text-primary flex items-center gap-2">
            <Shield className="w-5 h-5 text-gold" />
            {"הגדרות כלליות"}
          </h2>
          <button
            onClick={() =>
              saveSection("general-settings", {
                general: settings.general,
              })
            }
            disabled={saving === "general-settings"}
            className="btn-gold text-sm flex items-center gap-1.5"
          >
            {saving === "general-settings" ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Save className="w-4 h-4" />
            )}
            {"שמור"}
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Bot Active Toggle */}
          <div className="bg-bg-surface rounded-lg p-4 border border-gold/10">
            <label className="flex items-center justify-between cursor-pointer">
              <div>
                <p className="text-sm font-bold text-text-primary">
                  {"בוט פעיל"}
                </p>
                <p className="text-xs text-text-muted mt-0.5">
                  {"הפעלה/השבתה של הבוט"}
                </p>
              </div>
              <button
                onClick={() =>
                  setSettings({
                    ...settings,
                    general: {
                      ...settings.general,
                      botActive: !settings.general.botActive,
                    },
                  })
                }
                className={`relative w-12 h-6 rounded-full transition-colors ${
                  settings.general.botActive
                    ? "bg-emerald-500"
                    : "bg-gray-600"
                }`}
              >
                <span
                  className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${
                    settings.general.botActive
                      ? "left-0.5"
                      : "left-[26px]"
                  }`}
                />
              </button>
            </label>
          </div>

          {/* Max Messages Per Day */}
          <div className="bg-bg-surface rounded-lg p-4 border border-gold/10">
            <label className="block">
              <p className="text-sm font-bold text-text-primary mb-1">
                {"מקסימום הודעות ליום למשתמש"}
              </p>
              <p className="text-xs text-text-muted mb-2">
                {"הגבלת מספר ההודעות שמשתמש יכול לשלוח ביום"}
              </p>
              <input
                type="number"
                value={settings.general.maxMessagesPerDay}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    general: {
                      ...settings.general,
                      maxMessagesPerDay: parseInt(e.target.value) || 100,
                    },
                  })
                }
                className="input-dark w-full text-sm"
                min={1}
                max={10000}
              />
            </label>
          </div>

          {/* Response Language */}
          <div className="bg-bg-surface rounded-lg p-4 border border-gold/10">
            <label className="block">
              <p className="text-sm font-bold text-text-primary mb-1">
                {"שפת מענה"}
              </p>
              <p className="text-xs text-text-muted mb-2">
                {"השפה בה הבוט יענה"}
              </p>
              <input
                type="text"
                value={settings.general.responseLanguage}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    general: {
                      ...settings.general,
                      responseLanguage: e.target.value,
                    },
                  })
                }
                className="input-dark w-full text-sm"
                dir="rtl"
              />
            </label>
          </div>

          {/* Bot Name */}
          <div className="bg-bg-surface rounded-lg p-4 border border-gold/10">
            <label className="block">
              <p className="text-sm font-bold text-text-primary mb-1">
                {"שם הבוט"}
              </p>
              <p className="text-xs text-text-muted mb-2">
                {"השם שהבוט ישתמש בו בשיחות"}
              </p>
              <input
                type="text"
                value={settings.general.botName}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    general: {
                      ...settings.general,
                      botName: e.target.value,
                    },
                  })
                }
                className="input-dark w-full text-sm"
                dir="rtl"
              />
            </label>
          </div>

          {/* Daily Cost Limit */}
          <div className="bg-bg-surface rounded-lg p-4 border border-gold/10">
            <label className="block">
              <p className="text-sm font-bold text-text-primary mb-1">
                {"מגבלת עלות יומית ($)"}
              </p>
              <p className="text-xs text-text-muted mb-2">
                {"מגבלת עלות יומית לשימוש ב-AI. כשהמגבלה נחצית, הבוט עובר למצב תשובות מוכנות."}
              </p>
              <input
                type="number"
                value={settings.general.dailyCostLimit ?? 5}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    general: {
                      ...settings.general,
                      dailyCostLimit: parseFloat(e.target.value) || 5,
                    },
                  })
                }
                className="input-dark w-full text-sm"
                min={0.5}
                max={100}
                step={0.5}
              />
            </label>
          </div>
        </div>
      </div>
    </div>
  );
}
