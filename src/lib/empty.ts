/** Stable empty array for `?? EMPTY_ARRAY` so hook deps stay referentially stable. */
export const EMPTY_ARRAY: readonly never[] = Object.freeze([]);
