"use client";
// Designer "לידים מהקהילה" page.
//
// Standalone page at /designer/[id]/leads for designers to browse the
// anonymized community feed and manage leads that were assigned to them.
//
// This page is the designer-side counterpart of /admin/leads. It reuses
// CommunityLeadsFeed so the same UX can be embedded elsewhere (e.g. as a
// tab inside the main designer dashboard) without duplication.

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowRight, Home as HomeIcon } from "lucide-react";
import CommunityLeadsFeed from "@/components/leads/CommunityLeadsFeed";

export default function DesignerLeadsPage() {
  const params = useParams<{ id: string }>();
  const designerId = params?.id;
  const [gender, setGender] = useState<string>("female");

  useEffect(() => {
    if (!designerId) return;
    let cancelled = false;
    fetch(`/api/designer/profile?id=${designerId}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (!cancelled && d?.profile?.gender) setGender(d.profile.gender);
      })
      .catch(() => { /* keep default */ });
    return () => { cancelled = true; };
  }, [designerId]);

  return (
    <div className="min-h-screen bg-bg-page py-6 px-4 lg:px-8">
      <div className="max-w-6xl mx-auto">
        <div className="mb-4 flex items-center justify-between gap-3 flex-wrap">
          <Link
            href={`/designer/${designerId}`}
            className="inline-flex items-center gap-1 text-text-muted hover:text-gold text-sm transition-colors"
          >
            <ArrowRight className="w-4 h-4" /> חזרה לדשבורד
          </Link>
          <Link
            href={`/designer/${designerId}#clients`}
            className="inline-flex items-center gap-1 text-text-muted hover:text-gold text-sm transition-colors"
          >
            <HomeIcon className="w-4 h-4" /> הלקוחות שלי
          </Link>
        </div>

        <CommunityLeadsFeed gender={gender} />
      </div>
    </div>
  );
}
