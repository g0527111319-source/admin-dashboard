"use client";

import Logo from "@/components/ui/Logo";
import { siteText } from "@/content/siteText";
import {
  ArrowLeft,
  Building2,
  Calendar,
  Gem,
  MessageCircle,
  Palette,
  Shield,
  Sparkles,
  Star,
  TrendingUp,
  Users,
} from "lucide-react";
import Link from "next/link";

const entryCards = [
  {
    href: "/login",
    accent: "#C9A84C",
    image:
      "https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?auto=format&fit=crop&w=1200&q=80",
    icon: Shield,
    text: siteText.home.entries.admin,
  },
  {
    href: "/login",
    accent: "#E8C97A",
    image:
      "https://images.unsplash.com/photo-1494526585095-c41746248156?auto=format&fit=crop&w=1200&q=80",
    icon: Building2,
    text: siteText.home.entries.supplier,
  },
  {
    href: "/login",
    accent: "#F4E5BE",
    image:
      "https://images.unsplash.com/photo-1484154218962-a197022b5858?auto=format&fit=crop&w=1200&q=80",
    icon: Palette,
    text: siteText.home.entries.designer,
  },
] as const;

const featureCards = [
  {
    icon: MessageCircle,
    tone: "from-amber-50 to-white",
    text: siteText.home.features[0],
  },
  {
    icon: TrendingUp,
    tone: "from-stone-100 to-white",
    text: siteText.home.features[1],
  },
  {
    icon: Users,
    tone: "from-zinc-100 to-white",
    text: siteText.home.features[2],
  },
] as const;

const communityHighlights = [
  { icon: Calendar, text: siteText.home.highlights[0] },
  { icon: Users, text: siteText.home.highlights[1] },
  { icon: Palette, text: siteText.home.highlights[2] },
] as const;

export default function HomePage() {
  return (
    <div className="min-h-screen bg-bg text-text-primary overflow-hidden">
      <section className="relative isolate min-h-screen bg-[#050505] text-white">
        <div
          className="absolute inset-0 bg-cover bg-center opacity-30 scale-105"
          style={{
            backgroundImage:
              "url('https://images.unsplash.com/photo-1513694203232-719a280e022f?auto=format&fit=crop&w=2000&q=80')",
          }}
        />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(201,168,76,0.24),transparent_28%),linear-gradient(135deg,rgba(5,5,5,0.9),rgba(5,5,5,0.72)_45%,rgba(15,15,15,0.92))]" />
        <div className="absolute inset-0 opacity-[0.07] [background-image:linear-gradient(rgba(255,255,255,0.25)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.2)_1px,transparent_1px)] [background-size:90px_90px]" />
        <div className="absolute -top-16 left-1/2 -translate-x-1/2 w-[82vw] h-[82vw] max-w-[860px] max-h-[860px] rounded-full border border-gold/15" />
        <div className="absolute top-20 right-[8%] hidden xl:block opacity-[0.08] saturate-0">
          <Logo size="xl" variant="dark" />
        </div>
        <div className="absolute top-0 left-0 right-0 h-[3px] bg-gold-gradient" />

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-10 pb-16 sm:pt-14 sm:pb-24">
          <div className="flex items-center justify-between mb-10">
            <div className="rounded-full border border-white/10 bg-white/5 backdrop-blur-md px-4 py-2 text-[11px] sm:text-xs text-white/80 tracking-[0.25em] uppercase">
              {siteText.brand.communityLabel}
            </div>
            <div className="rounded-full border border-gold/20 bg-black/25 backdrop-blur-md px-4 py-2 text-xs sm:text-sm text-gold-light">
              {siteText.brand.tagline}
            </div>
          </div>

          <div className="grid lg:grid-cols-[1.05fr_0.95fr] gap-10 items-end">
            <div className="max-w-3xl">
              <div className="mb-8 animate-in">
                <Logo size="xl" variant="dark" />
              </div>

              <div className="inline-flex items-center gap-2 rounded-full border border-gold/25 bg-gold/10 px-4 py-2 text-sm text-gold-light backdrop-blur-md animate-in stagger-1">
                <Gem className="w-4 h-4" />
                {siteText.home.badge}
              </div>

              <h1 className="mt-7 text-4xl sm:text-5xl lg:text-7xl font-heading font-bold leading-[1.05] animate-in stagger-2">
                {siteText.home.title}
                <span className="block text-gold mt-3">{siteText.home.titleAccent}</span>
              </h1>

              <p className="mt-6 text-base sm:text-lg lg:text-xl text-white/70 max-w-2xl leading-relaxed animate-in stagger-3">
                {siteText.home.description}
              </p>

              <div className="mt-10 grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 animate-in stagger-4">
                {siteText.home.stats.map((item) => (
                  <div
                    key={item.label}
                    className="rounded-[22px] border border-white/10 bg-white/6 backdrop-blur-md px-4 py-4 shadow-[0_20px_50px_rgba(0,0,0,0.18)]"
                  >
                    <div className="text-2xl sm:text-3xl font-mono font-bold text-gold">{item.value}</div>
                    <div className="mt-1 text-xs sm:text-sm text-white/65 leading-relaxed">{item.label}</div>
                  </div>
                ))}
              </div>
            </div>

            <div className="relative">
              <div className="absolute -inset-5 rounded-[32px] bg-gold/10 blur-3xl" />
              <div className="relative rounded-[32px] border border-white/10 bg-white/[0.06] p-4 sm:p-5 backdrop-blur-xl shadow-[0_30px_80px_rgba(0,0,0,0.35)]">
                <div className="mb-4 flex items-center justify-between rounded-[24px] border border-white/10 bg-black/20 px-4 py-3">
                  <div>
                    <p className="text-xs tracking-[0.28em] uppercase text-white/45">{siteText.home.entryHeaderEyebrow}</p>
                    <p className="text-sm sm:text-base text-white/90">{siteText.home.entryHeaderTitle}</p>
                  </div>
                  <Sparkles className="w-5 h-5 text-gold" />
                </div>

                <div className="space-y-4">
                  {entryCards.map((card, index) => {
                    const Icon = card.icon;
                    return (
                      <Link
                        key={card.text.title}
                        href={card.href}
                        className="group relative block overflow-hidden rounded-[28px] border border-white/10 p-5 sm:p-6 min-h-[185px] transition-all duration-500 hover:-translate-y-1.5 hover:border-gold/45"
                        style={{
                          backgroundImage: `linear-gradient(135deg, rgba(5,5,5,0.84), rgba(5,5,5,0.4)), url(${card.image})`,
                          backgroundSize: "cover",
                          backgroundPosition: "center",
                        }}
                      >
                        <div
                          className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500"
                          style={{
                            background:
                              "linear-gradient(135deg, rgba(201,168,76,0.2), rgba(255,255,255,0.02), rgba(201,168,76,0.14))",
                          }}
                        />
                        <div className="relative flex h-full flex-col justify-between">
                          <div className="flex items-start justify-between gap-4">
                            <div>
                              <p className="text-[11px] uppercase tracking-[0.28em] text-white/55">{card.text.label}</p>
                              <h3 className="mt-3 text-2xl sm:text-[2rem] font-heading font-bold text-white leading-tight">
                                {card.text.title}
                              </h3>
                            </div>
                            <div
                              className="flex h-12 w-12 items-center justify-center rounded-2xl border border-white/15 bg-black/30 backdrop-blur-md"
                              style={{ boxShadow: `0 0 35px ${card.accent}20` }}
                            >
                              <Icon className="w-5 h-5" style={{ color: card.accent }} />
                            </div>
                          </div>

                          <div className="flex items-end justify-between gap-4 mt-8">
                            <p className="max-w-sm text-sm sm:text-base leading-relaxed text-white/75">
                              {card.text.subtitle}
                            </p>
                            <div className="flex h-11 w-11 items-center justify-center rounded-full border border-white/15 bg-white/10 opacity-80 group-hover:translate-x-[-6px] group-hover:opacity-100 transition-all duration-500">
                              <ArrowLeft className="w-5 h-5 text-white" />
                            </div>
                          </div>
                        </div>

                        <div className="absolute top-4 left-4 text-[10px] text-white/35">0{index + 1}</div>
                      </Link>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="absolute bottom-0 left-0 right-0">
          <svg viewBox="0 0 1440 120" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-[72px] sm:h-[110px]">
            <path d="M0 89C109 57 219 40 328 45C496 52 609 118 783 118C952 118 1088 23 1280 8C1334 4 1387 5 1440 12V120H0V89Z" fill="#FAF9F6" />
          </svg>
        </div>
      </section>

      <section className="relative py-20 sm:py-24 px-4 sm:px-6 bg-bg">
        <div className="absolute inset-x-0 top-0 h-32 bg-[linear-gradient(180deg,rgba(201,168,76,0.08),transparent)]" />
        <div className="relative max-w-7xl mx-auto">
          <div className="grid lg:grid-cols-[1.1fr_0.9fr] gap-10 items-start mb-14">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-gold/20 bg-white px-4 py-2 text-sm text-gold-700 shadow-soft mb-5">
                <Star className="w-4 h-4" />
                {siteText.home.sectionBadge}
              </div>
              <h2 className="text-3xl sm:text-4xl lg:text-5xl font-heading font-bold leading-tight text-text-primary">
                {siteText.home.sectionTitle}
                <span className="block text-gold mt-2">{siteText.home.sectionTitleAccent}</span>
              </h2>
            </div>

            <div className="rounded-[28px] border border-border-gold bg-white/90 backdrop-blur-sm p-6 sm:p-7 shadow-[0_25px_70px_rgba(38,30,12,0.08)]">
              <div className="grid grid-cols-3 gap-3">
                {siteText.home.inspiration.map((moment) => (
                  <div key={moment.title} className="rounded-[22px] bg-bg-surface px-4 py-5 min-h-[170px] flex flex-col justify-between">
                    <div className="w-9 h-9 rounded-full bg-gold/10 flex items-center justify-center text-gold font-mono text-sm">
                      {moment.title.charAt(0)}
                    </div>
                    <div>
                      <h3 className="font-heading text-lg text-text-primary mb-2">{moment.title}</h3>
                      <p className="text-sm leading-relaxed text-text-muted">{moment.text}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {featureCards.map((feature) => (
              <div
                key={feature.text.title}
                className={`group rounded-[28px] border border-border-subtle bg-gradient-to-br ${feature.tone} p-7 shadow-card hover:shadow-[0_24px_60px_rgba(0,0,0,0.08)] hover:-translate-y-1 transition-all duration-300`}
              >
                <div className="w-12 h-12 rounded-2xl bg-black text-gold flex items-center justify-center mb-5 shadow-gold">
                  <feature.icon className="w-5 h-5" />
                </div>
                <h3 className="font-heading text-2xl text-text-primary mb-3">{feature.text.title}</h3>
                <p className="text-text-muted leading-relaxed text-sm sm:text-base">{feature.text.desc}</p>
              </div>
            ))}
          </div>

          <div className="mt-14 rounded-[34px] overflow-hidden border border-border-gold bg-[#0A0A0A] text-white shadow-[0_30px_80px_rgba(0,0,0,0.18)]">
            <div className="grid lg:grid-cols-[0.85fr_1.15fr]">
              <div className="relative min-h-[320px]">
                <div
                  className="absolute inset-0 bg-cover bg-center"
                  style={{
                    backgroundImage:
                      "linear-gradient(135deg, rgba(10,10,10,0.2), rgba(10,10,10,0.78)), url('https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?auto=format&fit=crop&w=1400&q=80')",
                  }}
                />
                <div className="relative h-full p-8 sm:p-10 flex flex-col justify-end">
                  <p className="text-xs tracking-[0.32em] uppercase text-gold-light/80 mb-4">{siteText.home.lobbyEyebrow}</p>
                  <h3 className="text-3xl sm:text-4xl font-heading font-bold leading-tight max-w-sm">
                    {siteText.home.lobbyTitle}
                  </h3>
                </div>
              </div>

              <div className="p-8 sm:p-10 lg:p-12">
                <div className="grid sm:grid-cols-3 gap-5 mb-8">
                  {communityHighlights.map((item) => {
                    const Icon = item.icon;
                    return (
                      <div key={item.text.title} className="rounded-[22px] border border-white/10 bg-white/5 px-4 py-5 backdrop-blur-sm">
                        <Icon className="w-5 h-5 text-gold mb-4" />
                        <h4 className="font-heading text-xl mb-2">{item.text.title}</h4>
                        <p className="text-sm text-white/65 leading-relaxed">{item.text.text}</p>
                      </div>
                    );
                  })}
                </div>

                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 rounded-[26px] border border-gold/20 bg-gold/10 px-5 py-5">
                  <div>
                    <p className="text-sm text-gold-light mb-1">{siteText.home.ctaLead}</p>
                    <p className="text-lg font-heading">{siteText.home.ctaText}</p>
                  </div>
                  <Link href="/login" className="btn-gold whitespace-nowrap">
                    {siteText.home.ctaButton}
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <footer className="bg-[#050505] py-8 px-4 border-t border-white/5">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <Logo size="sm" variant="dark" />
            <p className="text-sm text-white/55">{siteText.brand.footer}</p>
          </div>
          <p className="text-white/35 text-sm">{siteText.brand.copyright}</p>
        </div>
      </footer>
    </div>
  );
}


