"use client";
import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import Logo from "@/components/ui/Logo";
import { LayoutDashboard, Users, Palette, FileText, Trophy, Calendar, BarChart3, Settings, MessageCircle, Star, ChevronRight, Menu, X, LogOut, UserPlus, CalendarClock, MapPin, Zap, CheckSquare, } from "lucide-react";
const menuItems = [
    { href: "/admin", label: "סקירה כללית", icon: LayoutDashboard },
    { href: "/admin/suppliers", label: "ניהול ספקים", icon: Users },
    { href: "/admin/designers", label: "ניהול מעצבות", icon: Palette },
    { href: "/admin/waitlist", label: "רשימת המתנה", icon: UserPlus },
    { href: "/admin/posts", label: "ניהול פרסומים", icon: FileText },
    { href: "/admin/ratings", label: "דירוגים", icon: Star },
    { href: "/admin/lottery", label: "הגרלות", icon: Trophy },
    { href: "/admin/events", label: "אירועים", icon: Calendar },
    { href: "/admin/reservations", label: "שריונים", icon: CalendarClock },
    { href: "/admin/reports", label: "דוחות ואנליטיקה", icon: BarChart3 },
    { href: "/admin/whatsapp", label: "וואטסאפ", icon: MessageCircle },
    { href: "/admin/map", label: "מפת קהילה", icon: MapPin },
    { href: "/admin/automations", label: "אוטומציות", icon: Zap },
    { href: "/admin/tasks", label: "לוח משימות", icon: CheckSquare },
    { href: "/admin/settings", label: "הגדרות", icon: Settings },
];
export default function AdminSidebar() {
    const pathname = usePathname();
    const router = useRouter();
    const [isOpen, setIsOpen] = useState(false);
    const handleLogout = async () => {
        await fetch("/api/auth/logout", { method: "POST" });
        router.push("/login");
    };
    return (<>
      {/* Mobile top bar */}
      <div className="lg:hidden fixed top-0 right-0 left-0 z-50 bg-bg-card/90 backdrop-blur-md border-b border-border-subtle px-4 py-2 flex items-center justify-between">
        <Logo size="sm"/>
        <button onClick={() => setIsOpen(!isOpen)} className="p-2.5 rounded-btn hover:bg-bg-surface transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center">
          {isOpen ? <X className="w-5 h-5 text-text-primary"/> : <Menu className="w-5 h-5 text-text-primary"/>}
        </button>
      </div>

      {/* Overlay */}
      {isOpen && (<div className="lg:hidden fixed inset-0 bg-black/30 backdrop-blur-sm z-30" onClick={() => setIsOpen(false)}/>)}

      {/* Sidebar */}
      <aside className={`fixed top-0 right-0 h-full w-72 bg-white border-l border-border-subtle shadow-elevated
          z-40 transition-transform duration-300 ease-in-out flex flex-col
          lg:translate-x-0 ${isOpen ? "translate-x-0" : "translate-x-full lg:translate-x-0"}`}>
        <div className="p-5 border-b border-border-subtle">
          <Logo size="md"/>
          <p className="text-text-muted text-xs mt-2 flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"/>{"לוח בקרה — תמר"}</p>
        </div>

        <nav className="flex-1 p-3 space-y-0.5 overflow-y-auto">
          {menuItems.map((item) => {
            const isActive = pathname === item.href || (item.href !== "/admin" && pathname.startsWith(item.href));
            const Icon = item.icon;
            return (<Link key={item.href} href={item.href} onClick={() => setIsOpen(false)} className={`flex items-center gap-3 px-4 py-3 rounded-btn transition-all duration-200 min-h-[44px]
                  ${isActive
                    ? "bg-gold/10 text-gold font-semibold border-r-[3px] border-gold"
                    : "text-text-muted hover:text-text-primary hover:bg-bg-surface"}`}>
                <Icon className="w-[18px] h-[18px] flex-shrink-0"/>
                <span className="text-sm">{item.label}</span>
                {isActive && <ChevronRight className="w-4 h-4 mr-auto"/>}
              </Link>);
        })}
        </nav>

        <div className="p-4 border-t border-border-subtle">
          <button onClick={handleLogout} className="flex items-center gap-2 text-text-muted text-sm hover:text-red-500 transition-colors px-3 py-2 w-full">
            <LogOut className="w-4 h-4"/>{"התנתקות"}</button>
        </div>
      </aside>
    </>);
}
