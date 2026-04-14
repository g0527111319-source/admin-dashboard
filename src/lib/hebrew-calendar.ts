// Hebrew date conversion utility
// Civil month ordering: 1=Tishrei, 2=Cheshvan, ... 7=Nisan (non-leap) or 8=Nisan (leap)

type HebrewDate = {
  year: number;
  month: number;
  day: number;
  monthName: string;
  dayHeb: string;
  yearHeb: string;
  display: string; // e.g. "ט׳ בניסן תשפ״ו"
};

// Hebrew numerals
const HEBREW_NUMERALS: Record<number, string> = {
  1: "\u05D0", 2: "\u05D1", 3: "\u05D2", 4: "\u05D3", 5: "\u05D4", 6: "\u05D5", 7: "\u05D6", 8: "\u05D7", 9: "\u05D8",
  10: "\u05D9", 20: "\u05DB", 30: "\u05DC", 40: "\u05DE", 50: "\u05E0", 60: "\u05E1", 70: "\u05E2", 80: "\u05E4", 90: "\u05E6",
  100: "\u05E7", 200: "\u05E8", 300: "\u05E9", 400: "\u05EA",
};

// Civil ordering: index 0 = Tishrei (month 1)
const HEBREW_MONTHS = [
  "\u05EA\u05E9\u05E8\u05D9", "\u05D7\u05E9\u05D5\u05D5\u05DF", "\u05DB\u05E1\u05DC\u05D5", "\u05D8\u05D1\u05EA", "\u05E9\u05D1\u05D8", "\u05D0\u05D3\u05E8",
  "\u05E0\u05D9\u05E1\u05DF", "\u05D0\u05D9\u05D9\u05E8", "\u05E1\u05D9\u05D5\u05D5\u05DF", "\u05EA\u05DE\u05D5\u05D6", "\u05D0\u05D1", "\u05D0\u05DC\u05D5\u05DC",
];

const HEBREW_MONTHS_LEAP = [
  "\u05EA\u05E9\u05E8\u05D9", "\u05D7\u05E9\u05D5\u05D5\u05DF", "\u05DB\u05E1\u05DC\u05D5", "\u05D8\u05D1\u05EA", "\u05E9\u05D1\u05D8", "\u05D0\u05D3\u05E8 \u05D0\u05F3", "\u05D0\u05D3\u05E8 \u05D1\u05F3",
  "\u05E0\u05D9\u05E1\u05DF", "\u05D0\u05D9\u05D9\u05E8", "\u05E1\u05D9\u05D5\u05D5\u05DF", "\u05EA\u05DE\u05D5\u05D6", "\u05D0\u05D1", "\u05D0\u05DC\u05D5\u05DC",
];

function toHebrewNumeral(num: number): string {
  if (num === 15) return "\u05D8\u05F4\u05D5";
  if (num === 16) return "\u05D8\u05F4\u05D6";

  let result = "";
  const values = [400, 300, 200, 100, 90, 80, 70, 60, 50, 40, 30, 20, 10, 9, 8, 7, 6, 5, 4, 3, 2, 1];

  for (const val of values) {
    while (num >= val) {
      result += HEBREW_NUMERALS[val] || "";
      num -= val;
    }
  }

  if (result.length === 1) return result + "\u05F3";
  return result.slice(0, -1) + "\u05F4" + result.slice(-1);
}

function isHebrewLeapYear(year: number): boolean {
  return ((7 * year + 1) % 19) < 7;
}

function hebrewYearMonths(year: number): number {
  return isHebrewLeapYear(year) ? 13 : 12;
}

// Delay of Hebrew new year (molad calculation)
function hebrewDelay1(year: number): number {
  const months = Math.floor((235 * year - 234) / 19);
  const parts = 12084 + 13753 * months;
  let day = months * 29 + Math.floor(parts / 25920);
  if ((3 * (day + 1)) % 7 < 3) day++;
  return day;
}

function hebrewDelay2(year: number): number {
  const last = hebrewDelay1(year - 1);
  const present = hebrewDelay1(year);
  const next = hebrewDelay1(year + 1);
  if (next - present === 356) return 2;
  if (present - last === 382) return 1;
  return 0;
}

function hebrewYearDays(year: number): number {
  return hebrewDelay1(year + 1) - hebrewDelay1(year) + hebrewDelay2(year + 1) - hebrewDelay2(year);
}

// Month days in civil ordering (1=Tishrei)
function hebrewMonthDays(year: number, month: number): number {
  const totalDays = hebrewYearDays(year);
  if (month === 1) return 30; // Tishrei
  if (month === 2) return totalDays % 10 === 5 ? 30 : 29; // Cheshvan
  if (month === 3) return totalDays % 10 === 3 ? 29 : 30; // Kislev
  if (month === 4) return 29; // Tevet
  if (month === 5) return 30; // Shevat
  // Months 6+ differ between leap and non-leap years
  if (!isHebrewLeapYear(year)) {
    // Non-leap: 6=Adar(29), 7=Nisan(30), 8=Iyar(29), 9=Sivan(30), 10=Tammuz(29), 11=Av(30), 12=Elul(29)
    return month % 2 === 0 ? 29 : 30;
  } else {
    // Leap: 6=Adar I(30), 7=Adar II(29), 8=Nisan(30), 9=Iyar(29), 10=Sivan(30), 11=Tammuz(29), 12=Av(30), 13=Elul(29)
    return month % 2 === 0 ? 30 : 29;
  }
}

// Hebrew epoch (Julian Day Number)
const HEBREW_EPOCH = 347995.5;

// Convert Hebrew date to Julian Day Number
// Civil ordering: month 1 = Tishrei (start of year)
function hebrewToJD(year: number, month: number, day: number): number {
  let jd = HEBREW_EPOCH + hebrewDelay1(year) + hebrewDelay2(year) + day + 2;
  for (let m = 1; m < month; m++) {
    jd += hebrewMonthDays(year, m);
  }
  return jd;
}

function gregorianToJD(year: number, month: number, day: number): number {
  const a = Math.floor((14 - month) / 12);
  const y = year + 4800 - a;
  const m = month + 12 * a - 3;
  return day + Math.floor((153 * m + 2) / 5) + 365 * y + Math.floor(y / 4) - Math.floor(y / 100) + Math.floor(y / 400) - 32045;
}

// Convert Julian Day Number to Hebrew date (civil ordering)
function jdToHebrew(jd: number): { year: number; month: number; day: number } {
  jd = Math.floor(jd) + 0.5;
  const count = Math.floor(((jd - HEBREW_EPOCH) * 98496.0) / 35975351.0);
  let year = count - 1;

  for (let i = count - 1; i <= count + 2; i++) {
    if (hebrewToJD(i, 1, 1) <= jd) year = i;
  }

  const months = hebrewYearMonths(year);
  let month = 1;
  while (month < months && hebrewToJD(year, month + 1, 1) <= jd) {
    month++;
  }

  const day = Math.floor(jd - hebrewToJD(year, month, 1)) + 1;
  return { year, month, day };
}

export function gregorianToHebrew(gYear: number, gMonth: number, gDay: number): HebrewDate {
  const jd = gregorianToJD(gYear, gMonth, gDay);
  const heb = jdToHebrew(jd);
  const isLeap = isHebrewLeapYear(heb.year);
  const monthNames = isLeap ? HEBREW_MONTHS_LEAP : HEBREW_MONTHS;
  const monthName = monthNames[heb.month - 1] || "";
  const dayHeb = toHebrewNumeral(heb.day);
  const yearHeb = toHebrewNumeral(heb.year % 1000);

  return {
    year: heb.year,
    month: heb.month,
    day: heb.day,
    monthName,
    dayHeb,
    yearHeb,
    display: `${dayHeb} ${monthName} ${yearHeb}`,
  };
}

export function getHebrewDateStr(date: Date): string {
  const heb = gregorianToHebrew(date.getFullYear(), date.getMonth() + 1, date.getDate());
  return heb.display;
}

// Jewish holidays for a given Gregorian year
// Returns array of { date: string (YYYY-MM-DD), name: string, isYomTov: boolean }
type JewishHoliday = {
  date: string;
  name: string;
  isYomTov: boolean; // major holiday (Shabbat-like)
  emoji: string;
};

function hebrewToGregorian(hYear: number, hMonth: number, hDay: number): Date {
  const jd = hebrewToJD(hYear, hMonth, hDay);
  // JD to Gregorian
  const l = Math.floor(jd) + 68569;
  const n = Math.floor((4 * l) / 146097);
  const l2 = l - Math.floor((146097 * n + 3) / 4);
  const i = Math.floor((4000 * (l2 + 1)) / 1461001);
  const l3 = l2 - Math.floor((1461 * i) / 4) + 31;
  const j = Math.floor((80 * l3) / 2447);
  const day = l3 - Math.floor((2447 * j) / 80);
  const l4 = Math.floor(j / 11);
  const month = j + 2 - 12 * l4;
  const year = 100 * (n - 49) + i + l4;
  return new Date(year, month - 1, day);
}

function formatDate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

// Leap-year-aware month numbers (civil ordering)
// In non-leap: 6=Adar, 7=Nisan, 8=Iyar, 9=Sivan, 10=Tammuz, 11=Av, 12=Elul
// In leap: 6=Adar I, 7=Adar II, 8=Nisan, 9=Iyar, 10=Sivan, 11=Tammuz, 12=Av, 13=Elul
const nisanMonth = (hy: number) => isHebrewLeapYear(hy) ? 8 : 7;
const iyarMonth = (hy: number) => isHebrewLeapYear(hy) ? 9 : 8;
const sivanMonth = (hy: number) => isHebrewLeapYear(hy) ? 10 : 9;
const tammuzMonth = (hy: number) => isHebrewLeapYear(hy) ? 11 : 10;
const avMonth = (hy: number) => isHebrewLeapYear(hy) ? 12 : 11;
const purimAdarMonth = (hy: number) => isHebrewLeapYear(hy) ? 7 : 6; // Adar II in leap

export function getJewishHolidays(gYear: number): JewishHoliday[] {
  // Hebrew year that starts in the fall of gYear
  const hYear = gYear + 3761;
  // Hebrew year that starts in the fall of gYear-1 (for holidays in first half of gYear)
  const hYearPrev = gYear + 3760;

  const holidays: JewishHoliday[] = [];

  const add = (hy: number, hm: number, hd: number, name: string, isYomTov: boolean, emoji: string) => {
    try {
      const d = hebrewToGregorian(hy, hm, hd);
      if (d.getFullYear() === gYear) {
        holidays.push({ date: formatDate(d), name, isYomTov, emoji });
      }
    } catch { /* skip invalid dates */ }
  };

  // === TISHREI holidays (month 1) — fall of gYear ===
  // Rosh Hashana
  add(hYear, 1, 1, "\u05E8\u05D0\u05E9 \u05D4\u05E9\u05E0\u05D4 \u05D0\u05F3", true, "\uD83C\uDF4E");
  add(hYear, 1, 2, "\u05E8\u05D0\u05E9 \u05D4\u05E9\u05E0\u05D4 \u05D1\u05F3", true, "\uD83C\uDF4E");
  // Tzom Gedalya
  add(hYear, 1, 3, "\u05E6\u05D5\u05DD \u05D2\u05D3\u05DC\u05D9\u05D4", false, "");
  // Yom Kippur
  add(hYear, 1, 10, "\u05D9\u05D5\u05DD \u05DB\u05D9\u05E4\u05D5\u05E8", true, "\uD83D\uDD4A\uFE0F");
  // Sukkot
  add(hYear, 1, 15, "\u05E1\u05D5\u05DB\u05D5\u05EA \u05D0\u05F3", true, "\uD83C\uDF3F");
  add(hYear, 1, 16, "\u05E1\u05D5\u05DB\u05D5\u05EA \u05D1\u05F3", true, "\uD83C\uDF3F");
  add(hYear, 1, 17, "\u05D7\u05D5\u05DC \u05D4\u05DE\u05D5\u05E2\u05D3 \u05E1\u05D5\u05DB\u05D5\u05EA", false, "\uD83C\uDF3F");
  add(hYear, 1, 18, "\u05D7\u05D5\u05DC \u05D4\u05DE\u05D5\u05E2\u05D3 \u05E1\u05D5\u05DB\u05D5\u05EA", false, "\uD83C\uDF3F");
  add(hYear, 1, 19, "\u05D7\u05D5\u05DC \u05D4\u05DE\u05D5\u05E2\u05D3 \u05E1\u05D5\u05DB\u05D5\u05EA", false, "\uD83C\uDF3F");
  add(hYear, 1, 20, "\u05D7\u05D5\u05DC \u05D4\u05DE\u05D5\u05E2\u05D3 \u05E1\u05D5\u05DB\u05D5\u05EA", false, "\uD83C\uDF3F");
  add(hYear, 1, 21, "\u05D4\u05D5\u05E9\u05E2\u05E0\u05D0 \u05E8\u05D1\u05D4", false, "\uD83C\uDF3F");
  add(hYear, 1, 22, "\u05E9\u05DE\u05D9\u05E0\u05D9 \u05E2\u05E6\u05E8\u05EA / \u05E9\u05DE\u05D7\u05EA \u05EA\u05D5\u05E8\u05D4", true, "\uD83D\uDCDC");

  // === CHANUKAH — Kislev 25 (month 3) ===
  add(hYear, 3, 25, "\u05D7\u05E0\u05D5\u05DB\u05D4 \u2014 \u05E0\u05E8 \u05E8\u05D0\u05E9\u05D5\u05DF", false, "\uD83D\uDD4E");
  add(hYear, 3, 26, "\u05D7\u05E0\u05D5\u05DB\u05D4 \u2014 \u05E0\u05E8 \u05E9\u05E0\u05D9", false, "\uD83D\uDD4E");
  add(hYear, 3, 27, "\u05D7\u05E0\u05D5\u05DB\u05D4 \u2014 \u05E0\u05E8 \u05E9\u05DC\u05D9\u05E9\u05D9", false, "\uD83D\uDD4E");
  add(hYear, 3, 28, "\u05D7\u05E0\u05D5\u05DB\u05D4 \u2014 \u05E0\u05E8 \u05E8\u05D1\u05D9\u05E2\u05D9", false, "\uD83D\uDD4E");
  add(hYear, 3, 29, "\u05D7\u05E0\u05D5\u05DB\u05D4 \u2014 \u05E0\u05E8 \u05D7\u05DE\u05D9\u05E9\u05D9", false, "\uD83D\uDD4E");
  add(hYear, 3, 30, "\u05D7\u05E0\u05D5\u05DB\u05D4 \u2014 \u05E0\u05E8 \u05E9\u05D9\u05E9\u05D9", false, "\uD83D\uDD4E");
  add(hYear, 4, 1, "\u05D7\u05E0\u05D5\u05DB\u05D4 \u2014 \u05E0\u05E8 \u05E9\u05D1\u05D9\u05E2\u05D9", false, "\uD83D\uDD4E");
  add(hYear, 4, 2, "\u05D7\u05E0\u05D5\u05DB\u05D4 \u2014 \u05E0\u05E8 \u05E9\u05DE\u05D9\u05E0\u05D9 (\u05D6\u05D0\u05EA \u05D7\u05E0\u05D5\u05DB\u05D4)", false, "\uD83D\uDD4E");

  // === TEVET — Tzom 10 (month 4) ===
  // Can fall in Dec of gYear (from hYear) or Jan of gYear (from hYearPrev)
  add(hYear, 4, 10, "\u05E6\u05D5\u05DD \u05E2\u05E9\u05E8\u05D4 \u05D1\u05D8\u05D1\u05EA", false, "");
  add(hYearPrev, 4, 10, "\u05E6\u05D5\u05DD \u05E2\u05E9\u05E8\u05D4 \u05D1\u05D8\u05D1\u05EA", false, "");

  // === SHEVAT — Tu B'Shvat (month 5) ===
  // Falls in Jan/Feb — from hYearPrev
  add(hYearPrev, 5, 15, "\u05D8\u05F4\u05D5 \u05D1\u05E9\u05D1\u05D8", false, "\uD83C\uDF33");
  add(hYear, 5, 15, "\u05D8\u05F4\u05D5 \u05D1\u05E9\u05D1\u05D8", false, "\uD83C\uDF33");

  // === PURIM — Adar 14 (or Adar II in leap year) ===
  for (const hy of [hYearPrev, hYear]) {
    const pm = purimAdarMonth(hy);
    add(hy, pm, 13, "\u05EA\u05E2\u05E0\u05D9\u05EA \u05D0\u05E1\u05EA\u05E8", false, "");
    add(hy, pm, 14, "\u05E4\u05D5\u05E8\u05D9\u05DD", false, "\uD83C\uDFAD");
    add(hy, pm, 15, "\u05E9\u05D5\u05E9\u05DF \u05E4\u05D5\u05E8\u05D9\u05DD", false, "\uD83C\uDFAD");
  }

  // === PESACH — Nisan 14-21 ===
  for (const hy of [hYearPrev, hYear]) {
    const nm = nisanMonth(hy);
    add(hy, nm, 14, "\u05E2\u05E8\u05D1 \u05E4\u05E1\u05D7", false, "\uD83C\uDF77");
    add(hy, nm, 15, "\u05E4\u05E1\u05D7 \u05D0\u05F3", true, "\uD83C\uDF77");
    add(hy, nm, 16, "\u05E4\u05E1\u05D7 \u05D1\u05F3", true, "\uD83C\uDF77");
    add(hy, nm, 17, "\u05D7\u05D5\u05DC \u05D4\u05DE\u05D5\u05E2\u05D3 \u05E4\u05E1\u05D7", false, "\uD83C\uDF77");
    add(hy, nm, 18, "\u05D7\u05D5\u05DC \u05D4\u05DE\u05D5\u05E2\u05D3 \u05E4\u05E1\u05D7", false, "\uD83C\uDF77");
    add(hy, nm, 19, "\u05D7\u05D5\u05DC \u05D4\u05DE\u05D5\u05E2\u05D3 \u05E4\u05E1\u05D7", false, "\uD83C\uDF77");
    add(hy, nm, 20, "\u05D7\u05D5\u05DC \u05D4\u05DE\u05D5\u05E2\u05D3 \u05E4\u05E1\u05D7", false, "\uD83C\uDF77");
    add(hy, nm, 21, "\u05E9\u05D1\u05D9\u05E2\u05D9 \u05E9\u05DC \u05E4\u05E1\u05D7", true, "\uD83C\uDF77");
  }

  // === YOM HASHOAH — Nisan 27 ===
  for (const hy of [hYearPrev, hYear]) {
    add(hy, nisanMonth(hy), 27, "\u05D9\u05D5\u05DD \u05D4\u05E9\u05D5\u05D0\u05D4", false, "\uD83D\uDD6F\uFE0F");
  }

  // === YOM HAZIKARON + YOM HAATZMAUT — Iyar 4-5 ===
  for (const hy of [hYearPrev, hYear]) {
    add(hy, iyarMonth(hy), 4, "\u05D9\u05D5\u05DD \u05D4\u05D6\u05D9\u05DB\u05E8\u05D5\u05DF", false, "\uD83D\uDD6F\uFE0F");
    add(hy, iyarMonth(hy), 5, "\u05D9\u05D5\u05DD \u05D4\u05E2\u05E6\u05DE\u05D0\u05D5\u05EA", false, "\uD83C\uDDEE\uD83C\uDDF1");
  }

  // === LAG BAOMER — Iyar 18 ===
  for (const hy of [hYearPrev, hYear]) {
    add(hy, iyarMonth(hy), 18, "\u05DC\u05F4\u05D2 \u05D1\u05E2\u05D5\u05DE\u05E8", false, "\uD83D\uDD25");
  }

  // === YOM YERUSHALAYIM — Iyar 28 ===
  for (const hy of [hYearPrev, hYear]) {
    add(hy, iyarMonth(hy), 28, "\u05D9\u05D5\u05DD \u05D9\u05E8\u05D5\u05E9\u05DC\u05D9\u05DD", false, "\uD83C\uDFDB\uFE0F");
  }

  // === SHAVUOT — Sivan 6-7 ===
  for (const hy of [hYearPrev, hYear]) {
    add(hy, sivanMonth(hy), 6, "\u05E9\u05D1\u05D5\u05E2\u05D5\u05EA", true, "\uD83D\uDCDC");
    add(hy, sivanMonth(hy), 7, "\u05E9\u05D1\u05D5\u05E2\u05D5\u05EA \u05D1\u05F3", true, "\uD83D\uDCDC");
  }

  // === TZOM 17 TAMMUZ ===
  for (const hy of [hYearPrev, hYear]) {
    add(hy, tammuzMonth(hy), 17, "\u05E6\u05D5\u05DD \u05D9\u05F4\u05D6 \u05D1\u05EA\u05DE\u05D5\u05D6", false, "");
  }

  // === TISHA B'AV — Av 9 ===
  for (const hy of [hYearPrev, hYear]) {
    add(hy, avMonth(hy), 9, "\u05EA\u05E9\u05E2\u05D4 \u05D1\u05D0\u05D1", false, "");
  }

  // === TU B'AV — Av 15 ===
  for (const hy of [hYearPrev, hYear]) {
    add(hy, avMonth(hy), 15, "\u05D8\u05F4\u05D5 \u05D1\u05D0\u05D1", false, "\u2764\uFE0F");
  }

  // Deduplicate (same date might appear from both hYear cycles)
  const seen = new Set<string>();
  return holidays.filter(h => {
    const key = `${h.date}-${h.name}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  }).sort((a, b) => a.date.localeCompare(b.date));
}

// Get holidays for a specific month
export function getMonthHolidays(year: number, month: number): JewishHoliday[] {
  const allHolidays = getJewishHolidays(year);
  const monthStr = String(month).padStart(2, "0");
  const prefix = `${year}-${monthStr}`;
  return allHolidays.filter(h => h.date.startsWith(prefix));
}
