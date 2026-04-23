// ==========================================
// CSV Export — client-side helpers
// ==========================================

function escapeCsvCell(value: unknown): string {
  if (value === null || value === undefined) return "";
  const s = String(value);
  if (/[",\n\r]/.test(s)) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

export function buildCsv<T>(
  rows: T[],
  columns: { key: keyof T | string; label: string; format?: (row: T) => string | number | null | undefined }[],
): string {
  const header = columns.map((c) => escapeCsvCell(c.label)).join(",");
  const body = rows
    .map((row) =>
      columns
        .map((c) => {
          const raw = c.format ? c.format(row) : (row as Record<string, unknown>)[c.key as string];
          return escapeCsvCell(raw);
        })
        .join(","),
    )
    .join("\n");
  return `${header}\n${body}`;
}

export function downloadCsv(filename: string, csv: string) {
  // Excel on Windows expects UTF-8 BOM for Hebrew
  const bom = "\uFEFF";
  const blob = new Blob([bom + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename.endsWith(".csv") ? filename : `${filename}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/** Open WhatsApp with a pre-filled message to a phone number. */
export function openWhatsApp(phone: string, message?: string) {
  const cleanPhone = phone.replace(/[^\d+]/g, "");
  // Convert Israeli 05X... to 9725X...
  let intl = cleanPhone;
  if (intl.startsWith("0")) intl = "972" + intl.slice(1);
  if (intl.startsWith("+")) intl = intl.slice(1);
  const url = `https://wa.me/${intl}${message ? `?text=${encodeURIComponent(message)}` : ""}`;
  window.open(url, "_blank", "noopener");
}
