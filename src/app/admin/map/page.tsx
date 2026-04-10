"use client";

import { useState, useMemo, useEffect, useCallback } from "react";
import { MapPin, Users, TrendingUp, DollarSign, Star, ChevronRight, Eye, Loader2, AlertTriangle } from "lucide-react";
import { formatCurrency } from "@/lib/utils";

/* ─── Types ─── */
interface Designer {
  id: number;
  name: string;
  region: string;
  deals: number;
  dealAmount: number;
  rating: number;
  activityLevel: "high" | "medium" | "low";
}

interface Region {
  id: string;
  name: string;
  path: string;
  baseColor: string;
  dotPositions: { x: number; y: number }[];
}

/* ─── Data is loaded from API ─── */

const regions: Region[] = [
  {
    id: "north",
    name: "צפון",
    path: "M100,10 L200,10 L210,50 L195,80 L180,100 L120,100 L100,75 L90,45 Z",
    baseColor: "#2a4a3a",
    dotPositions: [{ x: 145, y: 40 }, { x: 165, y: 65 }],
  },
  {
    id: "haifa",
    name: "חיפה",
    path: "M90,100 L120,100 L180,100 L185,130 L175,160 L110,160 L95,135 Z",
    baseColor: "#3a5c4a",
    dotPositions: [{ x: 135, y: 120 }, { x: 155, y: 140 }],
  },
  {
    id: "sharon",
    name: "שרון",
    path: "M85,160 L110,160 L175,160 L170,200 L160,230 L100,230 L88,195 Z",
    baseColor: "#4a6e5a",
    dotPositions: [{ x: 125, y: 185 }, { x: 148, y: 205 }],
  },
  {
    id: "tel-aviv",
    name: "תל אביב",
    path: "M80,230 L100,230 L155,230 L150,265 L140,295 L90,290 L78,260 Z",
    baseColor: "#5a8068",
    dotPositions: [{ x: 108, y: 250 }, { x: 125, y: 265 }, { x: 118, y: 280 }, { x: 135, y: 248 }],
  },
  {
    id: "center",
    name: "מרכז",
    path: "M155,230 L200,235 L210,275 L205,310 L150,305 L140,295 L150,265 Z",
    baseColor: "#4d7560",
    dotPositions: [{ x: 172, y: 255 }, { x: 185, y: 275 }, { x: 168, y: 290 }, { x: 190, y: 260 }],
  },
  {
    id: "shfela",
    name: "שפלה",
    path: "M78,290 L90,290 L140,295 L135,340 L125,370 L75,360 L70,325 Z",
    baseColor: "#3d6050",
    dotPositions: [{ x: 100, y: 320 }, { x: 118, y: 340 }],
  },
  {
    id: "jerusalem",
    name: "ירושלים",
    path: "M140,295 L150,305 L205,310 L210,350 L195,380 L135,375 L125,370 L135,340 Z",
    baseColor: "#4a6e5a",
    dotPositions: [{ x: 165, y: 330 }, { x: 178, y: 350 }],
  },
  {
    id: "south",
    name: "דרום",
    path: "M70,360 L75,360 L125,370 L135,375 L195,380 L200,420 L180,480 L160,540 L145,580 L130,560 L100,480 L80,420 Z",
    baseColor: "#2a4a3a",
    dotPositions: [{ x: 140, y: 420 }, { x: 150, y: 470 }],
  },
];

const activityColor = (level: Designer["activityLevel"]) =>
  level === "high" ? "#22c55e" : level === "medium" ? "#eab308" : "#ef4444";

const activityLabel = (level: Designer["activityLevel"]) =>
  level === "high" ? "פעיל" : level === "medium" ? "בינוני" : "לא פעיל";

/* ─── Page Component ─── */
export default function CommunityMapPage() {
  const [designers, setDesigners] = useState<Designer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedRegion, setSelectedRegion] = useState<string | null>(null);

  const fetchDesigners = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/map");
      if (!res.ok) throw new Error("שגיאה");
      const data = await res.json();
      setDesigners(data);
      setError(null);
    } catch {
      setError("שגיאה בטעינת נתוני מפה");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchDesigners(); }, [fetchDesigners]);

  const regionStats = useMemo(() => {
    return regions.map((region) => {
      const regionDesigners = designers.filter((d) => d.region === region.id);
      const totalDeals = regionDesigners.reduce((s, d) => s + d.dealAmount, 0);
      const avgRating =
        regionDesigners.length > 0
          ? regionDesigners.reduce((s, d) => s + d.rating, 0) / regionDesigners.length
          : 0;
      return {
        ...region,
        designers: regionDesigners,
        count: regionDesigners.length,
        totalDeals,
        avgRating,
      };
    });
  }, [designers]);

  const selectedData = useMemo(
    () => regionStats.find((r) => r.id === selectedRegion) ?? null,
    [selectedRegion, regionStats]
  );

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" dir="rtl">
        <div className="text-center">
          <Loader2 className="w-8 h-8 text-gold animate-spin mx-auto mb-3" />
          <p className="text-text-muted text-sm">טוען נתוני מפה...</p>
        </div>
      </div>
    );
  }
  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center" dir="rtl">
        <div className="text-center">
          <AlertTriangle className="w-8 h-8 text-red-400 mx-auto mb-3" />
          <p className="text-red-400 text-sm">{error}</p>
          <button onClick={fetchDesigners} className="btn-gold mt-4 px-4 py-2 rounded-lg text-sm">נסה שוב</button>
        </div>
      </div>
    );
  }

  return (
    <div className="animate-in space-y-6" dir="rtl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading text-2xl text-text-primary flex items-center gap-2">
            <MapPin className="text-gold" size={28} />
            מפת הקהילה
          </h1>
          <p className="text-text-muted mt-1">
            תצוגה גיאוגרפית של מעצבים ופעילות עסקית לפי אזור
          </p>
        </div>
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1.5 text-sm text-text-muted">
            <span className="w-2.5 h-2.5 rounded-full bg-green-500 inline-block" /> פעיל (10+)
          </span>
          <span className="flex items-center gap-1.5 text-sm text-text-muted">
            <span className="w-2.5 h-2.5 rounded-full bg-yellow-500 inline-block" /> בינוני (5-9)
          </span>
          <span className="flex items-center gap-1.5 text-sm text-text-muted">
            <span className="w-2.5 h-2.5 rounded-full bg-red-500 inline-block" /> לא פעיל (0-4)
          </span>
        </div>
      </div>

      {/* Main layout: Map + Sidebar */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* SVG Map */}
        <div className="lg:col-span-2 card-static p-6">
          <h2 className="font-heading text-lg text-text-primary mb-4 flex items-center gap-2">
            <Eye size={18} className="text-gold" />
            מפת ישראל — פיזור מעצבים
          </h2>
          <div className="flex justify-center">
            <svg
              viewBox="0 0 300 600"
              className="w-full max-w-[340px] h-auto"
              style={{ direction: "ltr" }}
            >
              {/* Region paths */}
              {regions.map((region) => {
                const isSelected = selectedRegion === region.id;
                const count = designers.filter((d) => d.region === region.id).length;
                const opacity = 0.5 + count * 0.1;
                return (
                  <g key={region.id}>
                    <path
                      d={region.path}
                      fill={region.baseColor}
                      fillOpacity={Math.min(opacity, 1)}
                      stroke={isSelected ? "#d4a853" : "#1a2e23"}
                      strokeWidth={isSelected ? 3 : 1.5}
                      className="cursor-pointer transition-all duration-200 hover:brightness-125"
                      onClick={() =>
                        setSelectedRegion(selectedRegion === region.id ? null : region.id)
                      }
                    />
                    {/* Designer dots */}
                    {region.dotPositions.map((pos, i) => {
                      const designer = designers.filter((d) => d.region === region.id)[i];
                      if (!designer) return null;
                      return (
                        <circle
                          key={i}
                          cx={pos.x}
                          cy={pos.y}
                          r={5}
                          fill={activityColor(designer.activityLevel)}
                          stroke="#0d1a13"
                          strokeWidth={1}
                          className="pointer-events-none"
                          opacity={0.9}
                        />
                      );
                    })}
                  </g>
                );
              })}

              {/* Region labels */}
              {regions.map((region) => {
                const pts = region.path.match(/[\d.]+/g)?.map(Number) ?? [];
                const xs = pts.filter((_, i) => i % 2 === 0);
                const ys = pts.filter((_, i) => i % 2 === 1);
                const cx = xs.reduce((a, b) => a + b, 0) / xs.length;
                const cy = ys.reduce((a, b) => a + b, 0) / ys.length;
                return (
                  <text
                    key={`label-${region.id}`}
                    x={cx}
                    y={cy}
                    textAnchor="middle"
                    dominantBaseline="middle"
                    fill="#e2d9c8"
                    fontSize={11}
                    fontWeight={600}
                    className="pointer-events-none select-none"
                    style={{ fontFamily: "inherit" }}
                  >
                    {region.name}
                  </text>
                );
              })}
            </svg>
          </div>
        </div>

        {/* Right sidebar — selected region detail OR area stats */}
        <div className="space-y-6">
          {/* Selected region panel */}
          {selectedData && (
            <div className="card-static p-5 border border-gold/30 animate-in">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-heading text-lg text-gold flex items-center gap-2">
                  <MapPin size={18} />
                  {selectedData.name}
                </h3>
                <button
                  onClick={() => setSelectedRegion(null)}
                  className="btn-outline text-xs px-2 py-1"
                >
                  סגור
                </button>
              </div>

              {/* Region summary stats */}
              <div className="grid grid-cols-3 gap-3 mb-5">
                <div className="text-center">
                  <Users size={16} className="text-gold mx-auto mb-1" />
                  <p className="text-lg font-bold text-text-primary">{selectedData.count}</p>
                  <p className="text-xs text-text-muted">מעצבים</p>
                </div>
                <div className="text-center">
                  <DollarSign size={16} className="text-gold mx-auto mb-1" />
                  <p className="text-lg font-bold text-text-primary">
                    {formatCurrency(selectedData.totalDeals)}
                  </p>
                  <p className="text-xs text-text-muted">סה״כ עסקאות</p>
                </div>
                <div className="text-center">
                  <Star size={16} className="text-gold mx-auto mb-1" />
                  <p className="text-lg font-bold text-text-primary">
                    {selectedData.avgRating.toFixed(1)}
                  </p>
                  <p className="text-xs text-text-muted">דירוג ממוצע</p>
                </div>
              </div>

              {/* Designer list */}
              <h4 className="text-sm font-semibold text-text-muted mb-2">מעצבים באזור</h4>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {selectedData.designers.map((d) => (
                  <div
                    key={d.id}
                    className="flex items-center justify-between bg-bg-surface rounded-lg px-3 py-2"
                  >
                    <div className="flex items-center gap-2">
                      <span
                        className="w-2.5 h-2.5 rounded-full inline-block"
                        style={{ backgroundColor: activityColor(d.activityLevel) }}
                      />
                      <span className="text-sm text-text-primary font-medium">{d.name}</span>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-text-muted">
                      <span>{d.deals} עסקאות</span>
                      <ChevronRight size={14} className="text-gold" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Area stats — always visible */}
          <div className="card-static p-5">
            <h3 className="font-heading text-lg text-text-primary mb-4 flex items-center gap-2">
              <TrendingUp size={18} className="text-gold" />
              סטטיסטיקות אזוריות
            </h3>
            <div className="overflow-hidden rounded-lg">
              <table className="table-luxury w-full text-sm">
                <thead>
                  <tr>
                    <th className="text-right px-3 py-2">אזור</th>
                    <th className="text-center px-3 py-2">מעצבים</th>
                    <th className="text-center px-3 py-2">נפח עסקאות</th>
                    <th className="text-center px-3 py-2">פעילות</th>
                  </tr>
                </thead>
                <tbody>
                  {regionStats.map((r) => {
                    const dominant =
                      r.designers.length === 0
                        ? "low"
                        : r.designers.filter((d) => d.activityLevel === "high").length >=
                            r.designers.length / 2
                          ? "high"
                          : r.designers.filter((d) => d.activityLevel === "low").length >=
                              r.designers.length / 2
                            ? "low"
                            : "medium";
                    return (
                      <tr
                        key={r.id}
                        className={`cursor-pointer transition-colors hover:bg-bg-surface ${
                          selectedRegion === r.id ? "bg-gold/10" : ""
                        }`}
                        onClick={() =>
                          setSelectedRegion(selectedRegion === r.id ? null : r.id)
                        }
                      >
                        <td className="px-3 py-2.5 font-medium text-text-primary flex items-center gap-2">
                          <MapPin size={14} className="text-gold" />
                          {r.name}
                        </td>
                        <td className="px-3 py-2.5 text-center text-text-muted">{r.count}</td>
                        <td className="px-3 py-2.5 text-center text-text-muted">
                          {formatCurrency(r.totalDeals)}
                        </td>
                        <td className="px-3 py-2.5 text-center">
                          <span className="inline-flex items-center gap-1.5">
                            <span
                              className="w-2.5 h-2.5 rounded-full inline-block"
                              style={{ backgroundColor: activityColor(dominant) }}
                            />
                            <span className="text-xs text-text-muted">
                              {activityLabel(dominant)}
                            </span>
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Totals */}
            <div className="mt-4 pt-3 border-t border-gold/10 flex items-center justify-between text-sm">
              <span className="text-text-muted">
                סה״כ: <span className="text-text-primary font-bold">{designers.length}</span> מעצבים
              </span>
              <span className="text-text-muted">
                נפח:{" "}
                <span className="text-gold font-bold">
                  {formatCurrency(designers.reduce((s, d) => s + d.dealAmount, 0))}
                </span>
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
