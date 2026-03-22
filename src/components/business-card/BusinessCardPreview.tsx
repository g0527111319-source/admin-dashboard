"use client";
import Image from "next/image";
import { useState } from "react";
import { Phone, Mail, Globe, MapPin, User, Briefcase, Star, Clock, Building2, Facebook, Instagram, Linkedin, Youtube, MessageCircle, Image as ImageIcon, Quote, ChevronLeft, ChevronRight, X, QrCode, Play, Tag, ArrowLeftRight, BarChart3, Download, Navigation, Sun, Moon, Award, Users as UsersIcon, } from "lucide-react";
import type { BusinessCardData, CardColors, CardTheme, BeforeAfterItem, BusinessHours, ProfessionalStats, EntryAnimation, } from "@/lib/businessCardThemes";
import { getThemeById, getMergedColors, getFontById } from "@/lib/businessCardThemes";

interface BusinessCardPreviewProps {
    data: BusinessCardData;
    viewMode: "mobile" | "desktop";
}

// Icon mapping
function getFieldIcon(iconName: string, size: number, color: string) {
    const props = { size, color, strokeWidth: 1.5 };
    switch (iconName) {
        case "user": return <User {...props}/>;
        case "briefcase": return <Briefcase {...props}/>;
        case "phone": return <Phone {...props}/>;
        case "mail": return <Mail {...props}/>;
        case "mappin": return <MapPin {...props}/>;
        case "city": return <MapPin {...props}/>;
        case "globe": return <Globe {...props}/>;
        case "star": return <Star {...props}/>;
        case "clock": return <Clock {...props}/>;
        case "building": return <Building2 {...props}/>;
        default: return <User {...props}/>;
    }
}

function getSocialIcon(type: string, size: number, color: string) {
    const props = { size, color, strokeWidth: 1.5 };
    switch (type) {
        case "facebook": return <Facebook {...props}/>;
        case "instagram": return <Instagram {...props}/>;
        case "whatsapp": return <MessageCircle {...props}/>;
        case "email": return <Mail {...props}/>;
        case "website": return <Globe {...props}/>;
        case "linkedin": return <Linkedin {...props}/>;
        case "pinterest": return <span style={{ color, fontSize: size * 0.75, fontWeight: 700 }}>P</span>;
        case "tiktok": return <span style={{ color, fontSize: size * 0.75, fontWeight: 700 }}>T</span>;
        case "youtube": return <Youtube {...props}/>;
        case "phone": return <Phone {...props}/>;
        default: return <Globe {...props}/>;
    }
}

// Helper: get current day index (0=Sunday)
function getCurrentDayIndex(): number {
    return new Date().getDay();
}

// Helper: map day string to index
function dayToIndex(day: string): number {
    const map: Record<string, number> = {
        sunday: 0, monday: 1, tuesday: 2, wednesday: 3,
        thursday: 4, friday: 5, saturday: 6,
    };
    return map[day] ?? -1;
}

// Helper: check if currently open based on business hours
function isCurrentlyOpen(hours: BusinessHours[]): boolean {
    const now = new Date();
    const dayIdx = now.getDay();
    const current = hours.find(h => dayToIndex(h.day) === dayIdx);
    if (!current || current.closed) return false;
    const nowMinutes = now.getHours() * 60 + now.getMinutes();
    const [fromH, fromM] = current.from.split(":").map(Number);
    const [toH, toM] = current.to.split(":").map(Number);
    const fromMin = fromH * 60 + fromM;
    const toMin = toH * 60 + toM;
    return nowMinutes >= fromMin && nowMinutes <= toMin;
}

// Helper: generate vCard string
function generateVCard(data: BusinessCardData): string {
    const nameField = data.fields.find(f => f.icon === "user");
    const phoneField = data.fields.find(f => f.icon === "phone");
    const emailField = data.fields.find(f => f.icon === "mail");
    const name = data.title || nameField?.value || "";
    const phone = phoneField?.value || "";
    const email = emailField?.value || "";
    const lines = [
        "BEGIN:VCARD",
        "VERSION:3.0",
        `FN:${name}`,
        `N:${name};;;`,
    ];
    if (phone) lines.push(`TEL;TYPE=CELL:${phone}`);
    if (email) lines.push(`EMAIL:${email}`);
    if (data.subtitle) lines.push(`TITLE:${data.subtitle}`);
    if (data.businessAddress) lines.push(`ADR:;;${data.businessAddress};;;;`);
    lines.push("END:VCARD");
    return lines.join("\n");
}

// Helper: download vCard
function downloadVCard(data: BusinessCardData) {
    const vcard = generateVCard(data);
    const blob = new Blob([vcard], { type: "text/vcard;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "contact.vcf";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

// CSS keyframes for entry animations
const animationStyles = `
@keyframes bcFadeUp {
  from { opacity: 0; transform: translateY(30px); }
  to { opacity: 1; transform: translateY(0); }
}
@keyframes bcSlideIn {
  from { opacity: 0; transform: translateX(60px); }
  to { opacity: 1; transform: translateX(0); }
}
@keyframes bcScaleIn {
  from { opacity: 0; transform: scale(0.85); }
  to { opacity: 1; transform: scale(1); }
}
@keyframes bcStaggerFade {
  from { opacity: 0; transform: translateY(18px); }
  to { opacity: 1; transform: translateY(0); }
}
`;

function getAnimationClass(animation: EntryAnimation | undefined): string {
    switch (animation) {
        case "fade-up": return "bc-anim-fadeup";
        case "slide-in": return "bc-anim-slidein";
        case "scale-in": return "bc-anim-scalein";
        case "stagger": return "bc-anim-stagger";
        default: return "";
    }
}

const animationClassStyles = `
.bc-anim-fadeup { animation: bcFadeUp 0.7s ease-out both; }
.bc-anim-slidein { animation: bcSlideIn 0.7s ease-out both; }
.bc-anim-scalein { animation: bcScaleIn 0.6s ease-out both; }
.bc-anim-stagger > * { animation: bcStaggerFade 0.5s ease-out both; }
.bc-anim-stagger > *:nth-child(1) { animation-delay: 0s; }
.bc-anim-stagger > *:nth-child(2) { animation-delay: 0.08s; }
.bc-anim-stagger > *:nth-child(3) { animation-delay: 0.16s; }
.bc-anim-stagger > *:nth-child(4) { animation-delay: 0.24s; }
.bc-anim-stagger > *:nth-child(5) { animation-delay: 0.32s; }
.bc-anim-stagger > *:nth-child(6) { animation-delay: 0.40s; }
.bc-anim-stagger > *:nth-child(7) { animation-delay: 0.48s; }
.bc-anim-stagger > *:nth-child(8) { animation-delay: 0.56s; }
.bc-anim-stagger > *:nth-child(9) { animation-delay: 0.64s; }
.bc-anim-stagger > *:nth-child(10) { animation-delay: 0.72s; }
`;

export default function BusinessCardPreview({ data, viewMode }: BusinessCardPreviewProps) {
    const [showGallery, setShowGallery] = useState(false);
    const [showTestimonials, setShowTestimonials] = useState(false);
    const [galleryIndex, setGalleryIndex] = useState(0);
    const [beforeAfterIndex, setBeforeAfterIndex] = useState(0);

    const theme: CardTheme = getThemeById(data.themeId);
    const baseColors: CardColors = getMergedColors(theme, data.customColors);

    // Dark mode color inversion
    const colors: CardColors = data.darkMode
        ? {
            ...baseColors,
            background: baseColors.text,
            text: baseColors.background,
            cardBg: darkenColor(baseColors.cardBg, 0.8),
            textMuted: lightenColor(baseColors.textMuted, 0.4),
            border: darkenColor(baseColors.border, 0.6),
            socialBg: darkenColor(baseColors.socialBg, 0.75),
            headerBg: baseColors.headerBg,
            headerText: baseColors.headerText,
            primary: baseColors.primary,
            secondary: baseColors.secondary,
            socialIcon: baseColors.socialIcon,
            buttonBg: baseColors.buttonBg,
            buttonText: baseColors.buttonText,
        }
        : baseColors;

    const isMobile = viewMode === "mobile";
    const containerWidth = isMobile ? 375 : 600;
    const filledFields = data.fields.filter(f => f.value.trim());
    const activeSocials = data.socialLinks.filter(s => s.url.trim());
    const filledTestimonials = data.testimonials.filter(t => t.name.trim() && t.text.trim());
    const hasGallery = data.galleryImages.filter(g => g.trim()).length > 0;
    const galleryImages = data.galleryImages.filter(g => g.trim());
    const borderRadius = theme.cardStyle === "sharp" ? "4px" : theme.cardStyle === "soft" ? "20px" : "12px";

    // Custom fonts override theme defaults
    const bodyFont = getFontById(data.bodyFontId || "heebo");
    const headingFont = getFontById(data.headingFontId || "frank-ruhl");
    const fontFamily = bodyFont.family;
    const headingFamily = headingFont.family;

    // Name & subtitle from fields
    const nameField = filledFields.find(f => f.icon === "user");
    const roleField = filledFields.find(f => f.icon === "briefcase");
    const displayName = data.title || nameField?.value || "";
    const displayRole = data.subtitle || roleField?.value || "";
    const detailFields = filledFields.filter(f => f.icon !== "user" && f.icon !== "briefcase");
    const headerTextColor = data.headerBgImage ? "#FFFFFF" : colors.headerText;

    const animClass = getAnimationClass(data.entryAnimation);
    const hasBeforeAfter = (data.beforeAfterItems?.length ?? 0) > 0;
    const beforeAfterItems = data.beforeAfterItems ?? [];

    return (<div className="mx-auto transition-all duration-500" style={{ width: containerWidth, maxWidth: "100%" }}>
      {/* Inject animation styles */}
      {data.entryAnimation && data.entryAnimation !== "none" && (
          <style dangerouslySetInnerHTML={{ __html: animationStyles + animationClassStyles }} />
      )}

      {/* Card Container */}
      <div className={animClass} style={{
            background: colors.background,
            borderRadius,
            overflow: "hidden",
            fontFamily,
            boxShadow: "0 8px 40px rgba(0,0,0,0.12)",
            direction: "rtl",
        }}>
        {/* Header / Banner */}
        <div style={{
            background: data.headerBgImage
                ? `linear-gradient(rgba(0,0,0,0.45), rgba(0,0,0,0.45)), url(${data.headerBgImage}) center/cover no-repeat`
                : colors.headerBg,
            padding: isMobile ? "28px 24px 20px" : "36px 40px 24px",
            textAlign: "center",
            position: "relative",
        }}>
          {/* Dark mode indicator */}
          {data.darkMode && (
              <div style={{ position: "absolute", top: 10, left: 10 }}>
                  <Moon size={14} color={headerTextColor} strokeWidth={1.5} style={{ opacity: 0.6 }} />
              </div>
          )}

          {/* Avatar */}
          {data.avatarUrl ? (<div style={{
                width: isMobile ? 72 : 90,
                height: isMobile ? 72 : 90,
                borderRadius: "50%",
                border: `3px solid ${colors.primary}`,
                margin: "0 auto 12px",
                overflow: "hidden",
                background: colors.cardBg,
                position: "relative",
            }}>
              <Image src={data.avatarUrl} alt="" fill unoptimized style={{ objectFit: "cover" }} />
            </div>) : (<div style={{
                width: isMobile ? 72 : 90,
                height: isMobile ? 72 : 90,
                borderRadius: "50%",
                border: `3px solid ${colors.primary}`,
                margin: "0 auto 12px",
                background: colors.cardBg,
                position: "relative",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
            }}>
              <User size={isMobile ? 28 : 36} color={colors.primary} strokeWidth={1.5}/>
            </div>)}

          {/* Name */}
          {displayName && (<h2 style={{
                fontFamily: headingFamily,
                fontSize: isMobile ? "1.3rem" : "1.6rem",
                fontWeight: 700,
                color: headerTextColor,
                margin: "0 0 4px",
                lineHeight: 1.3,
            }}>
              {displayName}
            </h2>)}

          {/* Role */}
          {displayRole && (<p style={{
                fontSize: isMobile ? "0.85rem" : "0.95rem",
                color: headerTextColor,
                opacity: 0.8,
                margin: 0,
            }}>
              {displayRole}
            </p>)}

          {/* Logo */}
          {data.logoUrl && (<div style={{ marginTop: 12 }}>
              <Image src={data.logoUrl} alt="" unoptimized width={120} height={32} style={{
                maxHeight: 32,
                maxWidth: 120,
                objectFit: "contain",
                margin: "0 auto",
                display: "block",
            }}/>
            </div>)}
        </div>

        {/* Card Body */}
        <div style={{
            padding: isMobile ? "20px 20px 24px" : "28px 36px 32px",
            background: colors.background,
        }}>
          {/* Detail Fields */}
          {detailFields.length > 0 && (<div style={{ marginBottom: 20 }}>
              {detailFields.map((field) => (<div key={field.id} style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    padding: "8px 0",
                    borderBottom: `1px solid ${colors.border}`,
                }}>
                  <div style={{
                    width: 32,
                    height: 32,
                    borderRadius: "8px",
                    background: colors.socialBg,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                }}>
                    {getFieldIcon(field.icon, 16, colors.primary)}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{
                    fontSize: "0.7rem",
                    color: colors.textMuted,
                    margin: "0 0 1px",
                    lineHeight: 1.2,
                }}>
                      {field.label}
                    </p>
                    <p style={{
                    fontSize: isMobile ? "0.85rem" : "0.9rem",
                    color: colors.text,
                    margin: 0,
                    fontWeight: 500,
                    lineHeight: 1.3,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                }}>
                      {field.value}
                    </p>
                  </div>
                </div>))}
            </div>)}

          {/* Social Links */}
          {activeSocials.length > 0 && (<div style={{ marginBottom: 20 }}>
              <div style={{
                display: "flex",
                flexWrap: "wrap",
                gap: 8,
                justifyContent: "center",
            }}>
                {activeSocials.map((social, i) => (<div key={i} style={{
                    width: 40,
                    height: 40,
                    borderRadius: theme.cardStyle === "sharp" ? "4px" : "10px",
                    background: colors.socialBg,
                    border: `1px solid ${colors.border}`,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    cursor: "pointer",
                    transition: "all 0.2s",
                }} title={social.type}>
                    {getSocialIcon(social.type, 18, colors.socialIcon)}
                  </div>))}
              </div>
            </div>)}

          {/* Expertise Tag Cloud */}
          {(data.expertiseTags?.length ?? 0) > 0 && (
              <div style={{ marginBottom: 20 }}>
                  <div style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 6,
                      marginBottom: 10,
                  }}>
                      <Tag size={14} color={colors.primary} strokeWidth={1.5} />
                      <span style={{ fontSize: "0.8rem", fontWeight: 600, color: colors.text }}>
                          {"\u05EA\u05D7\u05D5\u05DE\u05D5\u05EA \u05DE\u05D5\u05DE\u05D7\u05D9\u05D5\u05EA"}
                      </span>
                  </div>
                  <div style={{
                      display: "flex",
                      flexWrap: "wrap",
                      gap: 6,
                      justifyContent: "center",
                  }}>
                      {data.expertiseTags!.map((tag, idx) => {
                          const isLarge = idx < 2;
                          const isMedium = idx >= 2 && idx < 5;
                          const fontSize = isLarge ? "0.82rem" : isMedium ? "0.75rem" : "0.7rem";
                          const padY = isLarge ? "5px" : isMedium ? "4px" : "3px";
                          const padX = isLarge ? "14px" : isMedium ? "11px" : "9px";
                          const bg = idx % 2 === 0 ? colors.primary : colors.secondary;
                          const textColor = idx % 2 === 0 ? colors.buttonText : colors.text;
                          return (
                              <span key={idx} style={{
                                  display: "inline-block",
                                  padding: `${padY} ${padX}`,
                                  borderRadius: "999px",
                                  background: bg,
                                  color: textColor,
                                  fontSize,
                                  fontWeight: 500,
                                  lineHeight: 1.3,
                                  whiteSpace: "nowrap",
                              }}>
                                  {tag}
                              </span>
                          );
                      })}
                  </div>
              </div>
          )}

          {/* Professional Stats */}
          {data.showStats && data.professionalStats && (
              <div style={{ marginBottom: 20 }}>
                  <div style={{
                      display: "grid",
                      gridTemplateColumns: "repeat(4, 1fr)",
                      gap: isMobile ? 6 : 10,
                  }}>
                      {[
                          { icon: <Briefcase size={16} color={colors.primary} strokeWidth={1.5} />, value: data.professionalStats.yearsExperience, label: "\u05E9\u05E0\u05D5\u05EA \u05E0\u05D9\u05E1\u05D9\u05D5\u05DF" },
                          { icon: <Award size={16} color={colors.primary} strokeWidth={1.5} />, value: data.professionalStats.projectsCompleted, label: "\u05E4\u05E8\u05D5\u05D9\u05E7\u05D8\u05D9\u05DD" },
                          { icon: <Star size={16} color={colors.primary} strokeWidth={1.5} />, value: data.professionalStats.averageRating, label: "\u05D3\u05D9\u05E8\u05D5\u05D2" },
                          { icon: <UsersIcon size={16} color={colors.primary} strokeWidth={1.5} />, value: data.professionalStats.happyClients, label: "\u05DC\u05E7\u05D5\u05D7\u05D5\u05EA" },
                      ].map((stat, idx) => (
                          <div key={idx} style={{
                              textAlign: "center",
                              padding: isMobile ? "10px 4px" : "12px 8px",
                              background: colors.socialBg,
                              borderRadius: theme.cardStyle === "sharp" ? "4px" : "10px",
                              border: `1px solid ${colors.border}`,
                          }}>
                              <div style={{ marginBottom: 4 }}>{stat.icon}</div>
                              <div style={{
                                  fontSize: isMobile ? "1.1rem" : "1.3rem",
                                  fontWeight: 700,
                                  color: colors.primary,
                                  lineHeight: 1.2,
                              }}>
                                  {stat.value}
                              </div>
                              <div style={{
                                  fontSize: "0.6rem",
                                  color: colors.textMuted,
                                  marginTop: 2,
                                  lineHeight: 1.2,
                              }}>
                                  {stat.label}
                              </div>
                          </div>
                      ))}
                  </div>
              </div>
          )}

          {/* Business Hours */}
          {data.showBusinessHours && data.businessHours && data.businessHours.length > 0 && (
              <div style={{ marginBottom: 20 }}>
                  <div style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 6,
                      marginBottom: 10,
                  }}>
                      <Clock size={14} color={colors.primary} strokeWidth={1.5} />
                      <span style={{ fontSize: "0.8rem", fontWeight: 600, color: colors.text }}>
                          {"\u05E9\u05E2\u05D5\u05EA \u05E4\u05E2\u05D9\u05DC\u05D5\u05EA"}
                      </span>
                      {(() => {
                          const open = isCurrentlyOpen(data.businessHours!);
                          return (
                              <span style={{
                                  fontSize: "0.65rem",
                                  fontWeight: 600,
                                  color: open ? "#16a34a" : "#dc2626",
                                  marginRight: 6,
                                  display: "flex",
                                  alignItems: "center",
                                  gap: 3,
                              }}>
                                  <span style={{
                                      width: 7,
                                      height: 7,
                                      borderRadius: "50%",
                                      background: open ? "#16a34a" : "#dc2626",
                                      display: "inline-block",
                                  }} />
                                  {open ? "\u05E4\u05EA\u05D5\u05D7" : "\u05E1\u05D2\u05D5\u05E8"}
                              </span>
                          );
                      })()}
                  </div>
                  <div style={{
                      background: colors.socialBg,
                      borderRadius: theme.cardStyle === "sharp" ? "4px" : "10px",
                      border: `1px solid ${colors.border}`,
                      overflow: "hidden",
                  }}>
                      {data.businessHours.map((h, idx) => {
                          const isToday = dayToIndex(h.day) === getCurrentDayIndex();
                          return (
                              <div key={idx} style={{
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent: "space-between",
                                  padding: "6px 12px",
                                  borderBottom: idx < data.businessHours!.length - 1 ? `1px solid ${colors.border}` : "none",
                                  background: isToday ? `${colors.primary}10` : "transparent",
                              }}>
                                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                                      {isToday && (
                                          <span style={{
                                              width: 6,
                                              height: 6,
                                              borderRadius: "50%",
                                              background: colors.primary,
                                              display: "inline-block",
                                          }} />
                                      )}
                                      <span style={{
                                          fontSize: "0.75rem",
                                          fontWeight: isToday ? 700 : 500,
                                          color: isToday ? colors.primary : colors.text,
                                      }}>
                                          {h.dayHe}
                                      </span>
                                  </div>
                                  <span style={{
                                      fontSize: "0.72rem",
                                      color: h.closed ? "#dc2626" : colors.textMuted,
                                      fontWeight: h.closed ? 600 : 400,
                                      direction: "ltr",
                                  }}>
                                      {h.closed ? "\u05E1\u05D2\u05D5\u05E8" : `${h.from} - ${h.to}`}
                                  </span>
                              </div>
                          );
                      })}
                  </div>
              </div>
          )}

          {/* Before/After Portfolio */}
          {hasBeforeAfter && (
              <div style={{ marginBottom: 20 }}>
                  <div style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 6,
                      marginBottom: 10,
                  }}>
                      <ArrowLeftRight size={14} color={colors.primary} strokeWidth={1.5} />
                      <span style={{ fontSize: "0.8rem", fontWeight: 600, color: colors.text }}>
                          {"\u05DC\u05E4\u05E0\u05D9 / \u05D0\u05D7\u05E8\u05D9"}
                      </span>
                  </div>
                  <div style={{
                      background: colors.socialBg,
                      borderRadius: theme.cardStyle === "sharp" ? "4px" : "12px",
                      border: `1px solid ${colors.border}`,
                      overflow: "hidden",
                      position: "relative",
                  }}>
                      {/* Image pair */}
                      <div style={{ display: "flex", gap: 0 }}>
                          {/* Before */}
                          <div style={{ flex: 1, position: "relative" }}>
                              <div style={{
                                  aspectRatio: "4/3",
                                  background: colors.border,
                                  position: "relative",
                                  overflow: "hidden",
                              }}>
                                  {beforeAfterItems[beforeAfterIndex]?.beforeUrl && (
                                      <Image
                                          src={beforeAfterItems[beforeAfterIndex].beforeUrl}
                                          alt=""
                                          fill
                                          unoptimized
                                          style={{ objectFit: "cover" }}
                                      />
                                  )}
                                  <span style={{
                                      position: "absolute",
                                      bottom: 6,
                                      right: 6,
                                      background: "rgba(0,0,0,0.6)",
                                      color: "#fff",
                                      fontSize: "0.65rem",
                                      padding: "2px 8px",
                                      borderRadius: "4px",
                                      fontWeight: 600,
                                  }}>
                                      {"\u05DC\u05E4\u05E0\u05D9"}
                                  </span>
                              </div>
                          </div>
                          {/* Divider */}
                          <div style={{ width: 2, background: colors.primary }} />
                          {/* After */}
                          <div style={{ flex: 1, position: "relative" }}>
                              <div style={{
                                  aspectRatio: "4/3",
                                  background: colors.border,
                                  position: "relative",
                                  overflow: "hidden",
                              }}>
                                  {beforeAfterItems[beforeAfterIndex]?.afterUrl && (
                                      <Image
                                          src={beforeAfterItems[beforeAfterIndex].afterUrl}
                                          alt=""
                                          fill
                                          unoptimized
                                          style={{ objectFit: "cover" }}
                                      />
                                  )}
                                  <span style={{
                                      position: "absolute",
                                      bottom: 6,
                                      left: 6,
                                      background: "rgba(0,0,0,0.6)",
                                      color: "#fff",
                                      fontSize: "0.65rem",
                                      padding: "2px 8px",
                                      borderRadius: "4px",
                                      fontWeight: 600,
                                  }}>
                                      {"\u05D0\u05D7\u05E8\u05D9"}
                                  </span>
                              </div>
                          </div>
                      </div>
                      {/* Caption */}
                      {beforeAfterItems[beforeAfterIndex]?.caption && (
                          <div style={{
                              padding: "8px 12px",
                              textAlign: "center",
                              fontSize: "0.75rem",
                              color: colors.textMuted,
                          }}>
                              {beforeAfterItems[beforeAfterIndex].caption}
                          </div>
                      )}
                      {/* Navigation arrows */}
                      {beforeAfterItems.length > 1 && (
                          <div style={{
                              display: "flex",
                              justifyContent: "center",
                              gap: 12,
                              padding: "6px 0 10px",
                          }}>
                              <button
                                  onClick={() => setBeforeAfterIndex(i => (i + 1) % beforeAfterItems.length)}
                                  style={{
                                      width: 28, height: 28, borderRadius: "50%",
                                      background: colors.primary, border: "none",
                                      cursor: "pointer", display: "flex",
                                      alignItems: "center", justifyContent: "center",
                                  }}
                              >
                                  <ChevronLeft size={16} color={colors.buttonText} />
                              </button>
                              <span style={{ fontSize: "0.7rem", color: colors.textMuted, alignSelf: "center" }}>
                                  {beforeAfterIndex + 1} / {beforeAfterItems.length}
                              </span>
                              <button
                                  onClick={() => setBeforeAfterIndex(i => (i - 1 + beforeAfterItems.length) % beforeAfterItems.length)}
                                  style={{
                                      width: 28, height: 28, borderRadius: "50%",
                                      background: colors.primary, border: "none",
                                      cursor: "pointer", display: "flex",
                                      alignItems: "center", justifyContent: "center",
                                  }}
                              >
                                  <ChevronRight size={16} color={colors.buttonText} />
                              </button>
                          </div>
                      )}
                  </div>
              </div>
          )}

          {/* Video Embed */}
          {data.videoUrl && (
              <div style={{ marginBottom: 20 }}>
                  <div
                      onClick={() => window.open(data.videoUrl, "_blank")}
                      style={{
                          position: "relative",
                          aspectRatio: "16/9",
                          background: `linear-gradient(135deg, ${colors.primary}22, ${colors.secondary}33)`,
                          borderRadius: theme.cardStyle === "sharp" ? "4px" : "12px",
                          border: `1px solid ${colors.border}`,
                          cursor: "pointer",
                          display: "flex",
                          flexDirection: "column",
                          alignItems: "center",
                          justifyContent: "center",
                          gap: 8,
                          overflow: "hidden",
                      }}
                  >
                      <div style={{
                          width: 48,
                          height: 48,
                          borderRadius: "50%",
                          background: colors.primary,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          boxShadow: `0 4px 16px ${colors.primary}44`,
                      }}>
                          <Play size={22} color={colors.buttonText} strokeWidth={2} style={{ marginRight: -2 }} />
                      </div>
                      <span style={{
                          fontSize: "0.8rem",
                          fontWeight: 600,
                          color: colors.text,
                      }}>
                          {"\u05E6\u05E4\u05D5 \u05D1\u05E1\u05E8\u05D8\u05D5\u05DF \u05EA\u05D3\u05DE\u05D9\u05EA"}
                      </span>
                  </div>
              </div>
          )}

          {/* Action Buttons */}
          <div style={{
            display: "flex",
            gap: 8,
            flexDirection: isMobile ? "column" : "row",
        }}>
            {/* Gallery Button */}
            {hasGallery && (<button onClick={() => setShowGallery(true)} style={{
                flex: 1,
                padding: "10px 16px",
                borderRadius: theme.cardStyle === "sharp" ? "4px" : "8px",
                background: colors.buttonBg,
                color: colors.buttonText,
                border: "none",
                fontSize: "0.85rem",
                fontWeight: 600,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 6,
                fontFamily,
            }}>
                <ImageIcon size={16}/>
                <span>{"\u05D2\u05DC\u05E8\u05D9\u05D4 ("}{galleryImages.length})</span>
              </button>)}

            {/* Testimonials Button */}
            {filledTestimonials.length > 0 && (<button onClick={() => setShowTestimonials(true)} style={{
                flex: 1,
                padding: "10px 16px",
                borderRadius: theme.cardStyle === "sharp" ? "4px" : "8px",
                background: "transparent",
                color: colors.primary,
                border: `2px solid ${colors.primary}`,
                fontSize: "0.85rem",
                fontWeight: 600,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 6,
                fontFamily,
            }}>
                <Quote size={16}/>
                <span>{"\u05DC\u05E7\u05D5\u05D7\u05D5\u05EA \u05DE\u05DE\u05DC\u05D9\u05E6\u05D9\u05DD ("}{filledTestimonials.length})</span>
              </button>)}
          </div>

          {/* Save Contact (vCard) Button */}
          {data.showVCard && (
              <div style={{ marginTop: 8 }}>
                  <button
                      onClick={() => downloadVCard(data)}
                      style={{
                          width: "100%",
                          padding: "10px 16px",
                          borderRadius: theme.cardStyle === "sharp" ? "4px" : "8px",
                          background: colors.buttonBg,
                          color: colors.buttonText,
                          border: "none",
                          fontSize: "0.85rem",
                          fontWeight: 600,
                          cursor: "pointer",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          gap: 6,
                          fontFamily,
                      }}
                  >
                      <Download size={16} />
                      <span>{"\u05E9\u05DE\u05D5\u05E8 \u05D0\u05D9\u05E9 \u05E7\u05E9\u05E8"}</span>
                  </button>
              </div>
          )}

          {/* Maps / Waze Buttons */}
          {data.showMapButton && data.businessAddress && (
              <div style={{
                  display: "flex",
                  gap: 8,
                  marginTop: 8,
              }}>
                  <button
                      onClick={() => window.open(`https://waze.com/ul?q=${encodeURIComponent(data.businessAddress!)}`, "_blank")}
                      style={{
                          flex: 1,
                          padding: "10px 12px",
                          borderRadius: theme.cardStyle === "sharp" ? "4px" : "8px",
                          background: "transparent",
                          color: colors.primary,
                          border: `2px solid ${colors.primary}`,
                          fontSize: "0.8rem",
                          fontWeight: 600,
                          cursor: "pointer",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          gap: 5,
                          fontFamily,
                      }}
                  >
                      <Navigation size={14} />
                      <span>Waze</span>
                  </button>
                  <button
                      onClick={() => window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(data.businessAddress!)}`, "_blank")}
                      style={{
                          flex: 1,
                          padding: "10px 12px",
                          borderRadius: theme.cardStyle === "sharp" ? "4px" : "8px",
                          background: "transparent",
                          color: colors.primary,
                          border: `2px solid ${colors.primary}`,
                          fontSize: "0.8rem",
                          fontWeight: 600,
                          cursor: "pointer",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          gap: 5,
                          fontFamily,
                      }}
                  >
                      <MapPin size={14} />
                      <span>{"\u05E0\u05D5\u05D5\u05D8 \u05D0\u05DC\u05D9\u05E0\u05D5"}</span>
                  </button>
              </div>
          )}

          {/* QR Code */}
          {data.showQrCode && (
              <div style={{
                  marginTop: 16,
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: 6,
              }}>
                  <div style={{
                      width: 64,
                      height: 64,
                      display: "grid",
                      gridTemplateColumns: "repeat(5, 1fr)",
                      gridTemplateRows: "repeat(5, 1fr)",
                      gap: 1,
                  }}>
                      {Array.from({ length: 25 }).map((_, i) => {
                          // Create a QR-like pattern: corners are filled, center has pattern
                          const row = Math.floor(i / 5);
                          const col = i % 5;
                          const isCorner = (row < 2 && col < 2) || (row < 2 && col > 2) || (row > 2 && col < 2);
                          const isCenter = row === 2 && col === 2;
                          const isFilled = isCorner || isCenter || (row === 1 && col === 2) || (row === 3 && col === 4);
                          return (
                              <div
                                  key={i}
                                  style={{
                                      background: isFilled ? colors.primary : colors.socialBg,
                                      borderRadius: 1,
                                  }}
                              />
                          );
                      })}
                  </div>
                  <span style={{
                      fontSize: "0.65rem",
                      color: colors.textMuted,
                      fontWeight: 500,
                  }}>
                      {"\u05E1\u05E8\u05D5\u05E7 \u05D0\u05D5\u05EA\u05D9"}
                  </span>
              </div>
          )}

          {/* Empty state */}
          {filledFields.length === 0 && activeSocials.length === 0 && !hasGallery && filledTestimonials.length === 0 && (<div style={{ textAlign: "center", padding: "20px 0", color: colors.textMuted }}>
              <User size={32} style={{ margin: "0 auto 8px", opacity: 0.3 }}/>
              <p style={{ fontSize: "0.85rem" }}>{"\u05D4\u05EA\u05D7\u05D9\u05DC\u05D5 \u05DC\u05DE\u05DC\u05D0 \u05E4\u05E8\u05D8\u05D9\u05DD \u05DB\u05D3\u05D9 \u05DC\u05E8\u05D0\u05D5\u05EA \u05EA\u05E6\u05D5\u05D2\u05D4 \u05DE\u05E7\u05D3\u05D9\u05DE\u05D4"}</p>
            </div>)}
        </div>

        {/* Footer */}
        <div style={{
            padding: "12px 20px",
            borderTop: `1px solid ${colors.border}`,
            textAlign: "center",
            background: colors.cardBg,
        }}>
          <p style={{ fontSize: "0.65rem", color: colors.textMuted, margin: 0 }}>{"\u05DB\u05E8\u05D8\u05D9\u05E1 \u05D1\u05D9\u05E7\u05D5\u05E8 \u05D3\u05D9\u05D2\u05D9\u05D8\u05DC\u05D9"}</p>
        </div>
      </div>

      {/* Gallery Modal */}
      {showGallery && galleryImages.length > 0 && (<div style={{
                position: "fixed",
                inset: 0,
                background: "rgba(0,0,0,0.85)",
                zIndex: 100,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                padding: 16,
            }} onClick={() => setShowGallery(false)}>
          <div style={{
                maxWidth: 500,
                width: "100%",
                background: colors.cardBg,
                position: "relative",
                borderRadius,
                overflow: "hidden",
            }} onClick={e => e.stopPropagation()}>
            <div style={{ position: "relative", aspectRatio: "4/3", background: colors.background }}>
              <Image src={galleryImages[galleryIndex]} alt="" fill unoptimized style={{ objectFit: "cover" }} onError={(e) => {
                (e.target as HTMLImageElement).style.display = "none";
            }}/>
              {galleryImages.length > 1 && (<>
                  <button onClick={() => setGalleryIndex(i => (i + 1) % galleryImages.length)} style={{
                    position: "absolute", left: 8, top: "50%", transform: "translateY(-50%)",
                    width: 32, height: 32, borderRadius: "50%", background: "rgba(0,0,0,0.5)",
                    border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
                }}>
                    <ChevronLeft size={18} color="#fff"/>
                  </button>
                  <button onClick={() => setGalleryIndex(i => (i - 1 + galleryImages.length) % galleryImages.length)} style={{
                    position: "absolute", right: 8, top: "50%", transform: "translateY(-50%)",
                    width: 32, height: 32, borderRadius: "50%", background: "rgba(0,0,0,0.5)",
                    border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
                }}>
                    <ChevronRight size={18} color="#fff"/>
                  </button>
                </>)}
              <button onClick={() => setShowGallery(false)} style={{
                position: "absolute", top: 8, left: 8,
                width: 28, height: 28, borderRadius: "50%", background: "rgba(0,0,0,0.5)",
                border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
            }}>
                <X size={16} color="#fff"/>
              </button>
            </div>
            <div style={{
                padding: "12px 16px",
                textAlign: "center",
                fontSize: "0.8rem",
                color: colors.textMuted,
                fontFamily,
                direction: "rtl",
            }}>
              {galleryIndex + 1} / {galleryImages.length}
            </div>
          </div>
        </div>)}

      {/* Testimonials Modal */}
      {showTestimonials && filledTestimonials.length > 0 && (<div style={{
                position: "fixed",
                inset: 0,
                background: "rgba(0,0,0,0.85)",
                zIndex: 100,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                padding: 16,
            }} onClick={() => setShowTestimonials(false)}>
          <div style={{
                maxWidth: 420,
                width: "100%",
                background: colors.cardBg,
                position: "relative",
                borderRadius,
                padding: isMobile ? 20 : 28,
                direction: "rtl",
                fontFamily,
            }} onClick={e => e.stopPropagation()}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
              <h3 style={{ fontFamily: headingFamily, fontSize: "1.1rem", fontWeight: 700, color: colors.text, margin: 0 }}>{"\u05DC\u05E7\u05D5\u05D7\u05D5\u05EA \u05DE\u05DE\u05DC\u05D9\u05E6\u05D9\u05DD"}</h3>
              <button onClick={() => setShowTestimonials(false)} style={{ background: "none", border: "none", cursor: "pointer", padding: 4 }}>
                <X size={18} color={colors.textMuted}/>
              </button>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {filledTestimonials.map((t) => (<div key={t.id} style={{
                    padding: 14,
                    background: colors.socialBg,
                    borderRadius: theme.cardStyle === "sharp" ? "4px" : "10px",
                    border: `1px solid ${colors.border}`,
                }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                    <Quote size={14} color={colors.primary}/>
                    <span style={{ fontWeight: 600, fontSize: "0.85rem", color: colors.text }}>{t.name}</span>
                  </div>
                  <p style={{ fontSize: "0.8rem", color: colors.textMuted, margin: 0, lineHeight: 1.6 }}>
                    {t.text}
                  </p>
                </div>))}
            </div>
          </div>
        </div>)}
    </div>);
}

// Utility: darken a hex color by a factor (0-1, where 0 is black)
function darkenColor(hex: string, factor: number): string {
    const c = hexToRgb(hex);
    if (!c) return hex;
    const r = Math.round(c.r * factor);
    const g = Math.round(c.g * factor);
    const b = Math.round(c.b * factor);
    return rgbToHex(r, g, b);
}

// Utility: lighten a hex color by a factor toward white
function lightenColor(hex: string, factor: number): string {
    const c = hexToRgb(hex);
    if (!c) return hex;
    const r = Math.round(c.r + (255 - c.r) * factor);
    const g = Math.round(c.g + (255 - c.g) * factor);
    const b = Math.round(c.b + (255 - c.b) * factor);
    return rgbToHex(r, g, b);
}

function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result
        ? { r: parseInt(result[1], 16), g: parseInt(result[2], 16), b: parseInt(result[3], 16) }
        : null;
}

function rgbToHex(r: number, g: number, b: number): string {
    return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
}
