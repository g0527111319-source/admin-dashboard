// Hebrew date conversion utility
// Based on astronomical calculations for the Hebrew calendar

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

function hebrewMonthDays(year: number, month: number): number {
  // month is 1-based: 1=Tishrei ... 12/13=Elul
  const totalDays = hebrewYearDays(year);
  if (month === 2) { // Cheshvan
    return totalDays % 10 === 5 ? 30 : 29;
  }
  if (month === 3) { // Kislev
    return totalDays % 10 === 3 ? 29 : 30;
  }
  if (month === 6 && !isHebrewLeapYear(year)) return 29; // Adar in non-leap
  if (month === 6 && isHebrewLeapYear(year)) return 30; // Adar I in leap
  if (month === 7 && isHebrewLeapYear(year)) return 29; // Adar II in leap
  // Standard months
  const monthDays = [0, 30, 0, 0, 29, 30, 0, 30, 29, 30, 29, 30, 29, 29]; // 0-indexed adjustment
  if (month <= 13 && monthDays[month]) return monthDays[month];
  return month % 2 === 0 ? 29 : 30;
}

// Hebrew epoch (Julian Day Number of 1 Tishrei 1)
const HEBREW_EPOCH = 347995.5;

function hebrewToJD(year: number, month: number, day: number): number {
  const months = hebrewYearMonths(year);
  let jd = HEBREW_EPOCH + hebrewDelay1(year) + hebrewDelay2(year) + day + 1;

  if (month < 7) {
    for (let m = 7; m <= months; m++) jd += hebrewMonthDays(year, m);
    for (let m = 1; m < month; m++) jd += hebrewMonthDays(year, m);
  } else {
    for (let m = 7; m < month; m++) jd += hebrewMonthDays(year, m);
  }

  return jd;
}

function gregorianToJD(year: number, month: number, day: number): number {
  const a = Math.floor((14 - month) / 12);
  const y = year + 4800 - a;
  const m = month + 12 * a - 3;
  return day + Math.floor((153 * m + 2) / 5) + 365 * y + Math.floor(y / 4) - Math.floor(y / 100) + Math.floor(y / 400) - 32045;
}

function jdToHebrew(jd: number): { year: number; month: number; day: number } {
  jd = Math.floor(jd) + 0.5;
  const count = Math.floor(((jd - HEBREW_EPOCH) * 98496.0) / 35975351.0);
  let year = count - 1;

  for (let i = count - 1; i <= count + 2; i++) {
    if (hebrewToJD(i, 7, 1) <= jd) year = i;
  }

  const months = hebrewYearMonths(year);
  let first = jd < hebrewToJD(year, 1, 1) ? 7 : 1;
  let month = first;

  for (let m = first; m <= (first === 7 ? months : 6); m++) {
    if (jd > hebrewToJD(year, m, hebrewMonthDays(year, m))) month = m + 1;
  }
  if (first === 7 && month > months) {
    for (let m = 1; m <= 6; m++) {
      if (jd > hebrewToJD(year, m, hebrewMonthDays(year, m))) month = m + 1;
    }
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

  // Tishrei holidays (from previous Hebrew year cycle, in Sept/Oct of gYear)
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

  // Chanukah (Kislev 25 - Tevet 2)
  add(hYear, 3, 25, "\u05D7\u05E0\u05D5\u05DB\u05D4 \u2014 \u05E0\u05E8 \u05E8\u05D0\u05E9\u05D5\u05DF", false, "\uD83D\uDD4E");
  add(hYear, 3, 26, "\u05D7\u05E0\u05D5\u05DB\u05D4 \u2014 \u05E0\u05E8 \u05E9\u05E0\u05D9", false, "\uD83D\uDD4E");
  add(hYear, 3, 27, "\u05D7\u05E0\u05D5\u05DB\u05D4 \u2014 \u05E0\u05E8 \u05E9\u05DC\u05D9\u05E9\u05D9", false, "\uD83D\uDD4E");
  add(hYear, 3, 28, "\u05D7\u05E0\u05D5\u05DB\u05D4 \u2014 \u05E0\u05E8 \u05E8\u05D1\u05D9\u05E2\u05D9", false, "\uD83D\uDD4E");
  add(hYear, 3, 29, "\u05D7\u05E0\u05D5\u05DB\u05D4 \u2014 \u05E0\u05E8 \u05D7\u05DE\u05D9\u05E9\u05D9", false, "\uD83D\uDD4E");
  // Kislev can be 29 or 30 days
  add(hYear, 3, 30, "\u05D7\u05E0\u05D5\u05DB\u05D4 \u2014 \u05E0\u05E8 \u05E9\u05D9\u05E9\u05D9", false, "\uD83D\uDD4E");
  add(hYear, 4, 1, "\u05D7\u05E0\u05D5\u05DB\u05D4 \u2014 \u05E0\u05E8 \u05E9\u05D1\u05D9\u05E2\u05D9", false, "\uD83D\uDD4E");
  add(hYear, 4, 2, "\u05D7\u05E0\u05D5\u05DB\u05D4 \u2014 \u05E0\u05E8 \u05E9\u05DE\u05D9\u05E0\u05D9 (\u05D6\u05D0\u05EA \u05D7\u05E0\u05D5\u05DB\u05D4)", false, "\uD83D\uDD4E");

  // Tzom 10 Tevet
  add(hYear, 4, 10, "\u05E6\u05D5\u05DD \u05E2\u05E9\u05E8\u05D4 \u05D1\u05D8\u05D1\u05EA", false, "");

  // Tu B'Shvat
  add(hYear, 5, 15, "\u05D8\u05F4\u05D5 \u05D1\u05E9\u05D1\u05D8", false, "\uD83C\uDF33");

  // Purim (Adar 14, or Adar II in leap year)
  const purimMonth = isHebrewLeapYear(hYearPrev) ? 7 : 6;
  add(hYearPrev, purimMonth, 13, "\u05EA\u05E2\u05E0\u05D9\u05EA \u05D0\u05E1\u05EA\u05E8", false, "");
  add(hYearPrev, purimMonth, 14, "\u05E4\u05D5\u05E8\u05D9\u05DD", false, "\uD83C\uDFAD");
  add(hYearPrev, purimMonth, 15, "\u05E9\u05D5\u05E9\u05DF \u05E4\u05D5\u05E8\u05D9\u05DD", false, "\uD83C\uDFAD");

  // Also check current hYear for Purim (in case it falls in this year)
  const purimMonth2 = isHebrewLeapYear(hYear) ? 7 : 6;
  add(hYear, purimMonth2, 13, "\u05EA\u05E2\u05E0\u05D9\u05EA \u05D0\u05E1\u05EA\u05E8", false, "");
  add(hYear, purimMonth2, 14, "\u05E4\u05D5\u05E8\u05D9\u05DD", false, "\uD83C\uDFAD");
  add(hYear, purimMonth2, 15, "\u05E9\u05D5\u05E9\u05DF \u05E4\u05D5\u05E8\u05D9\u05DD", false, "\uD83C\uDFAD");

  // Pesach (Nisan 15-22)
  // These can be in hYearPrev (March/April of gYear)
  for (const hy of [hYearPrev, hYear]) {
    add(hy, 7, 14, "\u05E2\u05E8\u05D1 \u05E4\u05E1\u05D7", false, "\uD83C\uDF77");
    add(hy, 7, 15, "\u05E4\u05E1\u05D7 \u05D0\u05F3", true, "\uD83C\uDF77");
    add(hy, 7, 16, "\u05E4\u05E1\u05D7 \u05D1\u05F3", true, "\uD83C\uDF77");
    add(hy, 7, 17, "\u05D7\u05D5\u05DC \u05D4\u05DE\u05D5\u05E2\u05D3 \u05E4\u05E1\u05D7", false, "\uD83C\uDF77");
    add(hy, 7, 18, "\u05D7\u05D5\u05DC \u05D4\u05DE\u05D5\u05E2\u05D3 \u05E4\u05E1\u05D7", false, "\uD83C\uDF77");
    add(hy, 7, 19, "\u05D7\u05D5\u05DC \u05D4\u05DE\u05D5\u05E2\u05D3 \u05E4\u05E1\u05D7", false, "\uD83C\uDF77");
    add(hy, 7, 20, "\u05D7\u05D5\u05DC \u05D4\u05DE\u05D5\u05E2\u05D3 \u05E4\u05E1\u05D7", false, "\uD83C\uDF77");
    add(hy, 7, 21, "\u05E9\u05D1\u05D9\u05E2\u05D9 \u05E9\u05DC \u05E4\u05E1\u05D7", true, "\uD83C\uDF77");
  }

  // Yom HaShoah (Nisan 27)
  for (const hy of [hYearPrev, hYear]) {
    add(hy, 7, 27, "\u05D9\u05D5\u05DD \u05D4\u05E9\u05D5\u05D0\u05D4", false, "\uD83D\uDD6F\uFE0F");
  }

  // Yom HaZikaron + Yom HaAtzmaut (Iyar 4-5)
  for (const hy of [hYearPrev, hYear]) {
    add(hy, 8, 4, "\u05D9\u05D5\u05DD \u05D4\u05D6\u05D9\u05DB\u05E8\u05D5\u05DF", false, "\uD83D\uDD6F\uFE0F");
    add(hy, 8, 5, "\u05D9\u05D5\u05DD \u05D4\u05E2\u05E6\u05DE\u05D0\u05D5\u05EA", false, "\uD83C\uDDEE\uD83C\uDDF1");
  }

  // Lag BaOmer (Iyar 18)
  for (const hy of [hYearPrev, hYear]) {
    add(hy, 8, 18, "\u05DC\u05F4\u05D2 \u05D1\u05E2\u05D5\u05DE\u05E8", false, "\uD83D\uDD25");
  }

  // Yom Yerushalayim (Iyar 28)
  for (const hy of [hYearPrev, hYear]) {
    add(hy, 8, 28, "\u05D9\u05D5\u05DD \u05D9\u05E8\u05D5\u05E9\u05DC\u05D9\u05DD", false, "\uD83C\uDFDB\uFE0F");
  }

  // Shavuot (Sivan 6-7)
  for (const hy of [hYearPrev, hYear]) {
    add(hy, 9, 6, "\u05E9\u05D1\u05D5\u05E2\u05D5\u05EA", true, "\uD83D\uDCDC");
    add(hy, 9, 7, "\u05E9\u05D1\u05D5\u05E2\u05D5\u05EA \u05D1\u05F3", true, "\uD83D\uDCDC");
  }

  // Tzom 17 Tammuz
  for (const hy of [hYearPrev, hYear]) {
    add(hy, 10, 17, "\u05E6\u05D5\u05DD \u05D9\u05F4\u05D6 \u05D1\u05EA\u05DE\u05D5\u05D6", false, "");
  }

  // Tisha B'Av (Av 9)
  for (const hy of [hYearPrev, hYear]) {
    add(hy, 11, 9, "\u05EA\u05E9\u05E2\u05D4 \u05D1\u05D0\u05D1", false, "");
  }

  // Tu B'Av (Av 15)
  for (const hy of [hYearPrev, hYear]) {
    add(hy, 11, 15, "\u05D8\u05F4\u05D5 \u05D1\u05D0\u05D1", false, "\u2764\uFE0F");
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
