"use client";
import { useState, useMemo, useEffect } from "react";
import {
  Calendar, Plus, MapPin, Users, CreditCard, CheckCircle, Send, Download,
  X, Clock, ChevronDown, ChevronUp, Camera, Star, Bell, Edit3, Eye, Trash2, Image,
  Loader2, AlertTriangle as AlertTriangleIcon,
} from "lucide-react";
import StatusBadge from "@/components/ui/StatusBadge";
import { formatDateTime, formatCurrency } from "@/lib/utils";
import { TwistButton } from "@/components/ds";

/* ─── Types ─── */
interface Attendee {
  name: string;
  phone: string;
  registeredAt: string;
  payment: "paid" | "pending" | "free";
}

interface EventItem {
  id: string;
  title: string;
  description: string;
  date: string;
  location: string;
  type: string;
  isPaid: boolean;
  price: number | null;
  maxAttendees: number;
  registered: number;
  paid: number;
  status: string;
  imageUrl: string | null;
  attendees: Attendee[];
  reminders: { week: boolean; day: boolean; hour: boolean };
  survey?: { satisfaction: number; attendanceRate: number };
  feedbackQuotes?: string[];
}

type TabKey = "upcoming" | "past" | "create";

/* ─── Data Mapper ─── */
const TODAY = new Date().toISOString().slice(0, 10);

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapEventFromApi(e: any): EventItem {
  const eventDate = e.date ? new Date(e.date).toISOString() : "";
  const isPast = eventDate.slice(0, 10) < TODAY;
  return {
    id: e.id,
    title: e.title || "",
    description: e.description || "",
    date: eventDate,
    location: e.location || "",
    type: "",
    isPaid: e.isPaid ?? false,
    price: e.price ?? null,
    maxAttendees: e.maxAttendees || 0,
    registered: e.registered || 0,
    paid: e.paid || 0,
    status: e.status || "DRAFT",
    imageUrl: e.imageUrl || null,
    attendees: [],
    reminders: { week: false, day: false, hour: false },
    ...(isPast && e.status === "CLOSED" ? { survey: { satisfaction: 0, attendanceRate: 0 }, feedbackQuotes: [] } : {}),
  };
}

const _unusedDemoEvents: EventItem[] = [
  {
    id: "1",
    title: "סדנת חומרים חדשים 2026",
    description: "סדנה מעשית להכרת חומרי גמר חדשניים — עם טקטורה, חברת חומרים מובילה",
    date: "2026-04-10T18:00:00",
    location: "חלל סטודיו TLV, יפו 33, תל אביב",
    type: "סדנה",
    isPaid: true,
    price: 120,
    maxAttendees: 40,
    registered: 28,
    paid: 25,
    status: "OPEN",
    imageUrl: null,
    reminders: { week: true, day: true, hour: false },
    attendees: [
      { name: "תמר כהן", phone: "050-1234567", registeredAt: "2026-03-01", payment: "paid" },
      { name: "נועה לוי", phone: "052-9876543", registeredAt: "2026-03-02", payment: "paid" },
      { name: "רונית אברהם", phone: "054-5551234", registeredAt: "2026-03-03", payment: "pending" },
      { name: "שירה מזרחי", phone: "050-7778899", registeredAt: "2026-03-04", payment: "paid" },
      { name: "ענת גולדשטיין", phone: "053-1112233", registeredAt: "2026-03-05", payment: "paid" },
      { name: "מיכל ברק", phone: "058-4445566", registeredAt: "2026-03-06", payment: "pending" },
    ],
  },
  {
    id: "2",
    title: "מפגש נטוורקינג — מעצבות x ספקים",
    description: "ערב פתוח להיכרות בין מעצבות לספקי הקהילה. אווירה, יין, והרבה קשרים חדשים",
    date: "2026-04-22T19:00:00",
    location: "גלריה 12, דרך חברון 12, ירושלים",
    type: "נטוורקינג",
    isPaid: false,
    price: null,
    maxAttendees: 60,
    registered: 42,
    paid: 0,
    status: "OPEN",
    imageUrl: null,
    reminders: { week: false, day: true, hour: true },
    attendees: [
      { name: "דנה רוזנפלד", phone: "050-2223344", registeredAt: "2026-03-10", payment: "free" },
      { name: "אורית שפירא", phone: "052-6667788", registeredAt: "2026-03-11", payment: "free" },
      { name: "הילה פרידמן", phone: "054-3334455", registeredAt: "2026-03-12", payment: "free" },
      { name: "יעל דוד", phone: "050-8889900", registeredAt: "2026-03-13", payment: "free" },
      { name: "ליאת חן", phone: "053-5556677", registeredAt: "2026-03-14", payment: "free" },
    ],
  },
  {
    id: "3",
    title: "סמינר תאורה — מאסטרקלאס",
    description: "סמינר מקצועי בן יום שלם על תכנון תאורה בפרויקטי יוקרה",
    date: "2026-05-05T09:00:00",
    location: "מלון דן כרמל, חיפה",
    type: "סמינר",
    isPaid: true,
    price: 280,
    maxAttendees: 30,
    registered: 18,
    paid: 16,
    status: "OPEN",
    imageUrl: null,
    reminders: { week: true, day: false, hour: false },
    attendees: [
      { name: "רחל ביטון", phone: "050-1119988", registeredAt: "2026-03-20", payment: "paid" },
      { name: "סיגל אלון", phone: "052-4443322", registeredAt: "2026-03-21", payment: "paid" },
      { name: "אפרת נחמיאס", phone: "054-7776655", registeredAt: "2026-03-22", payment: "pending" },
      { name: "קרן וולף", phone: "050-6665544", registeredAt: "2026-03-23", payment: "paid" },
      { name: "מירב טל", phone: "053-2221100", registeredAt: "2026-03-24", payment: "paid" },
    ],
  },
  {
    id: "4",
    title: "סיור מפעלי קרמיקה — צפון",
    description: "סיור מקצועי במפעלי קרמיקה בצפון הארץ, כולל הדגמות ייצור",
    date: "2026-05-15T08:00:00",
    location: "נקודת מפגש: תחנת רכבת חיפה מרכזית",
    type: "סיור",
    isPaid: true,
    price: 180,
    maxAttendees: 25,
    registered: 22,
    paid: 20,
    status: "OPEN",
    imageUrl: null,
    reminders: { week: true, day: true, hour: true },
    attendees: [
      { name: "גלית הראל", phone: "050-3332211", registeredAt: "2026-04-01", payment: "paid" },
      { name: "עדי שלום", phone: "052-8887766", registeredAt: "2026-04-02", payment: "paid" },
      { name: "שרון קדוש", phone: "054-1110099", registeredAt: "2026-04-03", payment: "paid" },
      { name: "ליהי גרין", phone: "050-4445533", registeredAt: "2026-04-04", payment: "pending" },
      { name: "נגה עמר", phone: "053-9998877", registeredAt: "2026-04-05", payment: "paid" },
      { name: "אילנה פלד", phone: "058-2223311", registeredAt: "2026-04-06", payment: "paid" },
      { name: "רותי זמיר", phone: "050-7776644", registeredAt: "2026-04-07", payment: "paid" },
    ],
  },
  /* ─── Past Events ─── */
  {
    id: "5",
    title: "הרצאה — טרנדים בעיצוב 2026",
    description: "אדר' רונית כהן מרצה על הטרנדים המובילים בעיצוב פנים לשנה הקרובה",
    date: "2026-02-20T17:00:00",
    location: "זום — קישור יישלח למשתתפות",
    type: "הרצאה",
    isPaid: false,
    price: null,
    maxAttendees: 200,
    registered: 156,
    paid: 0,
    status: "CLOSED",
    imageUrl: null,
    reminders: { week: true, day: true, hour: true },
    survey: { satisfaction: 4.6, attendanceRate: 78 },
    feedbackQuotes: [
      "הרצאה מעולה, קיבלתי המון השראה לפרויקט הנוכחי שלי!",
      "התוכן היה מדויק ורלוונטי, ממליצה בחום",
      "רונית מרצה מצוינת, אשמח להרצאה נוספת",
    ],
    attendees: [
      { name: "מאיה רוט", phone: "050-5554433", registeredAt: "2026-02-01", payment: "free" },
      { name: "תהילה ברנר", phone: "052-1112233", registeredAt: "2026-02-05", payment: "free" },
      { name: "אדוה סלע", phone: "054-9998877", registeredAt: "2026-02-08", payment: "free" },
      { name: "שלומית מור", phone: "050-3334411", registeredAt: "2026-02-10", payment: "free" },
      { name: "ירדן אוחנה", phone: "053-6665522", registeredAt: "2026-02-12", payment: "free" },
      { name: "ליאור שמש", phone: "058-8887744", registeredAt: "2026-02-14", payment: "free" },
      { name: "הדס ניר", phone: "050-2221133", registeredAt: "2026-02-16", payment: "free" },
      { name: "טליה רז", phone: "052-4445599", registeredAt: "2026-02-18", payment: "free" },
    ],
  },
  {
    id: "6",
    title: "סדנת צילום פרויקטים",
    description: "סדנה מעשית לצילום פנים ופרויקטי עיצוב — מהסמארטפון ועד מצלמה מקצועית",
    date: "2026-01-15T10:00:00",
    location: "סטודיו לייט, רמת גן",
    type: "סדנה",
    isPaid: true,
    price: 150,
    maxAttendees: 20,
    registered: 20,
    paid: 19,
    status: "CLOSED",
    imageUrl: null,
    reminders: { week: true, day: true, hour: false },
    survey: { satisfaction: 4.8, attendanceRate: 95 },
    feedbackQuotes: [
      "הסדנה הכי שווה שהייתי בה השנה, תודה!",
      "למדתי לצלם את הפרויקטים שלי באופן מקצועי",
    ],
    attendees: [
      { name: "נורית ויס", phone: "050-6667788", registeredAt: "2025-12-20", payment: "paid" },
      { name: "יפית לב", phone: "052-3332211", registeredAt: "2025-12-22", payment: "paid" },
      { name: "אורנה כץ", phone: "054-8889900", registeredAt: "2025-12-25", payment: "paid" },
      { name: "מיטל חסון", phone: "050-1114455", registeredAt: "2025-12-28", payment: "paid" },
      { name: "חנה פישר", phone: "053-7776633", registeredAt: "2026-01-02", payment: "paid" },
    ],
  },
  {
    id: "7",
    title: "נטוורקינג חנוכה — מסיבה מקצועית",
    description: "ערב חנוכה חגיגי עם הגרלות, מוזיקה וחיבורים עסקיים",
    date: "2025-12-18T19:30:00",
    location: "אירועים בגן, הרצליה",
    type: "נטוורקינג",
    isPaid: true,
    price: 80,
    maxAttendees: 80,
    registered: 74,
    paid: 72,
    status: "CLOSED",
    imageUrl: null,
    reminders: { week: true, day: true, hour: true },
    survey: { satisfaction: 4.3, attendanceRate: 88 },
    feedbackQuotes: [
      "אירוע מושלם, הכרתי לפחות 5 ספקים חדשים",
      "האווירה הייתה נהדרת, כבר מחכה לבא",
      "ארגון מצוין כמו תמיד, תודה צוות זירת!",
    ],
    attendees: [
      { name: "אסתר גולן", phone: "050-9998866", registeredAt: "2025-11-20", payment: "paid" },
      { name: "דליה הרשקוביץ", phone: "052-5554422", registeredAt: "2025-11-25", payment: "paid" },
      { name: "פנינה יוסף", phone: "054-2223311", registeredAt: "2025-12-01", payment: "paid" },
      { name: "רינת שוהם", phone: "050-8887755", registeredAt: "2025-12-05", payment: "paid" },
      { name: "זהבה מלכה", phone: "053-1119944", registeredAt: "2025-12-10", payment: "paid" },
      { name: "אתי ברוך", phone: "058-4443300", registeredAt: "2025-12-12", payment: "pending" },
    ],
  },
];

const EVENT_TYPES = ["סדנה", "סמינר", "נטוורקינג", "הרצאה", "סיור"] as const;

/* ─── Component ─── */
export default function EventsPage() {
  const [events, setEvents] = useState<EventItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TabKey>("upcoming");
  const [expandedEvent, setExpandedEvent] = useState<string | null>(null);
  const [previewEvent, setPreviewEvent] = useState<string | null>(null);
  const [reminderState, setReminderState] = useState<Record<string, { week: boolean; day: boolean; hour: boolean }>>({});

  useEffect(() => {
    setLoading(true);
    fetch("/api/events")
      .then((res) => { if (!res.ok) throw new Error("fetch failed"); return res.json(); })
      .then((data) => {
        if (Array.isArray(data)) {
          const mapped = data.map(mapEventFromApi);
          setEvents(mapped);
          const init: Record<string, { week: boolean; day: boolean; hour: boolean }> = {};
          mapped.forEach((e) => { init[e.id] = { ...e.reminders }; });
          setReminderState(init);
        }
      })
      .catch(() => setError("שגיאה בטעינת אירועים. נסו לרענן את הדף."))
      .finally(() => setLoading(false));
  }, []);

  /* Create form state */
  const [newTitle, setNewTitle] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [newDate, setNewDate] = useState("");
  const [newLocation, setNewLocation] = useState("");
  const [newType, setNewType] = useState<string>(EVENT_TYPES[0]);
  const [newIsFree, setNewIsFree] = useState(true);
  const [newPrice, setNewPrice] = useState("");
  const [newMaxAttendees, setNewMaxAttendees] = useState("");
  const [newImageUrl, setNewImageUrl] = useState("");

  const upcomingEvents = useMemo(() => events.filter((e) => e.date.slice(0, 10) >= TODAY), [events]);
  const pastEvents = useMemo(() => events.filter((e) => e.date.slice(0, 10) < TODAY), [events]);

  const toggleReminder = (eventId: string, key: "week" | "day" | "hour") => {
    setReminderState((prev) => ({
      ...prev,
      [eventId]: { ...prev[eventId], [key]: !prev[eventId][key] },
    }));
  };

  const tabs: { key: TabKey; label: string; count?: number }[] = [
    { key: "upcoming", label: "אירועים קרובים", count: upcomingEvents.length },
    { key: "past", label: "אירועים קודמים", count: pastEvents.length },
    { key: "create", label: "צור אירוע חדש" },
  ];

  const displayedEvents = activeTab === "upcoming" ? upcomingEvents : activeTab === "past" ? pastEvents : [];

  /* ─── Render ─── */
  if (loading) {
    return (
      <div className="flex items-center justify-center py-20 text-text-muted gap-2">
        <Loader2 className="w-6 h-6 animate-spin" />
        <span>טוען אירועים...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-20 text-red-400">
        <AlertTriangleIcon className="w-10 h-10 mx-auto mb-3 opacity-60" />
        <p>{error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-heading text-text-primary flex items-center gap-2">
            <Calendar className="w-7 h-7" />
            {"ניהול אירועים"}
          </h1>
          <p className="text-text-muted text-sm mt-1">
            {upcomingEvents.length} {"אירועים קרובים"} · {pastEvents.length} {"אירועים קודמים"}
          </p>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="flex gap-2 border-b border-gold/20 pb-0">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-4 py-2.5 text-sm font-heading transition-all border-b-2 -mb-[1px] flex items-center gap-2 ${
              activeTab === tab.key
                ? "border-gold text-gold"
                : "border-transparent text-text-muted hover:text-text-primary"
            }`}
          >
            {tab.key === "create" && <Plus className="w-4 h-4" />}
            {tab.label}
            {tab.count !== undefined && (
              <span className="badge-gold text-[10px] px-1.5 py-0.5">{tab.count}</span>
            )}
          </button>
        ))}
      </div>

      {/* ─── Create Event Tab ─── */}
      {activeTab === "create" && (
        <div className="card-static max-w-2xl animate-in">
          <h2 className="text-lg font-heading text-text-primary mb-4 flex items-center gap-2">
            <Plus className="w-5 h-5 text-gold" />
            {"יצירת אירוע חדש"}
          </h2>
          <div className="gold-separator mb-6" />

          <div className="space-y-4">
            <div>
              <label className="block text-sm text-text-muted mb-1">{"שם האירוע"}</label>
              <input
                type="text"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                className="input-dark w-full"
                placeholder="סדנת עיצוב פנים..."
              />
            </div>

            <div>
              <label className="block text-sm text-text-muted mb-1">{"תיאור"}</label>
              <textarea
                value={newDesc}
                onChange={(e) => setNewDesc(e.target.value)}
                className="input-dark w-full h-24 resize-none"
                placeholder="תיאור קצר של האירוע..."
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-text-muted mb-1">{"תאריך ושעה"}</label>
                <input
                  type="datetime-local"
                  value={newDate}
                  onChange={(e) => setNewDate(e.target.value)}
                  className="input-dark w-full"
                />
              </div>
              <div>
                <label className="block text-sm text-text-muted mb-1">{"מיקום"}</label>
                <input
                  type="text"
                  value={newLocation}
                  onChange={(e) => setNewLocation(e.target.value)}
                  className="input-dark w-full"
                  placeholder="כתובת או קישור זום..."
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-text-muted mb-1">{"סוג אירוע"}</label>
                <select
                  value={newType}
                  onChange={(e) => setNewType(e.target.value)}
                  className="select-dark w-full"
                >
                  {EVENT_TYPES.map((t) => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm text-text-muted mb-1">{"מקסימום משתתפות"}</label>
                <input
                  type="number"
                  value={newMaxAttendees}
                  onChange={(e) => setNewMaxAttendees(e.target.value)}
                  className="input-dark w-full"
                  placeholder="40"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-end">
              <div className="flex items-center gap-3">
                <label className="text-sm text-text-muted">{"חינם?"}</label>
                <button
                  onClick={() => setNewIsFree(!newIsFree)}
                  className={`w-12 h-6 rounded-full transition-colors relative ${
                    newIsFree ? "bg-gold" : "bg-bg-surface"
                  }`}
                >
                  <span
                    className={`absolute top-0.5 w-5 h-5 rounded-full bg-white transition-transform ${
                      newIsFree ? "right-0.5" : "right-6"
                    }`}
                  />
                </button>
                <span className="text-xs text-text-muted">{newIsFree ? "כן" : "לא"}</span>
              </div>
              {!newIsFree && (
                <div>
                  <label className="block text-sm text-text-muted mb-1">{"מחיר (₪)"}</label>
                  <input
                    type="number"
                    value={newPrice}
                    onChange={(e) => setNewPrice(e.target.value)}
                    className="input-dark w-full"
                    placeholder="120"
                  />
                </div>
              )}
            </div>

            <div>
              <label className="block text-sm text-text-muted mb-1">{"קישור לתמונה (URL)"}</label>
              <div className="flex items-center gap-2">
                <Image className="w-4 h-4 text-gold flex-shrink-0" />
                <input
                  type="url"
                  value={newImageUrl}
                  onChange={(e) => setNewImageUrl(e.target.value)}
                  className="input-dark w-full"
                  placeholder="https://example.com/image.jpg"
                />
              </div>
            </div>

            <div className="gold-separator" />

            <TwistButton variant="primary" size="sm" className="w-full">
              <span className="inline-flex items-center justify-center gap-2">
                <Plus className="w-4 h-4" />
                {"צור אירוע"}
              </span>
            </TwistButton>
          </div>
        </div>
      )}

      {/* ─── Event Cards ─── */}
      {(activeTab === "upcoming" || activeTab === "past") && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {displayedEvents.map((event) => {
            const isExpanded = expandedEvent === event.id;
            const isPast = activeTab === "past";
            const spotsLeft = event.maxAttendees - event.registered;
            const reminders = reminderState[event.id] || event.reminders;

            return (
              <div key={event.id} className="card-static">
                {/* Header */}
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="text-lg font-heading text-text-primary">{event.title}</h3>
                    <p className="text-text-muted text-sm mt-1">{event.description}</p>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span className="badge-gold text-[10px] px-2 py-0.5">{event.type}</span>
                    <StatusBadge status={event.status} />
                  </div>
                </div>

                {/* Details */}
                <div className="space-y-2 mb-4">
                  <div className="flex items-center gap-2 text-sm text-text-primary">
                    <Calendar className="w-4 h-4 text-gold flex-shrink-0" />
                    {formatDateTime(event.date)}
                  </div>
                  <div className="flex items-center gap-2 text-sm text-text-primary">
                    <MapPin className="w-4 h-4 text-gold flex-shrink-0" />
                    {event.location}
                  </div>
                  <div className="flex items-center gap-2 text-sm text-text-primary">
                    <CreditCard className="w-4 h-4 text-gold flex-shrink-0" />
                    {event.isPaid ? formatCurrency(event.price!) : "חינם"}
                  </div>
                </div>

                {/* Progress */}
                <div className="bg-bg-surface rounded-card p-4 mb-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-text-muted text-sm">{"הרשמות"}</span>
                    <span className="text-gold font-mono font-bold">
                      {event.registered}/{event.maxAttendees}
                    </span>
                  </div>
                  <div className="w-full bg-bg-surface rounded-full h-2">
                    <div
                      className="bg-gold rounded-full h-2 transition-all duration-500"
                      style={{
                        width: `${Math.min((event.registered / (event.maxAttendees || 1)) * 100, 100)}%`,
                      }}
                    />
                  </div>
                  {event.isPaid && (
                    <div className="flex items-center gap-2 mt-2 text-xs text-text-muted">
                      <CheckCircle className="w-3 h-3 text-emerald-600" />
                      {event.paid} {"שילמו"}
                      {event.registered - event.paid > 0 && (
                        <span className="text-yellow-400">
                          | {event.registered - event.paid} {"ממתינים לתשלום"}
                        </span>
                      )}
                    </div>
                  )}
                </div>

                {/* Reminder Scheduler */}
                <div className="mb-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Bell className="w-4 h-4 text-gold" />
                    <span className="text-sm text-text-muted font-heading">{"תזכורות"}</span>
                  </div>
                  <div className="flex gap-2 flex-wrap">
                    {([
                      { key: "week" as const, label: "שבוע לפני" },
                      { key: "day" as const, label: "יום לפני" },
                      { key: "hour" as const, label: "שעה לפני" },
                    ]).map((r) => (
                      <button
                        key={r.key}
                        onClick={() => toggleReminder(event.id, r.key)}
                        className={`text-xs px-3 py-1.5 rounded-full flex items-center gap-1.5 transition-all ${
                          reminders[r.key]
                            ? "bg-gold/20 text-gold border border-gold/40"
                            : "bg-bg-surface text-text-muted border border-transparent hover:border-gold/20"
                        }`}
                      >
                        {reminders[r.key] && <CheckCircle className="w-3 h-3" />}
                        <Clock className="w-3 h-3" />
                        {r.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-2 flex-wrap mb-2">
                  <button
                    onClick={() => setExpandedEvent(isExpanded ? null : event.id)}
                    className="btn-outline text-xs flex items-center gap-1"
                  >
                    <Users className="w-3 h-3" />
                    {"רשימת נרשמות"}
                    {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                  </button>
                  <button className="btn-outline text-xs flex items-center gap-1">
                    <Download className="w-3 h-3" />
                    {"ייצוא Excel"}
                  </button>
                  {!isPast && (
                    <button className="btn-outline text-xs flex items-center gap-1">
                      <Send className="w-3 h-3" />
                      {"שלח תזכורת"}
                    </button>
                  )}
                  <button
                    onClick={() => setPreviewEvent(previewEvent === event.id ? null : event.id)}
                    className="btn-outline text-xs flex items-center gap-1"
                  >
                    <Eye className="w-3 h-3" />
                    {"Preview"}
                  </button>
                  <button className="btn-outline text-xs flex items-center gap-1">
                    <Edit3 className="w-3 h-3" />
                    {"עריכה"}
                  </button>
                  <button className="btn-outline text-xs flex items-center gap-1 text-red-400 hover:text-red-300">
                    <Trash2 className="w-3 h-3" />
                    {"מחיקה"}
                  </button>
                </div>

                {/* ─── Registration List (Expandable) ─── */}
                {isExpanded && (
                  <div className="mt-4 animate-in">
                    <div className="gold-separator mb-3" />
                    <h4 className="text-sm font-heading text-text-primary mb-3 flex items-center gap-2">
                      <Users className="w-4 h-4 text-gold" />
                      {"רשימת נרשמות"} ({event.attendees.length})
                    </h4>
                    <div className="overflow-x-auto">
                      <table className="table-luxury w-full text-sm">
                        <thead>
                          <tr>
                            <th className="text-right px-3 py-2 text-text-muted font-heading">{"שם"}</th>
                            <th className="text-right px-3 py-2 text-text-muted font-heading">{"טלפון"}</th>
                            <th className="text-right px-3 py-2 text-text-muted font-heading">{"תאריך הרשמה"}</th>
                            <th className="text-right px-3 py-2 text-text-muted font-heading">{"תשלום"}</th>
                          </tr>
                        </thead>
                        <tbody>
                          {event.attendees.map((att, idx) => (
                            <tr key={idx} className="border-t border-gold/10">
                              <td className="px-3 py-2 text-text-primary">{att.name}</td>
                              <td className="px-3 py-2 text-text-muted font-mono text-xs">{att.phone}</td>
                              <td className="px-3 py-2 text-text-muted">{att.registeredAt}</td>
                              <td className="px-3 py-2">
                                <span
                                  className={`text-xs px-2 py-0.5 rounded-full ${
                                    att.payment === "paid"
                                      ? "bg-emerald-900/30 text-emerald-400"
                                      : att.payment === "pending"
                                      ? "bg-yellow-900/30 text-yellow-400"
                                      : "bg-blue-900/30 text-blue-400"
                                  }`}
                                >
                                  {att.payment === "paid" ? "שולם" : att.payment === "pending" ? "ממתין" : "חינם"}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* ─── Landing Preview Card ─── */}
                {previewEvent === event.id && (
                  <div className="mt-4 animate-in">
                    <div className="gold-separator mb-3" />
                    <h4 className="text-sm font-heading text-text-primary mb-3 flex items-center gap-2">
                      <Eye className="w-4 h-4 text-gold" />
                      {"תצוגה מקדימה — דף נחיתה"}
                    </h4>
                    <div className="bg-bg-surface rounded-card p-5 border border-gold/20">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="badge-gold text-[10px] px-2 py-0.5">{event.type}</span>
                      </div>
                      <h3 className="text-xl font-heading text-text-primary mb-2">{event.title}</h3>
                      <p className="text-text-muted text-sm mb-4">{event.description}</p>
                      <div className="space-y-2 mb-4">
                        <div className="flex items-center gap-2 text-sm text-text-primary">
                          <Calendar className="w-4 h-4 text-gold" />
                          {formatDateTime(event.date)}
                        </div>
                        <div className="flex items-center gap-2 text-sm text-text-primary">
                          <MapPin className="w-4 h-4 text-gold" />
                          {event.location}
                        </div>
                        <div className="flex items-center gap-2 text-sm text-text-primary">
                          <CreditCard className="w-4 h-4 text-gold" />
                          {event.isPaid ? formatCurrency(event.price!) : "חינם"}
                        </div>
                        <div className="flex items-center gap-2 text-sm text-text-primary">
                          <Users className="w-4 h-4 text-gold" />
                          {spotsLeft > 0
                            ? `${spotsLeft} מקומות נותרו מתוך ${event.maxAttendees}`
                            : "אין מקומות פנויים"}
                        </div>
                      </div>
                      <button
                        className={`w-full py-2.5 rounded-card text-sm font-heading transition-all ${
                          spotsLeft > 0
                            ? "btn-gold"
                            : "bg-bg-surface text-text-muted cursor-not-allowed"
                        }`}
                        disabled={spotsLeft <= 0}
                      >
                        {spotsLeft > 0 ? "הרשמה לאירוע" : "ההרשמה מלאה"}
                      </button>
                    </div>
                    <button
                      onClick={() => setPreviewEvent(null)}
                      className="mt-2 text-xs text-text-muted hover:text-text-primary flex items-center gap-1"
                    >
                      <X className="w-3 h-3" />
                      {"סגור תצוגה מקדימה"}
                    </button>
                  </div>
                )}

                {/* ─── Post-Event Section (Past Events Only) ─── */}
                {isPast && event.survey && (
                  <div className="mt-4 animate-in">
                    <div className="gold-separator mb-3" />
                    <h4 className="text-sm font-heading text-text-primary mb-3 flex items-center gap-2">
                      <Star className="w-4 h-4 text-gold" />
                      {"סיכום אירוע"}
                    </h4>

                    {/* Survey Results */}
                    <div className="grid grid-cols-2 gap-3 mb-4">
                      <div className="bg-bg-surface rounded-card p-3 text-center">
                        <div className="text-2xl font-heading text-gold">{event.survey.satisfaction}</div>
                        <div className="text-xs text-text-muted">{"שביעות רצון (מתוך 5)"}</div>
                        <div className="flex justify-center gap-0.5 mt-1">
                          {[1, 2, 3, 4, 5].map((s) => (
                            <Star
                              key={s}
                              className={`w-3 h-3 ${
                                s <= Math.floor(event.survey!.satisfaction)
                                  ? "text-gold fill-gold"
                                  : "text-text-muted"
                              }`}
                            />
                          ))}
                        </div>
                      </div>
                      <div className="bg-bg-surface rounded-card p-3 text-center">
                        <div className="text-2xl font-heading text-gold">{event.survey.attendanceRate}%</div>
                        <div className="text-xs text-text-muted">{"אחוז נוכחות"}</div>
                      </div>
                    </div>

                    {/* Photo Gallery */}
                    <div className="mb-4">
                      <h5 className="text-xs font-heading text-text-muted mb-2 flex items-center gap-1">
                        <Camera className="w-3 h-3" />
                        {"גלריית תמונות"}
                      </h5>
                      <div className="grid grid-cols-3 gap-2">
                        {[1, 2, 3, 4, 5, 6].map((i) => (
                          <div
                            key={i}
                            className="bg-bg-surface rounded-lg aspect-square flex items-center justify-center border border-gold/10"
                          >
                            <Camera className="w-6 h-6 text-text-muted/30" />
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Feedback Quotes */}
                    {event.feedbackQuotes && event.feedbackQuotes.length > 0 && (
                      <div>
                        <h5 className="text-xs font-heading text-text-muted mb-2">{"ציטוטים מהמשתתפות"}</h5>
                        <div className="space-y-2">
                          {event.feedbackQuotes.map((quote, idx) => (
                            <div
                              key={idx}
                              className="bg-bg-surface rounded-card p-3 border-r-2 border-gold/40 text-sm text-text-primary"
                            >
                              &ldquo;{quote}&rdquo;
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Empty state */}
      {(activeTab === "upcoming" || activeTab === "past") && displayedEvents.length === 0 && (
        <div className="card-static text-center py-12">
          <Calendar className="w-12 h-12 text-text-muted/30 mx-auto mb-3" />
          <p className="text-text-muted">{"אין אירועים להצגה"}</p>
        </div>
      )}
    </div>
  );
}
