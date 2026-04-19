"use client";
import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Logo from "@/components/ui/Logo";
import { siteText } from "@/content/siteText";
import { TwistButton, Eyebrow, GoldText } from "@/components/ds";
import { Shield, Store, Palette, Eye, EyeOff, ArrowLeft, Mail, Lock, Loader2, } from "lucide-react";
type UserRole = "admin" | "supplier" | "designer";
const roleMeta = {
    admin: { icon: <Shield className="w-6 h-6"/>, text: siteText.auth.roles.admin },
    supplier: { icon: <Store className="w-6 h-6"/>, text: siteText.auth.roles.supplier },
    designer: { icon: <Palette className="w-6 h-6"/>, text: siteText.auth.roles.designer },
} as const;
// רק מעצבות וספקים ברירור הרגיל — ניהול נכנס דרך ?role=admin מהעמוד הראשי
const roles: UserRole[] = ["designer", "supplier"];

const bgImages = [
  "https://images.unsplash.com/photo-1600210492486-724fe5c67fb0?auto=format&fit=crop&w=2000&q=80",
  "https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?auto=format&fit=crop&w=2000&q=80",
  "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=2000&q=80",
];

export default function LoginPage() {
    return (<Suspense fallback={<div className="min-h-screen bg-bg flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-gold"/></div>}>
      <LoginContent />
    </Suspense>);
}
function LoginContent() {
    const searchParams = useSearchParams();
    const redirect = searchParams.get("redirect") || "";
    const roleParam = searchParams.get("role");
    // אם הגיעו עם ?role=admin (מכפתור "ניהול" בעמוד הבית) — דילוג ישיר לטופס אדמין
    const initialRole: UserRole | null =
        roleParam === "admin" || roleParam === "designer" || roleParam === "supplier"
            ? (roleParam as UserRole)
            : null;
    const [selectedRole, setSelectedRole] = useState<UserRole | null>(initialRole);
    // סנכרון אם ה-URL משתנה
    useEffect(() => {
        if (initialRole && !selectedRole) setSelectedRole(initialRole);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [initialRole]);
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const googleError = searchParams.get("error");
    const googleErrorMessages: Record<string, string> = {
        google_cancelled: "הכניסה עם Google בוטלה",
        google_token_failed: "שגיאה בהתחברות עם Google. נסה שוב",
        google_profile_failed: "לא הצלחנו לקבל את פרטי החשבון מ-Google",
        google_no_email: "חשבון Google ללא אימייל. נסה חשבון אחר",
        google_no_account: "לא נמצא חשבון עם האימייל הזה. יש להירשם קודם",
        google_auth_failed: "שגיאה בכניסה עם Google",
        google_server_error: "שגיאת שרת. נסה שוב",
        account_inactive: "החשבון אינו פעיל",
        account_pending: "החשבון ממתין לאישור מנהלת הקהילה",
        account_rejected: "הבקשה נדחתה. ניתן לפנות למנהלת הקהילה",
    };
    const [error, setError] = useState(googleError ? googleErrorMessages[googleError] || "" : "");
    const [loading, setLoading] = useState(false);
    const [googleLoading, setGoogleLoading] = useState(false);
    const handleGoogleLogin = () => {
        if (!selectedRole || selectedRole === "admin") return;
        setGoogleLoading(true);
        const params = new URLSearchParams({ role: selectedRole });
        if (redirect) params.set("redirect", redirect);
        window.location.href = `/api/auth/google?${params.toString()}`;
    };
    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedRole)
            return;
        setError("");
        setLoading(true);
        try {
            const controller = new AbortController();
            const timeoutId = window.setTimeout(() => controller.abort(), 10000);
            const res = await fetch("/api/auth/login", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                credentials: "same-origin",
                signal: controller.signal,
                body: JSON.stringify({ email, password, role: selectedRole }),
            });
            window.clearTimeout(timeoutId);
            let data;
            try {
                data = await res.json();
            } catch {
                setError(siteText.auth.common.networkError);
                setLoading(false);
                return;
            }
            if (!res.ok) {
                setError(data.error || siteText.auth.common.invalidCredentials);
                setLoading(false);
                return;
            }
            const defaultRedirects: Record<string, string> = {
                admin: "/admin",
                supplier: "/supplier/demo",
                designer: "/designer/demo",
            };
            const targetUrl = redirect || data.redirectUrl || defaultRedirects[selectedRole] || "/";
            window.location.href = targetUrl;
        }
        catch (error) {
            if (error instanceof DOMException && error.name === "AbortError") {
                setError("הזמן תם. נסה שוב.");
            } else {
                setError(siteText.auth.common.networkError);
            }
            setLoading(false);
        }
    };
    return (<div className="min-h-screen flex" dir="rtl">
      {/* Left side — Luxury image collage */}
      <div className="hidden lg:flex lg:w-[55%] relative overflow-hidden">
        {/* Background image grid */}
        <div className="absolute inset-0 grid grid-cols-2 grid-rows-2">
          <div className="relative overflow-hidden">
            <div
              className="absolute inset-0 bg-cover bg-center transition-transform duration-[15s] hover:scale-110"
              style={{ backgroundImage: `url(${bgImages[0]})` }}
            />
          </div>
          <div className="relative overflow-hidden row-span-2">
            <div
              className="absolute inset-0 bg-cover bg-center transition-transform duration-[15s] hover:scale-110"
              style={{ backgroundImage: `url(${bgImages[1]})` }}
            />
          </div>
          <div className="relative overflow-hidden">
            <div
              className="absolute inset-0 bg-cover bg-center transition-transform duration-[15s] hover:scale-110"
              style={{ backgroundImage: `url(${bgImages[2]})` }}
            />
          </div>
        </div>

        {/* Dark overlay with gradient */}
        <div className="absolute inset-0 bg-gradient-to-l from-black/80 via-black/50 to-black/30" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-black/40" />

        {/* Gold accent glow */}
        <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-gold/20 rounded-full blur-[120px] -translate-y-1/3 translate-x-1/4" />
        <div className="absolute bottom-0 left-0 w-[300px] h-[300px] bg-gold/15 rounded-full blur-[100px] translate-y-1/3 -translate-x-1/4" />

        {/* Gold line top */}
        <div className="absolute top-0 left-0 right-0 h-[3px] bg-gold-gradient" />

        {/* Content over images */}
        <div className="relative z-10 flex flex-col justify-between p-10 w-full">
          <div>
            <Logo size="xl" variant="dark"/>
          </div>
          <div className="max-w-lg">
            <Eyebrow className="inline-flex items-center gap-2 rounded-full border border-gold/30 bg-black/40 backdrop-blur-md px-4 py-2 mb-6 text-gold-light">
              Interior Design Community
            </Eyebrow>
            <h2 className="text-4xl xl:text-5xl font-heading font-bold text-white leading-tight mb-4">
              המקום שבו
              <GoldText className="block mt-2">עיצוב פוגש קהילה</GoldText>
            </h2>
            <p className="text-white/60 text-base leading-relaxed max-w-md">
              חללים מעוצבים, מטבחים יוקרתיים, בתים מרהיבים — הכל מתחיל כאן, בקהילה שמחברת מעצבות וספקים ברמה אחרת.
            </p>
          </div>
          <div className="flex items-center gap-6">
            {["סלונים", "מטבחים", "חדרי אמבט", "גינות"].map((tag) => (
              <span key={tag} className="text-white/40 text-xs tracking-wider uppercase border-b border-white/10 pb-1">
                {tag}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Right side — Login form */}
      <div className="flex-1 flex items-center justify-center px-4 py-6 sm:p-12 bg-gradient-to-br from-[#FDFCFA] via-white to-[#FBF7ED] relative">
        {/* Subtle pattern */}
        <div className="absolute inset-0 opacity-[0.03] [background-image:radial-gradient(circle_at_1px_1px,#C9A84C_1px,transparent_0)] [background-size:32px_32px]" />

        <div className="w-full max-w-md mx-auto relative z-10">
          <div className="lg:hidden mb-8 text-center">
            <Logo size="lg" variant="light"/>
            <p className="text-text-muted text-sm mt-2">עיצוב פוגש קהילה</p>
          </div>

          {!selectedRole ? (<div className="animate-fade-in">
              <h1 className="text-2xl sm:text-3xl font-heading font-bold text-text-primary text-center mb-2">
                {siteText.auth.login.welcomeTitle}
              </h1>
              <p className="text-text-muted text-center mb-8">
                {siteText.auth.login.chooseRole}
              </p>

              <div className="space-y-3">
                {roles.map((roleKey) => (<button key={roleKey} onClick={() => setSelectedRole(roleKey)} className="w-full flex items-center gap-3 sm:gap-4 p-4 sm:p-5 rounded-card border border-border-subtle
                             hover:border-gold hover:shadow-gold transition-all duration-300
                             bg-white/80 backdrop-blur-sm group text-right min-h-[44px]">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-gold-50 to-amber-50 group-hover:from-gold/20 group-hover:to-gold/10
                                  flex items-center justify-center text-gold transition-all duration-300 shadow-sm">
                      {roleMeta[roleKey].icon}
                    </div>
                    <div className="flex-1">
                      <div className="font-semibold text-text-primary text-lg">{roleMeta[roleKey].text.label}</div>
                      <div className="text-text-muted text-sm">{roleMeta[roleKey].text.desc}</div>
                    </div>
                    <ArrowLeft className="w-5 h-5 text-text-muted group-hover:text-gold
                                        group-hover:-translate-x-1 transition-all"/>
                  </button>))}
              </div>

              <div className="mt-8 text-center">
                <p className="text-text-muted text-sm">
                  {siteText.auth.common.registerLinkPrefix}{" "}
                  <a href="/register" className="text-gold hover:text-gold-dark font-medium">
                    {siteText.auth.common.registerLink}
                  </a>
                </p>
              </div>
            </div>) : (<div className="animate-fade-in">
              <button
                onClick={() => {
                    // אם הגיעו ישירות ל-admin — חזרה לעמוד הבית; אחרת חזרה לבחירת תפקיד
                    if (initialRole === "admin") {
                        window.location.href = "/";
                        return;
                    }
                    setSelectedRole(null);
                    setError("");
                }}
                className="flex items-center gap-2 text-text-muted hover:text-gold mb-6 transition-colors text-sm"
              >
                <ArrowLeft className="w-4 h-4 rotate-180"/>
                {initialRole === "admin" ? "חזרה לעמוד הבית" : siteText.auth.common.backToRoleSelection}
              </button>

              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-gold/15 to-gold/5 flex items-center justify-center text-gold shadow-sm">
                  {roleMeta[selectedRole].icon}
                </div>
                <div>
                  <h1 className="text-2xl font-heading font-bold text-text-primary">
                    {siteText.auth.login.roleTitlePrefix} - {roleMeta[selectedRole].text.label}
                  </h1>
                </div>
              </div>

              <form onSubmit={handleLogin} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-text-primary mb-1.5">
                    {siteText.auth.common.emailLabel}
                  </label>
                  <div className="relative">
                    <Mail className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-text-muted"/>
                    <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="name@example.com" required className="input-field pr-10" dir="ltr"/>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-text-primary mb-1.5">
                    {siteText.auth.common.passwordLabel}
                  </label>
                  <div className="relative">
                    <Lock className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-text-muted"/>
                    <input type={showPassword ? "text" : "password"} value={password} onChange={(e) => setPassword(e.target.value)} placeholder={siteText.auth.login.passwordPlaceholder} required className="input-field pr-10 pl-10"/>
                    <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-gold">
                      {showPassword ? <EyeOff className="w-5 h-5"/> : <Eye className="w-5 h-5"/>}
                    </button>
                  </div>
                </div>

                {error && (<div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                    {error}
                  </div>)}

                <TwistButton type="submit" disabled={loading} variant="primary" size="lg" className="w-full">
                  {loading ? (<Loader2 className="w-5 h-5 animate-spin"/>) : (siteText.auth.common.loginButton)}
                </TwistButton>
              </form>

              {selectedRole !== "admin" && (<div className="mt-6 space-y-4">
                  <div className="relative">
                    <div className="absolute inset-0 flex items-center">
                      <div className="w-full border-t border-border-subtle"/>
                    </div>
                    <div className="relative flex justify-center text-sm">
                      <span className="px-4 bg-[#FDFCFA] text-text-muted">{siteText.auth.common.or}</span>
                    </div>
                  </div>

                  <button type="button" disabled={googleLoading} className="w-full flex items-center justify-center gap-3 px-4 py-3 border border-border-subtle
                             rounded-btn bg-white hover:bg-gray-50 transition-colors text-text-primary font-medium
                             disabled:opacity-50 disabled:cursor-not-allowed" onClick={handleGoogleLogin}>
                    {googleLoading ? (
                      <Loader2 className="w-5 h-5 animate-spin"/>
                    ) : (
                      <svg className="w-5 h-5" viewBox="0 0 24 24">
                        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"/>
                        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                        <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                      </svg>
                    )}
                    {googleLoading ? "מתחבר..." : "כניסה עם Google"}</button>

                  <div className="text-center text-sm">
                    <a href="/forgot-password" className="text-gold hover:text-gold-dark transition-colors">
                      {siteText.auth.common.forgotPassword}
                    </a>
                  </div>

                  {selectedRole === "designer" && (<p className="text-center text-text-muted text-sm">
                      {siteText.auth.common.registerLinkPrefix}{" "}
                      <a href="/register" className="text-gold hover:text-gold-dark font-medium">
                        {siteText.auth.common.registerLink}
                      </a>
                    </p>)}
                </div>)}

              {selectedRole === "admin" && (<p className="text-center text-text-muted text-sm mt-4">
                  <a href="/forgot-password" className="text-gold hover:text-gold-dark transition-colors">
                    {siteText.auth.common.forgotPassword}
                  </a>
                </p>)}
            </div>)}
        </div>
      </div>
    </div>);
}
