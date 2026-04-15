"use client";

/**
 * SmartHintsBar — lightweight UI that surfaces phones/emails/URLs
 * detected inside a note or message.
 *
 * The designer can click a hint to add it as a contact, copy it,
 * or open the URL. Nothing is persisted silently.
 */

import { Phone, Mail, Link as LinkIcon, Copy, Plus } from "lucide-react";
import { parseSmartHints, type SmartHint } from "@/lib/smart-parse";
import { useMemo, useState } from "react";

export interface SmartHintsBarProps {
  text: string;
  /** Invoked when the user chooses "add as contact" on a phone/email hint. */
  onAddContact?: (hint: SmartHint) => void;
  className?: string;
}

export default function SmartHintsBar({ text, onAddContact, className }: SmartHintsBarProps) {
  const hints = useMemo(() => parseSmartHints(text), [text]);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  if (hints.length === 0) return null;

  const copy = async (key: string, value: string) => {
    try {
      await navigator.clipboard.writeText(value);
      setCopiedKey(key);
      setTimeout(() => setCopiedKey(null), 1500);
    } catch {
      /* clipboard blocked — ignore */
    }
  };

  return (
    <div
      className={`flex flex-wrap items-center gap-2 rounded-xl bg-gold/5 border border-gold/20 px-3 py-2 text-xs ${className ?? ""}`}
    >
      <span className="text-text-muted font-medium">זוהו בהערה:</span>
      {hints.map((hint, i) => {
        const key = `${hint.kind}-${i}`;
        const Icon = hint.kind === "phone" ? Phone : hint.kind === "email" ? Mail : LinkIcon;
        const display =
          hint.kind === "phone" || hint.kind === "email" ? hint.normalized : hint.raw;
        return (
          <div
            key={key}
            className="inline-flex items-center gap-1.5 bg-bg-card border border-border-subtle rounded-lg pl-2 pr-2 py-1"
          >
            <Icon className="w-3 h-3 text-gold flex-shrink-0" />
            <span className="text-text-primary font-mono text-[11px]" dir="ltr">
              {display}
            </span>
            <button
              type="button"
              onClick={() => copy(key, display)}
              className="p-1 rounded hover:bg-gold/10 text-text-muted hover:text-gold transition"
              title={copiedKey === key ? "הועתק" : "העתק"}
            >
              <Copy className="w-3 h-3" />
            </button>
            {(hint.kind === "phone" || hint.kind === "email") && onAddContact && (
              <button
                type="button"
                onClick={() => onAddContact(hint)}
                className="p-1 rounded hover:bg-gold/10 text-text-muted hover:text-gold transition"
                title="הוסף לאנשי קשר של הפרויקט"
              >
                <Plus className="w-3 h-3" />
              </button>
            )}
          </div>
        );
      })}
    </div>
  );
}
