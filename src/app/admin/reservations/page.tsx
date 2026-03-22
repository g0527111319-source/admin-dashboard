"use client";
import { useState } from "react";
import { CalendarClock, Plus, X, ChevronLeft, ChevronRight, Clock, } from "lucide-react";
interface Reservation {
    id: string;
    supplierName: string;
    date: string; // YYYY-MM-DD
    time: string;
    notes?: string;
}
const demoReservations: Reservation[] = [
    { id: "r1", supplierName: "סטון דיזיין", date: "2026-03-12", time: "10:30", notes: "פרסום קולקציה חדשה" },
    { id: "r2", supplierName: "אור תאורה", date: "2026-03-12", time: "13:30" },
    { id: "r3", supplierName: "קיטשן פלוס", date: "2026-03-12", time: "20:30", notes: "מבצע חודשי" },
    { id: "r4", supplierName: "סטון דיזיין", date: "2026-03-15", time: "10:30" },
    { id: "r5", supplierName: "אור תאורה", date: "2026-03-16", time: "13:30", notes: "תמונות חדשות" },
];
const timeSlots = ["10:30", "13:30", "20:30"];
const dayNames = ["ראשון", "שני", "שלישי", "רביעי", "חמישי", "שישי", "שבת"];
const demoSuppliers = [
    { id: "1", name: "סטון דיזיין" },
    { id: "2", name: "אור תאורה" },
    { id: "3", name: "קיטשן פלוס" },
];
export default function ReservationsPage() {
    const [reservations, setReservations] = useState(demoReservations);
    const [currentDate, setCurrentDate] = useState(new Date(2026, 2, 9)); // March 9, 2026 (Mon)
    const [showAddModal, setShowAddModal] = useState(false);
    const [selectedSlot, setSelectedSlot] = useState<{
        date: string;
        time: string;
    } | null>(null);
    const [newReservation, setNewReservation] = useState({ supplierId: "", notes: "" });
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
    const navigateWeek = (direction: number) => {
        const newDate = new Date(currentDate);
        newDate.setDate(newDate.getDate() + direction * 7);
        setCurrentDate(newDate);
    };
    const formatDateStr = (d: Date) => {
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    };
    const getReservation = (date: string, time: string) => {
        return reservations.find(r => r.date === date && r.time === time);
    };
    const handleOpenAddModal = (date: string, time: string) => {
        setSelectedSlot({ date, time });
        setNewReservation({ supplierId: "", notes: "" });
        setShowAddModal(true);
    };
    const handleAddReservation = () => {
        if (!selectedSlot || !newReservation.supplierId)
            return;
        const supplier = demoSuppliers.find(s => s.id === newReservation.supplierId);
        if (!supplier)
            return;
        const newRes: Reservation = {
            id: `r${Date.now()}`,
            supplierName: supplier.name,
            date: selectedSlot.date,
            time: selectedSlot.time,
            notes: newReservation.notes || undefined,
        };
        setReservations(prev => [...prev, newRes]);
        setShowAddModal(false);
    };
    const handleRemoveReservation = (id: string) => {
        setReservations(prev => prev.filter(r => r.id !== id));
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
        </div>
      </div>

      {/* Upcoming reservations list */}
      <div className="card-static">
        <h2 className="text-lg font-heading text-text-primary mb-4">{"שריונים קרובים"}</h2>
        <div className="space-y-2">
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
                  {demoSuppliers.map((s) => (<option key={s.id} value={s.id}>{s.name}</option>))}
                </select>
              </div>
              <div>
                <label className="block text-text-primary text-sm mb-1">{"הערות"}</label>
                <input type="text" value={newReservation.notes} onChange={(e) => setNewReservation({ ...newReservation, notes: e.target.value })} className="input-field" placeholder="פרסום קולקציה חדשה..."/>
              </div>
            </div>

            <div className="flex gap-2 mt-6">
              <button onClick={handleAddReservation} disabled={!newReservation.supplierId} className="btn-gold flex-1 disabled:opacity-50 disabled:cursor-not-allowed">{"שריין"}</button>
              <button onClick={() => setShowAddModal(false)} className="btn-outline flex-1">{"ביטול"}</button>
            </div>
          </div>
        </div>)}
    </div>);
}
