"use client";
// Single hub for the reusable templates the designer manages globally.
// Specifically: cross-client workflows + message templates. Per-client
// templates (onboarding, handoff, style-quiz, surveys) live inside each
// client's detail view because they're scoped to that engagement.
//
// This component used to be split across two sidebar tabs ("workflows" and
// "templates") — folding them in here keeps the sidebar short while the
// underlying components stay untouched.

import { useState } from "react";
import { Workflow, MessageSquare, Info } from "lucide-react";
import CrmWorkflowTemplates from "@/components/crm/CrmWorkflowTemplates";
import CrmTemplates from "@/components/crm/CrmTemplates";

type Section = "workflows" | "messages";

const SECTIONS: { key: Section; label: string; icon: typeof Workflow; description: string }[] = [
  { key: "workflows", label: "תבניות עבודה", icon: Workflow, description: "אוטומציה — שלבי פרויקט והרצה אוטומטית" },
  { key: "messages", label: "תבניות הודעות", icon: MessageSquare, description: "הודעות מוכנות לוואטסאפ ומייל" },
];

export default function TemplatesHub({ gender }: { gender?: string }) {
  const [active, setActive] = useState<Section>("workflows");

  return (
    <div className="space-y-4 animate-in">
      <div>
        <h2 className="text-xl font-heading text-text-primary">תבניות וניהול</h2>
        <p className="text-text-muted text-sm mt-1">
          התבניות החוזרות שלך במקום אחד. בחרי קטגוריה ואז את התבנית הספציפית.
        </p>
      </div>

      <div className="flex flex-wrap gap-2 border-b border-border-subtle pb-2">
        {SECTIONS.map((s) => (
          <button
            key={s.key}
            onClick={() => setActive(s.key)}
            className={`px-3 py-2 text-sm rounded-t-lg transition-colors flex items-center gap-2 whitespace-nowrap ${
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

      <div>
        {active === "workflows" && <CrmWorkflowTemplates gender={gender} />}
        {active === "messages" && <CrmTemplates gender={gender} />}
      </div>

      <div className="bg-bg-surface/50 rounded-card p-4 text-sm text-text-muted flex items-start gap-2 mt-6">
        <Info className="w-4 h-4 flex-shrink-0 mt-0.5 text-gold" />
        <p>
          תבניות לקוח (קליטה, מסירה, שאלון סגנון, סקרים) מנוהלות בתוך כל לקוחה — נכנסים ללקוחה ולחצן על הסעיף הרלוונטי.
        </p>
      </div>
    </div>
  );
}
