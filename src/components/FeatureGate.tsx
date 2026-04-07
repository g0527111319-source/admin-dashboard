"use client";
import { ReactNode, useEffect, useState } from "react";
import Link from "next/link";
import { Lock } from "lucide-react";

type Props = {
  feature: string;
  children: ReactNode;
  designerId?: string;
};

export default function FeatureGate({ feature, children, designerId }: Props) {
  const [hasAccess, setHasAccess] = useState<boolean | null>(null);

  useEffect(() => {
    if (!designerId) {
      // No designer id — demo mode, allow
      setHasAccess(true);
      return;
    }
    let cancelled = false;
    fetch(
      `/api/designer/check-feature?feature=${encodeURIComponent(
        feature
      )}&designerId=${encodeURIComponent(designerId)}`
    )
      .then((r) => r.json())
      .then((d) => {
        if (!cancelled) setHasAccess(Boolean(d.hasAccess));
      })
      .catch(() => {
        if (!cancelled) setHasAccess(false);
      });
    return () => {
      cancelled = true;
    };
  }, [feature, designerId]);

  if (hasAccess === null) {
    return (
      <div className="text-white/60 text-center py-12" dir="rtl">
        טוען...
      </div>
    );
  }

  if (!hasAccess) {
    return (
      <div
        dir="rtl"
        className="bg-[#1a1a2e] border border-[#C9A84C]/30 rounded-2xl p-12 text-center"
      >
        <Lock className="w-16 h-16 text-[#C9A84C] mx-auto mb-4" />
        <h3 className="text-2xl text-white mb-3">תוכן זה זמין במנוי מקצועי</h3>
        <p className="text-white/60 mb-6">
          שדרגי את המנוי שלך כדי לקבל גישה למערכת ניהול הלקוחות, כרטיס ביקור,
          חוזים ועוד
        </p>
        <Link
          href="./subscription"
          className="inline-block bg-[#C9A84C] text-black px-8 py-3 rounded-xl font-semibold hover:bg-[#e0c068] transition-colors"
        >
          שדרגי עכשיו
        </Link>
      </div>
    );
  }

  return <>{children}</>;
}
