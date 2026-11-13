/**
 * Tells whether two sets of filter values are the same; lists compare without regard to order.
 * @param a the first filter values.
 * @param b the second filter values.
 * @returns true when every filter has the same value.
 */
export function sameFilters(a: object, b: object): boolean {
  return JSON.stringify(_normalized(a)) === JSON.stringify(_normalized(b));
}

/**
 * Tells whether a multiple filter is set to «Nessuno»: the list then holds nothing and is not read.
 * @param filters the filter values.
 * @returns true when a list of picked values is empty.
 */
export function hasEmptySelection(filters: object): boolean {
  return Object.values(filters).some(value => Array.isArray(value) && value.length === 0);
}

/**
 * Turns a day into the first instant of that day, local time.
 * @param date the day, absent when the filter is empty.
 * @returns the instant in ISO 8601, or undefined.
 */
export function startOfDay(date: Date): string;
export function startOfDay(date: Date | null | undefined): string | undefined;
export function startOfDay(date: Date | null | undefined): string | undefined {
  return date ? new Date(date.getFullYear(), date.getMonth(), date.getDate()).toISOString() : undefined;
}

/**
 * Turns a day into the last instant of that day, local time.
 * @param date the day, absent when the filter is empty.
 * @returns the instant in ISO 8601, or undefined.
 */
export function endOfDay(date: Date): string;
export function endOfDay(date: Date | null | undefined): string | undefined;
export function endOfDay(date: Date | null | undefined): string | undefined {
  return date ? new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59, 999).toISOString() : undefined;
}

/**
 * Turns an empty text or list into undefined, so the filter is left out of the request.
 * @param value the filter value.
 * @returns the value, or undefined when empty.
 */
export function orUndefined<T>(value: T | null | undefined): T | undefined {
  if (value === null || value === undefined) return undefined;
  if (typeof value === 'string' && !value.trim()) return undefined;
  if (Array.isArray(value) && value.length === 0) return undefined;
  return value;
}

/**
 * Sorts the lists and empties the blanks of a set of filter values, so equal filters serialize the same way.
 * @param filters the filter values.
 * @returns the normalized values.
 */
function _normalized(filters: object): Record<string, unknown> {
  return Object.fromEntries(Object.entries(filters).map(([key, value]) => [
    key,
    Array.isArray(value) ? [...value].sort() : (value === '' || value === undefined ? null : value),
  ]));
}
