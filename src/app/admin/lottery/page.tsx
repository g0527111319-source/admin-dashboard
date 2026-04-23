"use client";
import { useState, useMemo, useEffect } from "react";
import {
  Trophy, Plus, Sparkles, UserPlus, UserMinus, Gift, Medal, X,
  Calendar, DollarSign, Users, Clock, ChevronDown, ChevronUp,
  MessageCircle, Award, Loader2, AlertTriangle,
} from "lucide-react";
import StatusBadge from "@/components/ui/StatusBadge";
import { formatCurrency } from "@/lib/utils";
import { openWhatsApp } from "@/lib/export-csv";

// ── Interfaces ──────────────────────────────────────────

interface LotteryWinner {
  rank: number;
  name: string;
}

interface LotteryData {
  id: string;
  month: string;
  prize: string;
  prizeValue: number;
  status: string;
  eligibleCount: number;
  numberOfWinners: number;
  winners: LotteryWinner[];
  drawnAt?: string;
  minDeals?: number;
  minAmount?: number;
}

interface EligibleDesigner {
  id: string;
  name: string;
  phone?: string;
  deals: number;
  amount: number;
}

// ── CSS-in-JS Animations ────────────────────────────────

const slotSpinStyle: React.CSSProperties = {
  animation: "slotSpin 0.1s linear infinite",
  display: "inline-block",
};

const slotSlowStyle: React.CSSProperties = {
  animation: "slotSpin 0.4s ease-out",
  display: "inline-block",
};

const confettiDot = (color: string, delay: string): React.CSSProperties => ({
  width: 8,
  height: 8,
  borderRadius: "50%",
  backgroundColor: color,
  animation: `confettiBurst 1.2s ease-in-out ${delay} infinite`,
  display: "inline-block",
});

const keyframesCSS = `
@keyframes slotSpin {
  0% { transform: translateY(-100%); opacity: 0; }
  20% { opacity: 1; }
  80% { opacity: 1; }
  100% { transform: translateY(100%); opacity: 0; }
}
@keyframes confettiBurst {
  0%, 100% { transform: scale(0.5); opacity: 0.3; }
  50% { transform: scale(1.5); opacity: 1; }
}
@keyframes winnerGlow {
  0%, 100% { box-shadow: 0 0 10px rgba(212,175,55,0.3); }
  50% { box-shadow: 0 0 30px rgba(212,175,55,0.8), 0 0 60px rgba(212,175,55,0.3); }
}
@keyframes slideDown {
  from { max-height: 0; opacity: 0; }
  to { max-height: 600px; opacity: 1; }
}
`;

// ── Data Mapper ─────────────────────────────────────────
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapLotteryFromApi(l: any): LotteryData {
  return {
    id: l.id,
    month: l.month || "",
    prize: l.prize || "",
    prizeValue: l.prizeValue || 0,
    status: l.status || "PREPARING",
    eligibleCount: l.eligibleDesigners?.length || 0,
    numberOfWinners: l.numberOfWinners || 1,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    winners: (l.winners || []).map((w: any) => ({
      rank: w.rank,
      name: w.designer?.fullName || "",
    })),
    drawnAt: l.drawnAt ? new Date(l.drawnAt).toISOString().slice(0, 10) : undefined,
    minDeals: l.minDealCount || undefined,
    minAmount: l.minDealAmount || undefined,
  };
}

const rankLabels: Record<number, string> = { 1: "מקום ראשון", 2: "מקום שני", 3: "מקום שלישי" };
const rankEmoji: Record<number, string> = { 1: "🥇", 2: "🥈", 3: "🥉" };
const confettiColors = ["#D4AF37", "#FFD700", "#FFA500", "#FF6347", "#9B59B6", "#3498DB", "#2ECC71", "#E74C3C"];

// ── Component ───────────────────────────────────────────
export default function LotteryPage() {
  const [lotteries, setLotteries] = useState<LotteryData[]>([]);
  const [eligibleDesigners, setEligibleDesigners] = useState<EligibleDesigner[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [isDrawing, setIsDrawing] = useState(false);
  const [drawPhase, setDrawPhase] = useState<"idle" | "spinning" | "slowing" | "done">("idle");
  const [drawnWinners, setDrawnWinners] = useState<LotteryWinner[]>([]);
  const [currentDrawName, setCurrentDrawName] = useState<string | null>(null);
  const [numberOfWinners, setNumberOfWinners] = useState(3);
  const [showWhatsApp, setShowWhatsApp] = useState(false);
  const [historyMonthFilter, setHistoryMonthFilter] = useState("all");
  const [expandedHistory, setExpandedHistory] = useState<string | null>(null);
  const [newPrize, setNewPrize] = useState("");
  const [newValue, setNewValue] = useState(0);
  const [newMinDeals, setNewMinDeals] = useState(1);
  const [newMinAmount, setNewMinAmount] = useState(5000);
  const [newWinnerCount, setNewWinnerCount] = useState(1);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      fetch("/api/lottery").then((r) => { if (!r.ok) throw new Error("fetch failed"); return r.json(); }),
      fetch("/api/designers").then((r) => { if (!r.ok) throw new Error("fetch failed"); return r.json(); }),
    ])
      .then(([lotteriesData, designersData]) => {
        if (Array.isArray(lotteriesData)) {
          setLotteries(lotteriesData.map(mapLotteryFromApi));
        }
        if (Array.isArray(designersData)) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          setEligibleDesigners(designersData.map((d: any) => ({
            id: d.id,
            name: d.fullName || "",
            phone: d.phone || d.whatsappPhone || "",
            deals: d.totalDealsReported || 0,
            amount: d.totalDealAmount || 0,
          })));
        }
      })
      .catch(() => setError("שגיאה בטעינת הגרלות. נסו לרענן את הדף."))
      .finally(() => setLoading(false));
  }, []);

  const currentLottery = lotteries.find((l) => l.status === "PREPARING");

  const completedLotteries = useMemo(() => {
    const done = lotteries.filter((l) => l.status === "COMPLETED");
    return historyMonthFilter === "all" ? done : done.filter((l) => l.month === historyMonthFilter);
  }, [lotteries, historyMonthFilter]);

  const availableMonths = useMemo(() => {
    const months = lotteries.filter((l) => l.status === "COMPLETED").map((l) => l.month);
    return Array.from(new Set(months)).sort().reverse();
  }, [lotteries]);

  const handleUpdateWinnerCount = (count: number) => {
    setNumberOfWinners(count);
    if (currentLottery) {
      setLotteries((prev) => prev.map((l) => l.id === currentLottery.id ? { ...l, numberOfWinners: count } : l));
    }
  };

  const handleCreateLottery = () => {
    if (!newPrize || newValue <= 0) return;
    const now = new Date();
    const month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
    setLotteries((prev) => [{
      id: String(prev.length + 1), month, prize: newPrize, prizeValue: newValue,
      status: "PREPARING", eligibleCount: eligibleDesigners.filter(
        (d) => d.deals >= newMinDeals && d.amount >= newMinAmount).length,
      numberOfWinners: newWinnerCount, winners: [], minDeals: newMinDeals, minAmount: newMinAmount,
    }, ...prev]);
    setShowCreateModal(false);
    setNewPrize(""); setNewValue(0); setNewMinDeals(1); setNewMinAmount(5000); setNewWinnerCount(1);
  };

  const handleDraw = () => {
    const count = currentLottery?.numberOfWinners || numberOfWinners;
    setIsDrawing(true); setDrawPhase("spinning"); setDrawnWinners([]); setShowWhatsApp(false);
    const pool = [...eligibleDesigners];
    const winners: LotteryWinner[] = [];
    let drawRound = 0, currentRank = 1, speed = 60;
    const interval = setInterval(() => {
      const idx = Math.floor(Math.random() * pool.length);
      setCurrentDrawName(pool[idx].name);
      drawRound++;
      if (drawRound > 10 && drawRound % 5 === 0 && currentRank <= count) {
        speed = Math.min(speed + 30, 300);
        setDrawPhase("slowing");
      }
      if (drawRound % 18 === 0 && currentRank <= count) {
        const wIdx = Math.floor(Math.random() * pool.length);
        winners.push({ rank: currentRank, name: pool[wIdx].name });
        pool.splice(wIdx, 1);
        setDrawnWinners([...winners]);
        currentRank++; speed = 60; setDrawPhase("spinning");
      }
      if (currentRank > count) {
        clearInterval(interval); setIsDrawing(false); setDrawPhase("done");
        setCurrentDrawName(null); setShowWhatsApp(true);
        if (currentLottery) {
          setLotteries((prev) => prev.map((l) => l.id === currentLottery.id
            ? { ...l, status: "COMPLETED", winners, drawnAt: new Date().toISOString().split("T")[0] } : l));
        }
      }
    }, speed);
  };

  const whatsAppMsg = (name: string, prize: string) =>
    `🎉 מזל טוב ${name}! זכית ב${prize} בהגרלה החודשית של קהילת זירת. נציגה שלנו תיצור איתך קשר בקרוב 💛`;

  const handleAddEligibleManually = () => {
    const name = prompt("שם המעצבת להוספה לרשימת הזכאיות:");
    if (!name || !name.trim()) return;
    const dealsStr = prompt("מספר עסקאות החודש (אופציונלי):", "1");
    const amountStr = prompt("סכום עסקאות ₪ (אופציונלי):", "0");
    const entry: EligibleDesigner = {
      id: `manual-${Date.now()}`,
      name: name.trim(),
      deals: Number(dealsStr) || 0,
      amount: Number(amountStr) || 0,
    };
    setEligibleDesigners((prev) => [...prev, entry]);
  };

  const handleRemoveEligible = (designer: EligibleDesigner) => {
    if (!confirm(`להסיר את ${designer.name} מרשימת הזכאיות?`)) return;
    setEligibleDesigners((prev) => prev.filter((d) => d.id !== designer.id));
  };

  const handleSendWinnerWhatsApp = () => {
    if (!currentLottery || drawnWinners.length === 0) return;
    for (const w of drawnWinners) {
      const designer = eligibleDesigners.find((d) => d.name === w.name);
      if (designer?.phone) {
        openWhatsApp(designer.phone, whatsAppMsg(w.name, currentLottery.prize));
      } else {
        alert(`אין מספר טלפון זמין עבור ${w.name} — יש לפנות ידנית.`);
      }
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20 text-text-muted gap-2">
        <Loader2 className="w-6 h-6 animate-spin" />
        <span>טוען הגרלות...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-20 text-red-400">
        <AlertTriangle className="w-10 h-10 mx-auto mb-3 opacity-60" />
        <p>{error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in">
      <style>{keyframesCSS}</style>

      {/* ── Header ─────────────────────────────────── */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-heading text-text-primary flex items-center gap-2">
            <Trophy className="w-7 h-7 text-gold" />ניהול הגרלות
          </h1>
          <p className="text-text-muted text-sm mt-1">הגרלות חודשיות למעצבות שדיווחו עסקאות</p>
        </div>
        <button onClick={() => setShowCreateModal(true)} className="btn-gold flex items-center gap-2 text-sm">
          <Plus className="w-4 h-4" />הגרלה חדשה
        </button>
      </div>

      {/* ── Create Lottery Modal ───────────────────── */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="card-static w-full max-w-lg relative animate-in">
            <button onClick={() => setShowCreateModal(false)}
              className="absolute top-4 left-4 text-text-muted hover:text-text-primary">
              <X className="w-5 h-5" />
            </button>
            <h2 className="text-xl font-heading text-text-primary flex items-center gap-2 mb-6">
              <Gift className="w-5 h-5 text-gold" />יצירת הגרלה חדשה
            </h2>
            <div className="space-y-4">
              <div>
                <label className="text-text-muted text-sm mb-1 block">שם הפרס</label>
                <input type="text" value={newPrize} onChange={(e) => setNewPrize(e.target.value)}
                  placeholder="לדוגמה: שובר מתנה ל-IKEA" className="input-dark w-full" />
              </div>
              <div>
                <label className="text-text-muted text-sm mb-1 flex items-center gap-1">
                  <DollarSign className="w-3 h-3" />שווי הפרס ₪
                </label>
                <input type="number" value={newValue || ""} onChange={(e) => setNewValue(Number(e.target.value))}
                  placeholder="500" className="input-dark w-full" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-text-muted text-sm mb-1 flex items-center gap-1">
                    <Award className="w-3 h-3" />מינימום עסקאות
                  </label>
                  <select value={newMinDeals} onChange={(e) => setNewMinDeals(Number(e.target.value))}
                    className="select-dark w-full">
                    {[1, 2, 3, 4, 5].map((n) => <option key={n} value={n}>{n} עסקאות</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-text-muted text-sm mb-1 flex items-center gap-1">
                    <DollarSign className="w-3 h-3" />מינימום סכום
                  </label>
                  <select value={newMinAmount} onChange={(e) => setNewMinAmount(Number(e.target.value))}
                    className="select-dark w-full">
                    {[5000, 8000, 10000, 15000, 20000].map((n) => (
                      <option key={n} value={n}>{formatCurrency(n)}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <label className="text-text-muted text-sm mb-1 block">מספר זוכות</label>
                <div className="flex items-center gap-3">
                  <button onClick={() => setNewWinnerCount(Math.max(1, newWinnerCount - 1))}
                    className="w-8 h-8 rounded-full bg-bg-surface border border-border-subtle text-text-primary hover:border-gold transition-colors">-</button>
                  <span className="text-gold font-mono text-2xl font-bold w-8 text-center">{newWinnerCount}</span>
                  <button onClick={() => setNewWinnerCount(Math.min(10, newWinnerCount + 1))}
                    className="w-8 h-8 rounded-full bg-bg-surface border border-border-subtle text-text-primary hover:border-gold transition-colors">+</button>
                </div>
              </div>
              <button onClick={handleCreateLottery} disabled={!newPrize || newValue <= 0}
                className="btn-gold w-full flex items-center justify-center gap-2 mt-4">
                <Sparkles className="w-4 h-4" />צור הגרלה
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Current Lottery ────────────────────────── */}
      {currentLottery && (
        <div className="card-static border-gold/50">
          <div className="flex items-center gap-2 mb-4">
            <Gift className="w-5 h-5 text-gold" />
            <h2 className="text-xl font-heading text-text-primary">הגרלת {currentLottery.month}</h2>
            <StatusBadge status={currentLottery.status} />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-bg-surface rounded-card p-4 text-center">
              <p className="text-text-muted text-sm flex items-center justify-center gap-1">
                <Gift className="w-3 h-3" />הפרס</p>
              <p className="text-gold font-heading text-lg font-bold">{currentLottery.prize}</p>
              <p className="text-text-muted text-xs">שווי: {formatCurrency(currentLottery.prizeValue)}</p>
            </div>
            <div className="bg-bg-surface rounded-card p-4 text-center">
              <p className="text-text-muted text-sm flex items-center justify-center gap-1">
                <Users className="w-3 h-3" />זכאיות</p>
              <p className="text-gold font-mono text-3xl font-bold">{currentLottery.eligibleCount}</p>
              <p className="text-text-muted text-xs">מעצבות</p>
            </div>
            <div className="bg-bg-surface rounded-card p-4 text-center">
              <p className="text-text-muted text-sm flex items-center justify-center gap-1">
                <Trophy className="w-3 h-3" />מספר זוכות</p>
              <div className="flex items-center justify-center gap-2 mt-1">
                <button onClick={() => handleUpdateWinnerCount(Math.max(1, numberOfWinners - 1))}
                  className="w-8 h-8 rounded-full bg-bg-card border border-border-subtle text-text-primary hover:border-gold transition-colors">-</button>
                <span className="text-gold font-mono text-3xl font-bold w-8 text-center">
                  {currentLottery.numberOfWinners}</span>
                <button onClick={() => handleUpdateWinnerCount(Math.min(10, numberOfWinners + 1))}
                  className="w-8 h-8 rounded-full bg-bg-card border border-border-subtle text-text-primary hover:border-gold transition-colors">+</button>
              </div>
            </div>
            <div className="bg-bg-surface rounded-card p-4 text-center">
              <p className="text-text-muted text-sm flex items-center justify-center gap-1">
                <Clock className="w-3 h-3" />סטטוס</p>
              <p className="text-yellow-400 font-bold mt-1">מוכן להגרלה</p>
              <p className="text-text-muted text-xs">
                מינ׳ {currentLottery.minDeals || 2} עסקאות / {formatCurrency(currentLottery.minAmount || 10000)}
              </p>
            </div>
          </div>

          {/* Eligible designers */}
          <div className="mb-6">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-text-primary font-heading flex items-center gap-1">
                <Users className="w-4 h-4 text-gold" />רשימת זכאיות</h3>
              <div className="flex gap-2">
                <button onClick={handleAddEligibleManually} className="btn-outline text-xs flex items-center gap-1">
                  <UserPlus className="w-3 h-3" />הוסף ידנית</button>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full table-luxury">
                <thead><tr><th>שם</th><th>עסקאות החודש</th><th>סכום כולל</th><th></th></tr></thead>
                <tbody>
                  {eligibleDesigners.map((d) => (
                    <tr key={d.id}>
                      <td className="text-gold">{d.name}</td>
                      <td className="font-mono">{d.deals}</td>
                      <td className="font-mono">{formatCurrency(d.amount)}</td>
                      <td>
                        <button
                          onClick={() => handleRemoveEligible(d)}
                          className="text-text-muted hover:text-red-400 transition-colors text-xs flex items-center gap-1"
                          title="הסר מהרשימה"
                        >
                          <UserMinus className="w-3 h-3" />הסר
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* ── Slot-Machine Draw ──────────────────── */}
          <div className="text-center">
            {drawnWinners.length > 0 && !isDrawing ? (
              <div className="space-y-4">
                <div className="flex justify-center gap-2 mb-2">
                  {confettiColors.map((c, i) => <span key={i} style={confettiDot(c, `${i * 0.15}s`)} />)}
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-2xl mx-auto">
                  {drawnWinners.map((w) => (
                    <div key={w.rank}
                      className={`border rounded-card p-6 animate-in ${
                        w.rank === 1 ? "bg-gold/10 border-gold"
                        : w.rank === 2 ? "bg-gray-100/5 border-gray-400"
                        : "bg-amber-50/5 border-amber-600"}`}
                      style={w.rank === 1 ? { animation: "winnerGlow 2s ease-in-out infinite" } : undefined}>
                      <div className="text-4xl mb-2">{rankEmoji[w.rank] || "🏆"}</div>
                      <p className="text-text-muted text-xs mb-1">{rankLabels[w.rank] || `מקום ${w.rank}`}</p>
                      <p className={`font-heading text-xl font-bold ${w.rank === 1 ? "text-gold" : "text-text-primary"}`}>
                        {w.name}</p>
                    </div>
                  ))}
                </div>
                <div className="flex justify-center gap-2 mt-2">
                  {confettiColors.slice().reverse().map((c, i) => (
                    <span key={i} style={confettiDot(c, `${i * 0.1 + 0.5}s`)} />
                  ))}
                </div>

                {/* ── WhatsApp Notification Preview ── */}
                {showWhatsApp && (
                  <div className="mt-6 space-y-3" style={{ animation: "slideDown 0.4s ease-out" }}>
                    <h3 className="text-text-primary font-heading flex items-center justify-center gap-2">
                      <MessageCircle className="w-5 h-5 text-green-500" />תבנית הודעת WhatsApp
                    </h3>
                    <div className="max-w-md mx-auto space-y-2">
                      {drawnWinners.map((w) => (
                        <div key={w.rank} className="bg-bg-surface rounded-card p-3 text-right text-sm">
                          <p className="text-text-muted text-xs mb-1">אל: {w.name}</p>
                          <p className="text-text-primary leading-relaxed">
                            {whatsAppMsg(w.name, currentLottery.prize)}</p>
                        </div>
                      ))}
                    </div>
                    <button onClick={handleSendWinnerWhatsApp} className="btn-gold flex items-center gap-2 mx-auto">
                      <MessageCircle className="w-4 h-4" />שלח הודעת WhatsApp
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-4">
                {isDrawing && currentDrawName && (
                  <div className="bg-gold/10 border border-gold/30 rounded-card p-6 inline-block min-w-[280px]">
                    <Medal className="w-8 h-8 text-gold mx-auto mb-2 animate-bounce" />
                    <div className="overflow-hidden h-12 flex items-center justify-center"
                      style={{ perspective: "200px" }}>
                      <p className="text-gold font-heading text-2xl font-bold"
                        style={drawPhase === "slowing" ? slotSlowStyle : slotSpinStyle}>
                        {currentDrawName}</p>
                    </div>
                    <p className="text-text-muted text-xs mt-2">
                      {drawPhase === "slowing" ? "מאט..." : "מגריל..."}</p>
                    {drawnWinners.length > 0 && (
                      <div className="mt-3 space-y-1 border-t border-gold/20 pt-3">
                        {drawnWinners.map((w) => (
                          <p key={w.rank} className="text-text-muted text-sm">
                            {rankEmoji[w.rank]} {w.name}</p>
                        ))}
                      </div>
                    )}
                  </div>
                )}
                <button onClick={handleDraw} disabled={isDrawing}
                  className={`btn-gold text-lg px-8 py-4 flex items-center gap-2 mx-auto ${isDrawing ? "animate-pulse" : ""}`}>
                  <Sparkles className="w-5 h-5" />
                  {isDrawing ? "מגריל..." : `הגרל ${currentLottery.numberOfWinners} זוכות!`}
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Stats Summary ─────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="card-static text-center">
          <Trophy className="w-6 h-6 text-gold mx-auto mb-2" />
          <p className="text-gold font-mono text-2xl font-bold">
            {lotteries.filter((l) => l.status === "COMPLETED").length}
          </p>
          <p className="text-text-muted text-xs">הגרלות שהושלמו</p>
        </div>
        <div className="card-static text-center">
          <DollarSign className="w-6 h-6 text-gold mx-auto mb-2" />
          <p className="text-gold font-mono text-2xl font-bold">
            {formatCurrency(
              lotteries
                .filter((l) => l.status === "COMPLETED")
                .reduce((sum, l) => sum + l.prizeValue, 0)
            )}
          </p>
          <p className="text-text-muted text-xs">סה״כ פרסים שחולקו</p>
        </div>
        <div className="card-static text-center">
          <Award className="w-6 h-6 text-gold mx-auto mb-2" />
          <p className="text-gold font-mono text-2xl font-bold">
            {lotteries
              .filter((l) => l.status === "COMPLETED")
              .reduce((sum, l) => sum + l.winners.length, 0)}
          </p>
          <p className="text-text-muted text-xs">זוכות בסה״כ</p>
        </div>
        <div className="card-static text-center">
          <Users className="w-6 h-6 text-gold mx-auto mb-2" />
          <p className="text-gold font-mono text-2xl font-bold">
            {eligibleDesigners.length}
          </p>
          <p className="text-text-muted text-xs">מעצבות זכאיות החודש</p>
        </div>
      </div>

      {/* ── History Table ──────────────────────────── */}
      <div className="card-static">
        <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
          <h2 className="text-xl font-heading text-text-primary flex items-center gap-2">
            <Calendar className="w-5 h-5 text-gold" />היסטוריית הגרלות
          </h2>
          <select value={historyMonthFilter} onChange={(e) => setHistoryMonthFilter(e.target.value)}
            className="select-dark text-sm">
            <option value="all">כל החודשים</option>
            {availableMonths.map((m) => <option key={m} value={m}>{m}</option>)}
          </select>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full table-luxury">
            <thead>
              <tr>
                <th>חודש</th><th>פרס</th><th>שווי</th><th>משתתפות</th>
                <th>זוכה/ות</th><th>תאריך הגרלה</th><th>סטטוס</th><th></th>
              </tr>
            </thead>
            <tbody>
              {completedLotteries.map((l) => (
                <>
                  <tr key={l.id}>
                    <td className="font-mono text-text-muted">{l.month}</td>
                    <td className="text-gold font-medium">{l.prize}</td>
                    <td className="font-mono">{formatCurrency(l.prizeValue)}</td>
                    <td className="font-mono text-center">{l.eligibleCount}</td>
                    <td>
                      {l.winners.map((w) => (
                        <span key={w.rank} className="inline-flex items-center gap-1 ml-2">
                          {rankEmoji[w.rank]} {w.name}</span>
                      ))}
                    </td>
                    <td className="text-text-muted text-sm">{l.drawnAt}</td>
                    <td><StatusBadge status={l.status} size="sm" /></td>
                    <td>
                      <button onClick={() => setExpandedHistory(expandedHistory === l.id ? null : l.id)}
                        className="text-text-muted hover:text-gold transition-colors">
                        {expandedHistory === l.id
                          ? <ChevronUp className="w-4 h-4" />
                          : <ChevronDown className="w-4 h-4" />}
                      </button>
                    </td>
                  </tr>
                  {expandedHistory === l.id && (
                    <tr key={`${l.id}-detail`}>
                      <td colSpan={8} className="!p-0">
                        <div className="bg-bg-surface p-4 space-y-2" style={{ animation: "slideDown 0.3s ease-out" }}>
                          <p className="text-text-muted text-sm">
                            <span className="text-text-primary font-medium">כללי זכאות:</span>{" "}
                            מינימום {l.minDeals || 1} עסקאות, סכום מינימלי {formatCurrency(l.minAmount || 5000)}
                          </p>
                          <div className="flex gap-4">
                            {l.winners.map((w) => (
                              <div key={w.rank} className="flex items-center gap-2 bg-bg-card rounded-card px-3 py-2">
                                <span className="text-lg">{rankEmoji[w.rank] || "🏆"}</span>
                                <div>
                                  <p className="text-text-primary text-sm font-medium">{w.name}</p>
                                  <p className="text-text-muted text-xs">{rankLabels[w.rank] || `מקום ${w.rank}`}</p>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </>
              ))}
            </tbody>
          </table>
        </div>
        {completedLotteries.length === 0 && (
          <div className="text-center py-8">
            <Trophy className="w-10 h-10 text-text-muted mx-auto mb-2 opacity-30" />
            <p className="text-text-muted text-sm">אין הגרלות להצגה בחודש זה</p>
          </div>
        )}
      </div>
    </div>
  );
}
