// Work-pattern helpers.
//
// STORAGE ORDER IS SUNDAY-FIRST: index 0 = Sunday … 6 = Saturday. This matches
// the SQL resolver (day_fractions[EXTRACT(DOW) + 1]). Never reorder the array
// that goes to the API. Only the *display* order below is Monday-first.

export type DayFraction = 0 | 0.5 | 1;

export const DAY_NAMES_SUN_FIRST = [
  "Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday",
] as const;

export const DAY_SHORT_SUN_FIRST = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const;

// Display order: Monday … Sunday, expressed as indexes into the Sunday-first array.
export const DISPLAY_ORDER = [1, 2, 3, 4, 5, 6, 0] as const;

export const FRACTION_LABEL: Record<string, string> = { "1": "full", "0.5": "half", "0": "off" };

export const normalizeFractions = (v: ArrayLike<number> | null | undefined): number[] => {
  const out = Array.from(v ?? []).map(Number);
  while (out.length < 7) out.push(0);
  return out.slice(0, 7);
};

// Default for a new pattern: Mon–Fri full, weekend off (Sunday-first).
export const defaultFractions = (): number[] => [0, 1, 1, 1, 1, 1, 0];

/**
 * "Mon–Fri full, Sat half, Sun off" — derived from the array, never stored.
 * Consecutive days (Monday-first) with the same value are merged into a range.
 */
export const summariseWeek = (sundayFirst: ArrayLike<number>): string => {
  const f = normalizeFractions(sundayFirst);
  const days = DISPLAY_ORDER.map((i) => ({ short: DAY_SHORT_SUN_FIRST[i], v: f[i] }));
  const parts: string[] = [];
  let i = 0;
  while (i < days.length) {
    let j = i;
    while (j + 1 < days.length && days[j + 1].v === days[i].v) j++;
    const label = FRACTION_LABEL[String(days[i].v)] ?? String(days[i].v);
    const span = i === j ? days[i].short : `${days[i].short}–${days[j].short}`;
    parts.push(`${span} ${label}`);
    i = j + 1;
  }
  return parts.join(", ");
};

// Paid-day weight of the week, e.g. 5.5 — handy for a sanity label.
export const weekTotal = (sundayFirst: ArrayLike<number>): number =>
  normalizeFractions(sundayFirst).reduce((a, b) => a + b, 0);
