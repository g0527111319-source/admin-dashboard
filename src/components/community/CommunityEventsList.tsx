"use client";
// Designer-facing list of admin community events — open to every designer
// regardless of subscription tier. Renders the event card with the host
// supplier (logo + name + category) when one is attached, and a register /
// cancel button that triggers /api/events/[id]/register. On register the
// server-side handler also creates a CrmCalendarEvent so the entry shows up
// on the designer's calendar.

import { useCallback, useEffect, useState } from "react";
import {
  Calendar as CalendarIcon, MapPin, Users, Loader2, AlertTriangle,
  CheckCircle2, X as XIcon, Banknote, ExternalLink,
} from "lucide-react";
import { g } from "@/lib/gender";

interface SupplierLite {
  id: string;
  name: string;
  logo: string | null;
  category: string;
}

interface CommunityEvent {
  id: string;
  title: string;
  description: string | null;
  date: string;
  location: string | null;
  isPaid: boolean;
  price: number | null;
  maxAttendees: number | null;
  registered: number;
  status: string;
  imageUrl: string | null;
  supplier: SupplierLite | null;
}

function fmtDateTime(iso: string): string {
  const d = new Date(iso);
  return (
    d.toLocaleDateString("he-IL", { day: "numeric", month: "long", year: "numeric" }) +
    " · " +
    d.toLocaleTimeString("he-IL", { hour: "2-digit", minute: "2-digit" })
  );
}

interface Props {
  designerId: string;
  gender?: string;
}

export default function CommunityEventsList({ designerId, gender = "female" }: Props) {
  const [events, setEvents] = useState<CommunityEvent[]>([]);
  const [registeredIds, setRegisteredIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const reload = useCallback(async () => {
    setError(null);
    try {
      // Public list: every event with its host supplier embedded.
      const evRes = await fetch("/api/events?status=OPEN", { cache: "no-store" });
      if (!evRes.ok) throw new Error("failed events");
      const evData: CommunityEvent[] = await evRes.json();

      // Designer's calendar — used to detect which events she's already
      // registered for (we created a CrmCalendarEvent at register-time with
      // sourceEventId pointing at the Event row).
      const calRes = await fetch("/api/designer/crm/calendar", { cache: "no-store" });
      const calData: { id: string; sourceEventId?: string | null }[] = calRes.ok
        ? await calRes.json()
        : [];

      const registered = new Set<string>();
      for (const c of calData) {
        if (c.sourceEventId) registered.add(c.sourceEventId);
      }

      setEvents(evData);
      setRegisteredIds(registered);
    } catch {
      setError("שגיאה בטעינת אירועי הקהילה");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { reload(); }, [reload]);

  const register = async (eventId: string) => {
    setBusyId(eventId);
    try {
      const res = await fetch(`/api/events/${eventId}/register`, { method: "POST" });
      if (!res.ok) {
        const err = (await res.json().catch(() => ({}))) as { error?: string };
        alert(err.error || "שגיאה בהרשמה");
        return;
      }
      await reload();
    } finally {
      setBusyId(null);
    }
  };

  const cancel = async (eventId: string) => {
    if (!confirm("לבטל את ההרשמה לאירוע? הוא יוסר גם מהיומן שלך.")) return;
    setBusyId(eventId);
    try {
      const res = await fetch(`/api/events/${eventId}/register`, { method: "DELETE" });
      if (!res.ok) {
        const err = (await res.json().catch(() => ({}))) as { error?: string };
        alert(err.error || "שגיאה בביטול");
        return;
      }
      await reload();
    } finally {
      setBusyId(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16 text-text-muted gap-2">
        <Loader2 className="w-6 h-6 animate-spin" />
        <span>טוען אירועי קהילה...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="card-static text-center py-10 text-red-500">
        <AlertTriangle className="w-8 h-8 mx-auto mb-2 opacity-60" />
        <p>{error}</p>
      </div>
    );
  }

  // Surface only future / today events.
  const now = Date.now();
  const upcoming = events.filter((e) => new Date(e.date).getTime() >= now - 24 * 3600 * 1000);

  if (upcoming.length === 0) {
    return (
      <div className="card-static text-center py-12 text-text-muted">
        <CalendarIcon className="w-10 h-10 mx-auto mb-3 opacity-40" />
        <p>{g(gender, "אין אירועים פתוחים כרגע. נעדכן אותך כשיופיעו!", "אין אירועים פתוחים כרגע. נעדכן אותך כשיופיעו!")}</p>
      </div>
    );
  }

  // suppress unused-prop warning while keeping the prop for future expansion
  void designerId;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 animate-in">
      {upcoming.map((e) => {
        const isRegistered = registeredIds.has(e.id);
        const isFull = e.maxAttendees != null && e.registered >= e.maxAttendees;
        const isBusy = busyId === e.id;

        return (
          <div key={e.id} className="card-static hover-lift">
            {e.imageUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={e.imageUrl}
                alt={e.title}
                className="w-full h-40 object-cover rounded-card mb-3"
              />
            )}

            <div className="flex items-start justify-between gap-3">
              <div className="flex-1">
                <h3 className="text-lg font-heading text-text-primary">{e.title}</h3>
                {e.description && (
                  <p className="text-text-muted text-sm mt-1 line-clamp-2">{e.description}</p>
                )}
              </div>
              {isRegistered && (
                <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                  <CheckCircle2 className="w-3 h-3" /> {g(gender, "נרשמת", "נרשמת")}
                </span>
              )}
            </div>

            <div className="space-y-1.5 mt-3 text-sm text-text-primary">
              <div className="flex items-center gap-2">
                <CalendarIcon className="w-3.5 h-3.5 text-gold flex-shrink-0" />
                <span>{fmtDateTime(e.date)}</span>
              </div>
              {e.location && (
                <div className="flex items-center gap-2">
                  <MapPin className="w-3.5 h-3.5 text-gold flex-shrink-0" />
                  <span>{e.location}</span>
                </div>
              )}
              <div className="flex items-center gap-2">
                <Banknote className="w-3.5 h-3.5 text-gold flex-shrink-0" />
                <span>{e.isPaid ? `₪${(e.price ?? 0).toLocaleString("he-IL")}` : "חינם"}</span>
              </div>
              {e.maxAttendees != null && (
                <div className="flex items-center gap-2 text-text-muted text-xs">
                  <Users className="w-3 h-3" />
                  <span>{e.registered}/{e.maxAttendees} {g(gender, "נרשמו", "נרשמו")}</span>
                </div>
              )}
            </div>

            {/* Host supplier — if one is attached */}
            {e.supplier && (
              <div className="mt-3 flex items-center gap-3 bg-bg-surface/60 rounded-card p-2.5 border border-border/30">
                {e.supplier.logo ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={e.supplier.logo}
                    alt={e.supplier.name}
                    className="w-12 h-12 rounded object-contain bg-white p-1 flex-shrink-0"
                  />
                ) : (
                  <div className="w-12 h-12 rounded bg-gold/15 flex items-center justify-center text-gold font-bold flex-shrink-0">
                    {e.supplier.name[0]}
                  </div>
                )}
                <div className="text-xs">
                  <p className="text-text-muted">בחסות</p>
                  <p className="text-text-primary text-sm font-medium">{e.supplier.name}</p>
                  <p className="text-text-muted">{e.supplier.category}</p>
                </div>
                <a
                  href={`/suppliers-directory#${e.supplier.id}`}
                  className="ml-auto text-text-muted hover:text-gold transition-colors"
                  title="לפרופיל הספק"
                >
                  <ExternalLink className="w-4 h-4" />
                </a>
              </div>
            )}

            <div className="mt-4 pt-3 border-t border-border/30 flex items-center justify-end gap-2">
              {isRegistered ? (
                <button
                  onClick={() => cancel(e.id)}
                  disabled={isBusy}
                  className="btn-outline text-sm flex items-center gap-1 !border-red-300 !text-red-600 hover:!bg-red-50 disabled:opacity-50"
                >
                  {isBusy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <XIcon className="w-3.5 h-3.5" />}
                  בטל הרשמה
                </button>
              ) : (
                <button
                  onClick={() => register(e.id)}
                  disabled={isBusy || isFull}
                  className="btn-primary text-sm flex items-center gap-1 disabled:opacity-50"
                >
                  {isBusy && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  {isFull ? "האירוע מלא" : g(gender, "הירשם לאירוע", "הירשמי לאירוע")}
                </button>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
