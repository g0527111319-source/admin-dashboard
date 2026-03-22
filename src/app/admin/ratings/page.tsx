"use client";
import { useState } from "react";
import { Star, AlertTriangle, Send, TrendingDown } from "lucide-react";
import StarRating from "@/components/ui/StarRating";
const demoRatings = [
    {
        id: "1",
        supplierName: "סטון דיזיין",
        rating: 5,
        text: "שירות מעולה, אספקה בזמן, מחירים הוגנים. ממליצה בחום!",
        date: "2026-03-07",
        dealAmount: 12000,
    },
    {
        id: "2",
        supplierName: "אור תאורה",
        rating: 3,
        text: "מוצרים יפים אבל אספקה איטית מאוד. 3 שבועות המתנה.",
        date: "2026-03-05",
        dealAmount: 8500,
    },
    {
        id: "3",
        supplierName: "קיטשן פלוס",
        rating: 5,
        text: "הכי טובים בתחום! מטבח מושלם, התקנה מקצועית.",
        date: "2026-03-04",
        dealAmount: 45000,
    },
    {
        id: "4",
        supplierName: "אור תאורה",
        rating: 2,
        text: "בעיות באספקה ושירות לקוחות לא מגיב",
        date: "2026-03-01",
        dealAmount: 3200,
    },
];
const supplierAverages = [
    { name: "קיטשן פלוס", avg: 4.8, count: 18, trend: "up" },
    { name: "סטון דיזיין", avg: 4.5, count: 12, trend: "up" },
    { name: "אור תאורה", avg: 3.0, count: 6, trend: "down" },
];
export default function RatingsPage() {
    const [ratings] = useState(demoRatings);
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
        </div>
      </div>
    </div>);
}
