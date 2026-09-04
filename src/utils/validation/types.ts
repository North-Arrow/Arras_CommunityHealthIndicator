export type ValidationSeverity = 'fail' | 'warn';

export interface ValidationIssue {
  severity: ValidationSeverity;
  message: string;
  /** Human-readable location, e.g. indicators[2].timeline.yearValuePrefix */
  path?: string;
  /** 1-based line in the source text when known */
  line?: number;
  /** 1-based column in the source text when known */
  column?: number;
  /** Sheet CSV row (1-based including header rows) when known */
  row?: number;
  /** Column short name when known */
  columnName?: string;
}

export interface SheetValidationResult {
  label: string;
  shortName: string;
  url: string;
  status: 'pass' | 'fail';
  issues: ValidationIssue[];
}

export interface ConfigFileValidationResult {
  filename: string;
  path: string;
  status: 'pass' | 'fail';
  issues: ValidationIssue[];
  sheets: SheetValidationResult[];
}

export interface ValidationRunSummary {
  filesPassed: number;
  filesFailed: number;
  warnCount: number;
  failCount: number;
  files: ConfigFileValidationResult[];
}

export const CONFIG_FILES = [
  'main.json',
  'arras_branding.json',
  'economy.json',
  'education.json',
  'health.json',
  'natural_env.json',
  'social_cultural.json',
] as const;

export const ALLOWED_PLACEHOLDERS = new Set([
  'pct',
  'count',
  'pop',
  'rate',
  'acres',
  'value',
]);

export const YEAR_COLUMN_RE = /^(pct|count|pop|rate)_(\d{4})$/;
export const ALLOWED_EXTRA_COLUMNS = new Set([
  'geoid',
  'name',
  'lat',
  'lng',
  'acres',
  'address',
  'more_info',
]);
export const POINT_GEOTYPES = new Set(['school', 'facility']);
export const MAP_COLUMN_KINDS = new Set(['pct', 'count', 'pop', 'rate', 'acres']);
export const SHORT_NAME_RE = /^[a-zA-Z0-9_-]+$/;
