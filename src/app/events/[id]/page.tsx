"use client";
import { txt } from "@/content/siteText";
import { useState } from "react";
import Logo from "@/components/ui/Logo";
import { Calendar, MapPin, CreditCard, Users, CheckCircle, } from "lucide-react";
import { formatDateTime, formatCurrency } from "@/lib/utils";
const eventData = {
    title: txt("src/app/events/[id]/page.tsx::001", "סדנת חומרים חדשים 2026"),
    description: txt("src/app/events/[id]/page.tsx::002", "סדנה מעשית להכרת חומרי גמר חדשניים — בשיתוף טקטורה, חברת חומרים מובילה. נכיר מקרוב חומרי גמר שמשנים את עולם העיצוב, נבחן דוגמאות, ונלמד איך לשלב אותם בפרויקטים."),
    date: "2026-03-15T18:00:00",
    location: txt("src/app/events/[id]/page.tsx::003", "חלל סטודיו TLV, יפו 33, תל אביב"),
    isPaid: true,
    price: 120,
    maxAttendees: 40,
    currentAttendees: 28,
    registrationDeadline: "2026-03-14T23:59:00",
};
export default function EventPage() {
    const [isRegistered, setIsRegistered] = useState(false);
    const [formData, setFormData] = useState({
        fullName: "",
        phone: "",
        email: "",
    });
    const spotsLeft = eventData.maxAttendees - eventData.currentAttendees;
    return (<div className="min-h-screen bg-bg">
      {/* Header */}
      <header className="bg-bg-surface border-b border-border-subtle">
        <div className="max-w-3xl mx-auto px-4 py-4 flex items-center justify-between">
          <Logo size="sm"/>
          <span className="text-text-muted text-sm">{txt("src/app/events/[id]/page.tsx::004", "דף אירוע")}</span>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-8">
        {!isRegistered ? (<div className="space-y-6 animate-in">
            {/* Event Details */}
            <div className="card-static">
              {/* Image placeholder */}
              <div className="bg-bg-surface rounded-card h-48 flex items-center justify-center mb-6 border border-border-subtle">
                <Calendar className="w-16 h-16 text-gold opacity-30"/>
              </div>

              <h1 className="text-2xl font-heading text-gold mb-2">
                {eventData.title}
              </h1>
              <p className="text-text-primary leading-relaxed mb-6">
                {eventData.description}
              </p>

              <div className="space-y-3 mb-6">
                <div className="flex items-center gap-3 text-text-primary">
                  <Calendar className="w-5 h-5 text-gold flex-shrink-0"/>
                  <span>{formatDateTime(eventData.date)}</span>
                </div>
                <div className="flex items-center gap-3 text-text-primary">
                  <MapPin className="w-5 h-5 text-gold flex-shrink-0"/>
                  <span>{eventData.location}</span>
                </div>
                <div className="flex items-center gap-3 text-text-primary">
                  <CreditCard className="w-5 h-5 text-gold flex-shrink-0"/>
                  <span>
                    {eventData.isPaid
                ? `${formatCurrency(eventData.price)} (כולל מע"מ)`
                : txt("src/app/events/[id]/page.tsx::005", "כניסה חופשית")}
                  </span>
                </div>
                <div className="flex items-center gap-3 text-text-primary">
                  <Users className="w-5 h-5 text-gold flex-shrink-0"/>
                  <span>
                    {spotsLeft > 0 ? (<>{txt("src/app/events/[id]/page.tsx::006", "נותרו")}<span className="text-gold font-bold">{spotsLeft}</span>{txt("src/app/events/[id]/page.tsx::007", "מקומות מתוך")}{eventData.maxAttendees}
                      </>) : (<span className="text-red-400">{txt("src/app/events/[id]/page.tsx::008", "האירוע מלא")}</span>)}
                  </span>
                </div>
              </div>

              {/* Registration Form */}
              {spotsLeft > 0 && (<>
                  <hr className="gold-separator mb-6"/>
                  <h2 className="text-lg font-heading text-gold mb-4">{txt("src/app/events/[id]/page.tsx::009", "הרשמה לאירוע")}</h2>
                  <div className="space-y-3">
                    <input type="text" placeholder="שם מלא" value={formData.fullName} onChange={(e) => setFormData({ ...formData, fullName: e.target.value })} className="input-dark"/>
                    <input type="tel" placeholder="טלפון" value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} className="input-dark"/>
                    <input type="email" placeholder="מייל" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} className="input-dark"/>
                    <button onClick={() => setIsRegistered(true)} className="btn-gold w-full text-lg py-3">
                      {eventData.isPaid
                    ? `הרשמי ושלמי ${formatCurrency(eventData.price)}`
                    : txt("src/app/events/[id]/page.tsx::013", "הרשמי לאירוע")}
                    </button>
                    {eventData.isPaid && (<p className="text-text-muted text-xs text-center">{txt("src/app/events/[id]/page.tsx::014", "התשלום מתבצע דרך iCount — כרטיס אשראי בצורה מאובטחת")}</p>)}
                  </div>
                </>)}
            </div>
          </div>) : (
        /* Success */
        <div className="card-static text-center py-12 animate-in">
            <CheckCircle className="w-16 h-16 text-green-400 mx-auto mb-4"/>
            <h2 className="text-2xl font-heading text-gold mb-2">{txt("src/app/events/[id]/page.tsx::015", "נרשמת בהצלחה!")}</h2>
            <p className="text-text-primary mb-4">
              {eventData.isPaid
                ? txt("src/app/events/[id]/page.tsx::016", "התשלום התקבל — חשבונית תישלח במייל") : txt("src/app/events/[id]/page.tsx::017", "ההרשמה אושרה — נתראה שם!")}
            </p>
            <div className="bg-bg-surface rounded-card p-4 inline-block text-right">
              <p className="text-gold font-heading font-bold">{eventData.title}</p>
              <p className="text-text-muted text-sm">{formatDateTime(eventData.date)}</p>
              <p className="text-text-muted text-sm">{eventData.location}</p>
            </div>
          </div>)}
      </main>
    </div>);
}
