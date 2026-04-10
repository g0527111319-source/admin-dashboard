"use client";
import { useState, useEffect, useCallback } from "react";
import { CalendarClock, Plus, X, ChevronLeft, ChevronRight, Clock, Loader2 } from "lucide-react";

interface Reservation {
    id: string;
    supplierId: string;
    supplierName: string;
    date: string; // YYYY-MM-DD
    time: string;
    notes?: string;
}

interface SupplierOption {
    id: string;
    name: string;
}

const timeSlots = ["10:30", "13:30", "20:30"];
const dayNames = ["ראשון", "שני", "שלישי", "רביעי", "חמישי", "שישי", "שבת"];

export default function ReservationsPage() {
    const [reservations, setReservations] = useState<Reservation[]>([]);
    const [suppliers, setSuppliers] = useState<SupplierOption[]>([]);
    const [currentDate, setCurrentDate] = useState(new Date());
    const [showAddModal, setShowAddModal] = useState(false);
    const [selectedSlot, setSelectedSlot] = useState<{
        date: string;
        time: string;
    } | null>(null);
    const [newReservation, setNewReservation] = useState({ supplierId: "", notes: "" });
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [submitting, setSubmitting] = useState(false);

    // Get the week starting from Sunday
    const getWeekDates = (date: Date) => {
        const start = new Date(date);
        const dayOfWeek = start.getDay();
        start.setDate(start.getDate() - dayOfWeek);
        const dates: Date[] = [];
        for (let i = 0; i < 7; i++) {
            const d = new Date(start);
            d.setDate(start.getDate() + i);
            dates.push(d);
        }
        return dates;
    };

    const weekDates = getWeekDates(currentDate);

    const formatDateStr = (d: Date) => {
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    };

    const weekStart = formatDateStr(weekDates[0]);

    // Fetch reservations for current week
    const fetchReservations = useCallback(async () => {
        try {
            setLoading(true);
            setError(null);
            const res = await fetch(`/api/admin/reservations?weekStart=${weekStart}`);
            if (!res.ok) {
                const data = await res.json().catch(() => ({}));
                throw new Error(data.error || "שגיאה בטעינת שריונים");
            }
            const data: Reservation[] = await res.json();
            setReservations(data);
        } catch (err) {
            setError(err instanceof Error ? err.message : "שגיאה בטעינת שריונים");
        } finally {
            setLoading(false);
        }
    }, [weekStart]);

    // Fetch suppliers on mount
    useEffect(() => {
        async function loadSuppliers() {
            try {
                const res = await fetch("/api/admin/suppliers/list");
                if (!res.ok) throw new Error("שגיאה בטעינת ספקים");
                const data: SupplierOption[] = await res.json();
                setSuppliers(data);
            } catch (err) {
                console.error("Failed to load suppliers:", err);
            }
        }
        loadSuppliers();
    }, []);

    // Fetch reservations when week changes
    useEffect(() => {
        fetchReservations();
    }, [fetchReservations]);

    const navigateWeek = (direction: number) => {
        const newDate = new Date(currentDate);
        newDate.setDate(newDate.getDate() + direction * 7);
        setCurrentDate(newDate);
    };

    const getReservation = (date: string, time: string) => {
        return reservations.find(r => r.date === date && r.time === time);
    };

    const handleOpenAddModal = (date: string, time: string) => {
        setSelectedSlot({ date, time });
        setNewReservation({ supplierId: "", notes: "" });
        setShowAddModal(true);
    };

    const handleAddReservation = async () => {
        if (!selectedSlot || !newReservation.supplierId) return;

        try {
            setSubmitting(true);
            const res = await fetch("/api/admin/reservations", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    supplierId: newReservation.supplierId,
                    date: selectedSlot.date,
                    time: selectedSlot.time,
                    notes: newReservation.notes || undefined,
                }),
            });

            if (!res.ok) {
                const data = await res.json().catch(() => ({}));
                alert(data.error || "שגיאה ביצירת שריון");
                return;
            }

            const created: Reservation = await res.json();
            setReservations(prev => [...prev, created]);
            setShowAddModal(false);
        } catch {
            alert("שגיאה ביצירת שריון");
        } finally {
            setSubmitting(false);
        }
    };

    const handleRemoveReservation = async (id: string) => {
        try {
            const res = await fetch(`/api/admin/reservations?id=${id}`, {
                method: "DELETE",
            });

            if (!res.ok) {
                const data = await res.json().catch(() => ({}));
                alert(data.error || "שגיאה במחיקת שריון");
                return;
            }

            setReservations(prev => prev.filter(r => r.id !== id));
        } catch {
            alert("שגיאה במחיקת שריון");
        }
    };

    const monthName = new Intl.DateTimeFormat("he-IL", { month: "long", year: "numeric" }).format(currentDate);

    return (<div className="space-y-6 animate-in">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-heading text-text-primary flex items-center gap-2">
            <CalendarClock className="w-7 h-7"/>{"שריון ספקים"}</h1>
          <p className="text-text-muted text-sm mt-1">{"לוח שנה לשריון ימי ושעות פרסום לספקים"}</p>
        </div>
      </div>

      {/* Error state */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-card p-4 text-red-700 text-sm">
          {error}
          <button onClick={fetchReservations} className="underline mr-2">{"נסה שוב"}</button>
        </div>
      )}

      {/* Week navigation */}
      <div className="card-static">
        <div className="flex items-center justify-between mb-4">
          <button onClick={() => navigateWeek(-1)} className="p-2 rounded-btn hover:bg-bg-surface text-text-muted hover:text-gold transition-colors">
            <ChevronRight className="w-5 h-5"/>
          </button>
          <h2 className="text-lg font-heading text-text-primary">{monthName}</h2>
          <button onClick={() => navigateWeek(1)} className="p-2 rounded-btn hover:bg-bg-surface text-text-muted hover:text-gold transition-colors">
            <ChevronLeft className="w-5 h-5"/>
          </button>
        </div>

        {/* Calendar Grid */}
        <div className="overflow-x-auto">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-6 h-6 animate-spin text-gold" />
              <span className="mr-2 text-text-muted text-sm">{"טוען שריונים..."}</span>
            </div>
          ) : (
          <table className="w-full border-collapse">
            <thead>
              <tr>
                <th className="text-right text-text-muted text-xs p-2 w-16">
                  <Clock className="w-4 h-4 inline"/>
                </th>
                {weekDates.map((date, i) => {
            const isToday = formatDateStr(date) === formatDateStr(new Date());
            return (<th key={i} className={`text-center p-2 ${isToday ? "bg-gold/10 rounded-t-lg" : ""}`}>
                      <div className="text-text-muted text-xs">{dayNames[date.getDay()]}</div>
                      <div className={`text-lg font-mono font-bold ${isToday ? "text-gold" : "text-text-primary"}`}>
                        {date.getDate()}
                      </div>
                    </th>);
        })}
              </tr>
            </thead>
            <tbody>
              {timeSlots.map((time) => (<tr key={time} className="border-t border-border-subtle">
                  <td className="text-text-muted text-xs p-2 font-mono">{time}</td>
                  {weekDates.map((date, i) => {
                const dateStr = formatDateStr(date);
                const reservation = getReservation(dateStr, time);
                const isToday = dateStr === formatDateStr(new Date());
                const isFriday = date.getDay() === 5;
                const isSaturday = date.getDay() === 6;
                return (<td key={i} className={`p-1 text-center min-w-[120px] ${isToday ? "bg-gold/5" : ""} ${isFriday || isSaturday ? "bg-gray-50" : ""}`}>
                        {reservation ? (<div className="bg-gold/10 border border-gold/30 rounded-lg p-2 text-xs relative group">
                            <button onClick={() => handleRemoveReservation(reservation.id)} className="absolute -top-1 -left-1 w-5 h-5 bg-red-500 text-white rounded-full
                                       opacity-0 group-hover:opacity-100 transition-opacity
                                       flex items-center justify-center">
                              <X className="w-3 h-3"/>
                            </button>
                            <p className="text-gold font-medium truncate">{reservation.supplierName}</p>
                            {reservation.notes && (<p className="text-text-muted text-[10px] truncate mt-0.5">{reservation.notes}</p>)}
                          </div>) : (<button onClick={() => handleOpenAddModal(dateStr, time)} className="w-full h-12 rounded-lg border border-dashed border-border-subtle
                                     hover:border-gold hover:bg-gold/5 transition-all
                                     flex items-center justify-center text-text-muted hover:text-gold">
                            <Plus className="w-4 h-4"/>
                          </button>)}
                      </td>);
            })}
                </tr>))}
            </tbody>
          </table>
          )}
        </div>
      </div>

      {/* Upcoming reservations list */}
      <div className="card-static">
        <h2 className="text-lg font-heading text-text-primary mb-4">{"שריונים קרובים"}</h2>
        <div className="space-y-2">
          {reservations.length === 0 && !loading && (
            <p className="text-text-muted text-sm text-center py-4">{"אין שריונים לשבוע זה"}</p>
          )}
          {reservations
            .sort((a, b) => a.date.localeCompare(b.date) || a.time.localeCompare(b.time))
            .slice(0, 10)
            .map((r) => (<div key={r.id} className="flex items-center gap-3 p-3 bg-bg-surface rounded-card">
                <div className="w-10 h-10 rounded-lg bg-gold/20 flex items-center justify-center text-gold text-sm font-bold">
                  {r.supplierName[0]}
                </div>
                <div className="flex-1">
                  <p className="text-text-primary font-medium text-sm">{r.supplierName}</p>
                  <p className="text-text-muted text-xs">
                    {r.date} | {r.time}
                    {r.notes && ` — ${r.notes}`}
                  </p>
                </div>
                <button onClick={() => handleRemoveReservation(r.id)} className="text-text-muted hover:text-red-500 transition-colors">
                  <X className="w-4 h-4"/>
                </button>
              </div>))}
        </div>
      </div>

      {/* Add Reservation Modal */}
      {showAddModal && selectedSlot && (<div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-border-subtle rounded-card p-6 max-w-md w-full">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-heading text-text-primary">{"שריון ספק"}</h3>
              <button onClick={() => setShowAddModal(false)} className="text-text-muted hover:text-gold">
                <X className="w-5 h-5"/>
              </button>
            </div>

            <p className="text-text-muted text-sm mb-4">
              {selectedSlot.date}{"| שעה"}{selectedSlot.time}
            </p>

            <div className="space-y-4">
              <div>
                <label className="block text-text-primary text-sm mb-1">{"ספק *"}</label>
                <select value={newReservation.supplierId} onChange={(e) => setNewReservation({ ...newReservation, supplierId: e.target.value })} className="select-field">
                  <option value="">{"בחר ספק"}</option>
                  {suppliers.map((s) => (<option key={s.id} value={s.id}>{s.name}</option>))}
                </select>
              </div>
              <div>
                <label className="block text-text-primary text-sm mb-1">{"הערות"}</label>
                <input type="text" value={newReservation.notes} onChange={(e) => setNewReservation({ ...newReservation, notes: e.target.value })} className="input-field" placeholder="פרסום קולקציה חדשה..."/>
              </div>
            </div>

            <div className="flex gap-2 mt-6">
              <button onClick={handleAddReservation} disabled={!newReservation.supplierId || submitting} className="btn-gold flex-1 disabled:opacity-50 disabled:cursor-not-allowed">
                {submitting ? "שומר..." : "שריין"}
              </button>
              <button onClick={() => setShowAddModal(false)} className="btn-outline flex-1">{"ביטול"}</button>
            </div>
          </div>
        </div>)}
    </div>);
}
