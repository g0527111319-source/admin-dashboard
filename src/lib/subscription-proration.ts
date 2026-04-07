/**
 * Proration helpers for mid-cycle plan changes (item 5).
 * All monetary values in shekel (ILS), rounded to 2 decimals.
 */

export type ProrationResult = {
  /** Credit to apply from unused portion of current plan */
  unusedCredit: number;
  /** Charge for remainder of period on new plan */
  newPlanCharge: number;
  /** Net amount owed right now (positive = charge, negative = credit to balance) */
  netDueNow: number;
  /** Days remaining in current period */
  daysRemaining: number;
  /** Total days in period */
  daysInPeriod: number;
};

/**
 * Calculate proration for upgrading mid-cycle.
 * @param currentPlanPrice monthly price of current plan
 * @param newPlanPrice monthly price of new plan
 * @param periodStart current period start
 * @param periodEnd current period end
 * @param changeAt when the change happens (default: now)
 */
export function calculateProration(
  currentPlanPrice: number,
  newPlanPrice: number,
  periodStart: Date,
  periodEnd: Date,
  changeAt: Date = new Date()
): ProrationResult {
  const msPerDay = 24 * 60 * 60 * 1000;
  const daysInPeriod = Math.max(1, Math.round((periodEnd.getTime() - periodStart.getTime()) / msPerDay));
  const daysElapsed = Math.max(0, Math.round((changeAt.getTime() - periodStart.getTime()) / msPerDay));
  const daysRemaining = Math.max(0, daysInPeriod - daysElapsed);

  const unusedCredit = round2((currentPlanPrice * daysRemaining) / daysInPeriod);
  const newPlanCharge = round2((newPlanPrice * daysRemaining) / daysInPeriod);
  const netDueNow = round2(newPlanCharge - unusedCredit);

  return {
    unusedCredit,
    newPlanCharge,
    netDueNow,
    daysRemaining,
    daysInPeriod,
  };
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

/**
 * Human-readable Hebrew description of a proration result.
 */
export function prorationDescription(result: ProrationResult, fromName: string, toName: string): string {
  if (result.netDueNow > 0) {
    return `שדרוג מ־${fromName} ל־${toName}: חיוב יחסי של ₪${result.netDueNow.toFixed(2)} עבור ${result.daysRemaining} הימים שנותרו בתקופה הנוכחית. החיוב המלא הבא יתבצע בתחילת המחזור הבא.`;
  }
  if (result.netDueNow < 0) {
    return `שינוי תוכנית מ־${fromName} ל־${toName}: יוחזר זיכוי של ₪${Math.abs(result.netDueNow).toFixed(2)} לחיוב הבא.`;
  }
  return `מעבר מ־${fromName} ל־${toName}: ללא חיוב נוסף עבור התקופה הנוכחית.`;
}
