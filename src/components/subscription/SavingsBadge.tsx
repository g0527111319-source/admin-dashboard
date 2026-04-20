"use client";

type Props = {
  supplierCount: number;
  needed: number;
  savedAmount: number;
  planName: string;
};

export default function SavingsBadge({
  supplierCount,
  needed,
  savedAmount,
  planName,
}: Props) {
  const ratio = needed > 0 ? supplierCount / needed : 0;
  const reached = supplierCount >= needed && needed > 0;
  const near = !reached && ratio >= 0.6;
  const remaining = Math.max(0, needed - supplierCount);

  // Variant: info / near / success — each mapped to ivory-blinds tokens
  let wrapperClass =
    "bg-bg-surface border border-border-subtle text-text-secondary";
  let iconBg = "bg-[color:var(--gold-50)] text-[color:var(--gold-dim)]";
  let iconChar = "✦";
  let text = `${supplierCount}/${needed} שיתופי פעולה עם ספקי הקהילה`;
  let barTrackClass = "bg-bg-surface-2";
  let barFillClass = "bg-text-muted";
  let animateClass = "";

  if (reached) {
    wrapperClass = "bg-green-50 border border-green-200 text-green-800";
    iconBg = "bg-green-100 text-green-700";
    iconChar = "✓";
    text = `חוסכת ₪${savedAmount.toLocaleString("he-IL")} בחודש — ${planName}`;
  } else if (near) {
    wrapperClass =
      "bg-[color:var(--gold-50)] border border-[color:var(--border-gold)] text-[color:var(--gold-dim)]";
    iconBg =
      "bg-gradient-to-br from-[color:var(--gold-dim)] to-[color:var(--gold)] text-white";
    iconChar = "✦";
    text = `עוד ${remaining} שיתופי פעולה וחוסכת ₪${savedAmount.toLocaleString(
      "he-IL"
    )}`;
    animateClass = "savings-badge-near-pulse";
  }

  return (
    <div dir="rtl" style={{ width: "100%" }}>
      <style
        dangerouslySetInnerHTML={{
          __html: `
          @keyframes savingsPulseLight {
            0%, 100% { box-shadow: 0 0 0 0 rgba(201,168,76,0.25); }
            50% { box-shadow: 0 0 18px 2px rgba(201,168,76,0.35); }
          }
          .savings-badge-near-pulse {
            animation: savingsPulseLight 2.4s ease-in-out infinite;
          }
          `,
        }}
      />
      <div
        className={`inline-flex items-center gap-3 rounded-full px-4 py-2.5 text-sm font-semibold ${wrapperClass} ${animateClass}`}
      >
        <span
          className={`inline-flex items-center justify-center w-7 h-7 rounded-full text-base font-bold ${iconBg}`}
        >
          {iconChar}
        </span>
        <span>{text}</span>
        {!reached && needed > 0 && (
          <span
            className={`inline-block w-20 h-1.5 rounded-full overflow-hidden ${barTrackClass} ms-1`}
          >
            <span
              className={`block h-full rounded-full transition-[width] duration-500 ${
                near
                  ? "bg-gradient-to-l from-[color:var(--gold-dim)] to-[color:var(--gold)]"
                  : barFillClass
              }`}
              style={{ width: `${Math.min(100, Math.round(ratio * 100))}%` }}
            />
          </span>
        )}
      </div>
    </div>
  );
}
