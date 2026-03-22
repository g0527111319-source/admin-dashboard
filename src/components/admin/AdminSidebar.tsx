"use client";
import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import Logo from "@/components/ui/Logo";
import { LayoutDashboard, Users, Palette, FileText, Trophy, Calendar, BarChart3, Settings, MessageCircle, Star, ChevronRight, Menu, X, LogOut, UserPlus, CalendarClock, MapPin, Zap, CheckSquare, } from "lucide-react";
const menuItems = [
    { href: "/admin", label: "\u05E1\u05E7\u05D9\u05E8\u05D4 \u05DB\u05DC\u05DC\u05D9\u05EA", icon: LayoutDashboard },
    { href: "/admin/suppliers", label: "\u05E0\u05D9\u05D4\u05D5\u05DC \u05E1\u05E4\u05E7\u05D9\u05DD", icon: Users },
    { href: "/admin/designers", label: "\u05E0\u05D9\u05D4\u05D5\u05DC \u05DE\u05E2\u05E6\u05D1\u05D5\u05EA", icon: Palette },
    { href: "/admin/waitlist", label: "\u05E8\u05E9\u05D9\u05DE\u05EA \u05D4\u05DE\u05EA\u05E0\u05D4", icon: UserPlus },
    { href: "/admin/posts", label: "\u05E0\u05D9\u05D4\u05D5\u05DC \u05E4\u05E8\u05E1\u05D5\u05DE\u05D9\u05DD", icon: FileText },
    { href: "/admin/ratings", label: "\u05D3\u05D9\u05E8\u05D5\u05D2\u05D9\u05DD", icon: Star },
    { href: "/admin/lottery", label: "\u05D4\u05D2\u05E8\u05DC\u05D5\u05EA", icon: Trophy },
    { href: "/admin/events", label: "\u05D0\u05D9\u05E8\u05D5\u05E2\u05D9\u05DD", icon: Calendar },
    { href: "/admin/reservations", label: "\u05E9\u05E8\u05D9\u05D5\u05E0\u05D9\u05DD", icon: CalendarClock },
    { href: "/admin/reports", label: "\u05D3\u05D5\u05D7\u05D5\u05EA \u05D5\u05D0\u05E0\u05DC\u05D9\u05D8\u05D9\u05E7\u05D4", icon: BarChart3 },
    { href: "/admin/whatsapp", label: "\u05D5\u05D5\u05D0\u05D8\u05E1\u05D0\u05E4", icon: MessageCircle },
    { href: "/admin/map", label: "\u05DE\u05E4\u05EA \u05E7\u05D4\u05D9\u05DC\u05D4", icon: MapPin },
    { href: "/admin/automations", label: "\u05D0\u05D5\u05D8\u05D5\u05DE\u05E6\u05D9\u05D5\u05EA", icon: Zap },
    { href: "/admin/tasks", label: "\u05DC\u05D5\u05D7 \u05DE\u05E9\u05D9\u05DE\u05D5\u05EA", icon: CheckSquare },
    { href: "/admin/settings", label: "\u05D4\u05D2\u05D3\u05E8\u05D5\u05EA", icon: Settings },
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
      <div className="lg:hidden fixed top-0 right-0 left-0 z-50 bg-white/90 backdrop-blur-md border-b border-border-subtle px-4 py-3 flex items-center justify-between">
        <Logo size="sm"/>
        <button onClick={() => setIsOpen(!isOpen)} className="p-2 rounded-btn hover:bg-bg-surface transition-colors">
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
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"/>{"\u05DC\u05D5\u05D7 \u05D1\u05E7\u05E8\u05D4 \u2014 \u05EA\u05DE\u05E8"}</p>
        </div>

        <nav className="flex-1 p-3 space-y-0.5 overflow-y-auto">
          {menuItems.map((item) => {
            const isActive = pathname === item.href || (item.href !== "/admin" && pathname.startsWith(item.href));
            const Icon = item.icon;
            return (<Link key={item.href} href={item.href} onClick={() => setIsOpen(false)} className={`flex items-center gap-3 px-4 py-2.5 rounded-btn transition-all duration-200
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
            <LogOut className="w-4 h-4"/>{"\u05D4\u05EA\u05E0\u05EA\u05E7\u05D5\u05EA"}</button>
        </div>
      </aside>
    </>);
}
