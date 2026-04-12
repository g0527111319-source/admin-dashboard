"use client";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import type { BusinessCardData } from "@/lib/businessCardThemes";
import { defaultBusinessCard } from "@/lib/businessCardThemes";
import BusinessCardPreview from "@/components/business-card/BusinessCardPreview";

interface CardPageData {
  card: Partial<BusinessCardData> | null;
  profile: {
    fullName: string;
    specialization?: string | null;
    phone: string;
    email?: string | null;
  };
  profileType: "designer" | "supplier";
}

export default function PublicCardPage() {
  const params = useParams();
  const id = params?.id as string;
  const [cardData, setCardData] = useState<BusinessCardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!id) return;

    fetch(`/api/business-card/${id}`)
      .then((res) => {
        if (!res.ok) throw new Error("not found");
        return res.json();
      })
      .then((data: CardPageData) => {
        const { card, profile } = data;

        // Build card data from saved card or defaults + profile
        const merged: BusinessCardData = {
          ...defaultBusinessCard,
          ...(card || {}),
          fields: (card?.fields as BusinessCardData["fields"]) || [
            { id: "1", label: "שם מלא", value: profile.fullName, icon: "user" },
            { id: "2", label: "תפקיד", value: profile.specialization || "", icon: "briefcase" },
            { id: "3", label: "טלפון", value: profile.phone, icon: "phone" },
            { id: "4", label: "מייל", value: profile.email || "", icon: "mail" },
          ],
          socialLinks: (card?.socialLinks as BusinessCardData["socialLinks"]) || [],
          testimonials: (card?.testimonials as BusinessCardData["testimonials"]) || [],
          customColors: (card?.customColors as BusinessCardData["customColors"]) || {},
        };

        setCardData(merged);
        setLoading(false);
      })
      .catch(() => {
        setNotFound(true);
        setLoading(false);
      });
  }, [id]);

  if (loading) {
    return (
      <div
        style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#f8f7f4",
        }}
      >
        <div
          style={{
            width: 32,
            height: 32,
            border: "3px solid #C9A84C",
            borderTopColor: "transparent",
            borderRadius: "50%",
            animation: "spin 0.8s linear infinite",
          }}
        />
        <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
      </div>
    );
  }

  if (notFound || !cardData) {
    return (
      <div
        style={{
          minHeight: "100vh",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: "#f8f7f4",
          fontFamily: "system-ui, sans-serif",
          direction: "rtl",
          gap: 12,
        }}
      >
        <span style={{ fontSize: 48 }}>404</span>
        <p style={{ color: "#666", fontSize: 16 }}>כרטיס הביקור לא נמצא</p>
      </div>
    );
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#f8f7f4",
        padding: "20px 16px 40px",
        display: "flex",
        justifyContent: "center",
      }}
    >
      <div style={{ width: "100%", maxWidth: 480 }}>
        <BusinessCardPreview data={cardData} viewMode="mobile" designerId={id} />
      </div>
    </div>
  );
}
