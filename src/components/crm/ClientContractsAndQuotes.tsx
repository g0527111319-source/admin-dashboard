"use client";
// Wrapper component that hosts contracts and quotes for a single client
// under one client sub-tab. Was two separate sub-tabs ("חוזים", "הצעות מחיר")
// — collapsing them keeps the per-client tab list shorter without losing
// either feature.
//
// Internal structure: 2 tabs — "חוזים" then "הצעות מחיר".
// Templates for both are managed globally under "תבניות וניהול" in the
// sidebar; this component is the per-client instances view only.

import { useState } from "react";
import { ScrollText, FileText } from "lucide-react";
import CrmContracts from "@/components/crm/CrmContracts";
import CrmQuotes from "@/components/crm/CrmQuotes";

type Section = "contracts" | "quotes";

const SECTIONS: { key: Section; label: string; icon: typeof ScrollText }[] = [
  { key: "contracts", label: "חוזים", icon: ScrollText },
  { key: "quotes", label: "הצעות מחיר", icon: FileText },
];

export default function ClientContractsAndQuotes(props: {
  clientId?: string;
  projectId?: string;
  gender?: string;
}) {
  const [active, setActive] = useState<Section>("contracts");

  return (
    <div className="space-y-4">
      <div className="flex gap-2 border-b border-border-subtle pb-1">
        {SECTIONS.map((s) => (
          <button
            key={s.key}
            onClick={() => setActive(s.key)}
            className={`px-4 py-2 text-sm rounded-t-lg transition-colors flex items-center gap-2 ${
              active === s.key
                ? "bg-gold/10 text-gold font-semibold border-b-2 border-gold"
                : "text-text-muted hover:text-text-primary"
            }`}
          >
            <s.icon className="w-4 h-4" />
            {s.label}
          </button>
        ))}
      </div>
      {active === "contracts" && <CrmContracts {...props} />}
      {active === "quotes" && <CrmQuotes {...props} />}
    </div>
  );
}
