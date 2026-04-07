"use client";

type Props = {
  supplierCount: number;
  needed: number;
  savedAmount: number;
  planName: string;
};

const GOLD = "#C9A84C";

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

  let bg = "rgba(255,255,255,0.05)";
  let border = "rgba(255,255,255,0.15)";
  let color = "rgba(255,255,255,0.7)";
  let icon = "🤝";
  let text = `${supplierCount}/${needed} שיתופי פעולה עם ספקי הקהילה`;
  let className = "savings-badge-info";

  if (reached) {
    bg = "rgba(34,197,94,0.12)";
    border = "rgba(34,197,94,0.5)";
    color = "#4ade80";
    icon = "🎉";
    text = `חוסכת ₪${savedAmount.toLocaleString("he-IL")} בחודש — ${planName}`;
    className = "savings-badge-success";
  } else if (near) {
    bg = "rgba(201,168,76,0.12)";
    border = GOLD;
    color = GOLD;
    icon = "✨";
    text = `עוד ${remaining} שיתופי פעולה וחוסכת ₪${savedAmount.toLocaleString(
      "he-IL"
    )}`;
    className = "savings-badge-near";
  }

  return (
    <div dir="rtl" style={{ width: "100%" }}>
      <style
        dangerouslySetInnerHTML={{
          __html: `
          @keyframes savingsPulse {
            0%, 100% { box-shadow: 0 0 0 0 rgba(201,168,76,0.4); }
            50% { box-shadow: 0 0 24px 4px rgba(201,168,76,0.5); }
          }
          .savings-badge-near {
            animation: savingsPulse 2.4s ease-in-out infinite;
          }
          `,
        }}
      />
      <div
        className={className}
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 12,
          background: bg,
          border: `1px solid ${border}`,
          color,
          padding: "12px 18px",
          borderRadius: 999,
          fontSize: 14,
          fontWeight: 600,
        }}
      >
        <span style={{ fontSize: 18 }}>{icon}</span>
        <span>{text}</span>
        {!reached && needed > 0 && (
          <span
            style={{
              display: "inline-block",
              width: 80,
              height: 6,
              background: "rgba(255,255,255,0.1)",
              borderRadius: 999,
              overflow: "hidden",
              marginInlineStart: 4,
            }}
          >
            <span
              style={{
                display: "block",
                height: "100%",
                width: `${Math.min(100, Math.round(ratio * 100))}%`,
                background: near ? GOLD : "rgba(255,255,255,0.4)",
                transition: "width 0.4s",
              }}
            />
          </span>
        )}
      </div>
    </div>
  );
}
