/**
 * Compact-view layout constants and helpers.
 * "Compact" = viewport width < COMPACT_MAX_WIDTH (Tailwind below lg).
 * All functions return exactly 1 (identity / no-op) on desktop — no visual change there.
 */

export const COMPACT_MAX_WIDTH = 1024;

/** Fraction of viewport height occupied by the bottom content sheet on compact. */
export const SHEET_FRAC = 0.46;

/** Approximate HUD header height in px. */
export const HEADER_PX = 64;

/** Approximate HUD footer / stage-dots height in px. */
export const FOOTER_PX = 96;

/**
 * Pull-back multiplier so the scene fits in the top ~54 % of compact viewports.
 * Returns 1 on landscape tablet / desktop (aspect >= 1.2).
 */
export function compactDolly(aspect: number): number {
  if (aspect >= 1.2) return 1;
  return Math.min(2.4, 1.2 / aspect);
}

/**
 * Fraction of the viewport height that is free (above the sheet, below the header).
 */
export function freeFraction(h: number): number {
  return Math.max(0.15, (h - SHEET_FRAC * h - FOOTER_PX - HEADER_PX) / h);
}

/**
 * How much to shift the camera look-at target upward (in world-space normalised units)
 * so the subject appears centred in the free-3D zone.
 */
export function compactShift(h: number): number {
  const freeTop = HEADER_PX;
  const freeBottom = h - SHEET_FRAC * h - FOOTER_PX;
  return Math.min(0.3, Math.max(0, 0.5 - (freeTop + freeBottom) / (2 * h)));
}

