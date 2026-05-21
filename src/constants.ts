/**
 * Application-wide constants
 * Centralizes magic numbers and strings for easier maintenance
 */

// Default year for indicators
export const DEFAULT_YEAR = 2023;

// Map configuration
export const DEFAULT_MAP_CENTER: [number, number] = [-80.46, 34.652];
export const DEFAULT_MAP_ZOOM = 8.57;

// Geo selection defaults
export const DEFAULT_GEO_SELECTION = 'overall';

// Year column patterns
export const YEAR_PATTERN = /^\d{4}$/;
export const COUNT_PREFIX = 'count_';
export const COHORT_PREFIX = 'Cohort_';

// GeoID patterns that need normalization
export const GEOID_NORMALIZATIONS: Record<string, string> = {
  '005700': '0570',
  '002300': '0230'
};

// Percentage bounds
export const MIN_PERCENTAGE = 0;
export const MAX_PERCENTAGE = 100;

// Point size configuration
export const POINT_SIZE_MIN = 3;
export const POINT_SIZE_MAX = 20;
export const POINT_SIZE_VALUE_MIN = 10;
export const POINT_SIZE_VALUE_MAX = 400;

// Circle opacity values
export const CIRCLE_OPACITY_DEFAULT = 0.75;
export const CIRCLE_OPACITY_HOVER = 1;

// Map layer visibility
export const LAYER_VISIBILITY_VISIBLE = 'visible';
export const LAYER_VISIBILITY_NONE = 'none';

// Excluded geo identifiers (for filtering data)
export const EXCLUDED_GEO_PATTERNS = ['overall', 'statewide', 'school district'];

/** Rewritten in downloaded CSV only (Google Sheet source is unchanged). Keys are matched case-insensitively on trimmed cell values. */
export const CSV_DOWNLOAD_CELL_REPLACEMENTS: Record<string, string> = {
  overall: 'Lancaster and Chester Counties',
};

// Min/max calculation multipliers
export const MIN_MULTIPLIER = 0.95;
export const MAX_MULTIPLIER = 1.05;

// Screen size breakpoints
export const DESKTOP_WIDTH_THRESHOLD = 1280;
export const DESKTOP_ZOOM_LEVEL = 1;
export const MOBILE_ZOOM_LEVEL = 0.8;

// Orientation detection
export const ORIENTATION_LEFT_RIGHT = 'left-right';
export const ORIENTATION_TOP_BOTTOM = 'top-bottom';

// Map navigation constants
export const MIN_ZOOM_ON_LOCATION = 12;
export const LOCATION_FLY_DURATION_MS = 500;
export const RIGHT_PADDING_RATIO = 0.5;
