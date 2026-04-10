"use client";
import { useState, useEffect } from "react";
import { Star, AlertTriangle, Send, TrendingDown, Loader2 } from "lucide-react";
import StarRating from "@/components/ui/StarRating";

interface Rating {
    id: string;
    supplierName: string;
    rating: number;
    text: string;
    date: string;
    dealAmount: number;
}

interface SupplierAvg {
    name: string;
    avg: number;
    count: number;
    trend: string;
}

export default function RatingsPage() {
    const [ratings, setRatings] = useState<Rating[]>([]);
    const [supplierAverages, setSupplierAverages] = useState<SupplierAvg[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        setLoading(true);
        fetch("/api/ratings")
            .then((res) => { if (!res.ok) throw new Error("fetch failed"); return res.json(); })
            .then((data) => {
                if (data.ratings && Array.isArray(data.ratings)) {
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    setRatings(data.ratings.map((r: any) => ({
                        id: r.id,
                        supplierName: r.supplierName || "",
                        rating: r.rating || 0,
                        text: r.text || "",
                        date: r.date ? new Date(r.date).toISOString().slice(0, 10) : "",
                        dealAmount: r.dealAmount || 0,
                    })));
                }
                if (data.supplierAverages && Array.isArray(data.supplierAverages)) {
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    setSupplierAverages(data.supplierAverages.map((s: any) => ({
                        name: s.name || "",
                        avg: s.averageRating || 0,
                        count: s.ratingCount || 0,
                        trend: (s.averageRating || 0) >= 3 ? "up" : "down",
                    })));
                }
            })
            .catch(() => setError("שגיאה בטעינת דירוגים. נסו לרענן את הדף."))
            .finally(() => setLoading(false));
    }, []);
    if (loading) {
        return (
            <div className="flex items-center justify-center py-20 text-text-muted gap-2">
                <Loader2 className="w-6 h-6 animate-spin" />
                <span>טוען דירוגים...</span>
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

    return (<div className="space-y-6 animate-in">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-heading text-text-primary flex items-center gap-2">
          <Star className="w-7 h-7"/>{"דירוגים אנונימיים"}</h1>
        <p className="text-text-muted text-sm mt-1">{"דירוגים שמעצבות נותנות לספקים — רק את רואה את זה, תמר"}</p>
      </div>

      {/* Supplier Averages */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {supplierAverages.map((supplier) => (<div key={supplier.name} className={`card-static ${supplier.avg < 3 ? "border-red-500/30" : ""}`}>
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-heading text-text-primary">{supplier.name}</h3>
              {supplier.avg < 3 && (<AlertTriangle className="w-4 h-4 text-red-500"/>)}
            </div>
            <div className="flex items-center gap-2 mb-1">
              <StarRating rating={supplier.avg} size={16}/>
              <span className="text-gold font-mono font-bold">
                {supplier.avg.toFixed(1)}
              </span>
            </div>
            <p className="text-text-muted text-xs">
              {supplier.count}{"דירוגים"}{supplier.trend === "down" && (<span className="text-red-500 mr-2">
                  <TrendingDown className="w-3 h-3 inline"/>{"יורד"}</span>)}
            </p>
            {supplier.avg < 3 && (<button className="btn-outline text-xs mt-3 w-full flex items-center justify-center gap-1">
                <Send className="w-3 h-3"/>{"שלח feedback עלום לספק"}</button>)}
          </div>))}
      </div>

      {/* All Ratings */}
      <div className="card-static">
        <h2 className="text-lg font-heading text-text-primary mb-4">{"כל הדירוגים"}</h2>
        <div className="space-y-4">
          {ratings.map((r) => (<div key={r.id} className={`border-r-4 rounded-card p-4 bg-bg-surface ${r.rating <= 2
                ? "border-r-red-500"
                : r.rating <= 3
                    ? "border-r-yellow-500"
                    : "border-r-green-500"}`}>
              <div className="flex items-start justify-between mb-2">
                <div>
                  <p className="text-text-primary font-medium">{r.supplierName}</p>
                  <p className="text-text-muted text-xs">{"דירוג אנונימי | עסקה: ₪"}{r.dealAmount.toLocaleString()} | {r.date}
                  </p>
                </div>
                <StarRating rating={r.rating} size={14}/>
              </div>
              {r.text && (<p className="text-text-primary text-sm bg-bg-card rounded p-3 mt-2">
                  &ldquo;{r.text}&rdquo;
                </p>)}
            </div>))}
          {ratings.length === 0 && (
            <div className="text-center py-8 text-text-muted">
              <Star className="w-10 h-10 mx-auto mb-2 opacity-30" />
              <p>עדיין אין דירוגים</p>
            </div>
          )}
        </div>
      </div>
    </div>);
}
