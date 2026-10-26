/**
 * Display label for a data year. Columns are keyed by a single year
 * (pct_2000), but some indicators measure a period ending in that year;
 * `timeline.yearLabels` maps the year to what users should see,
 * e.g. { "2000": "1990-2000" }. Falls back to the plain year.
 */
export function formatYearLabel(indicator: any, year: number | string | null | undefined): string {
  if (year === null || year === undefined) return ''
  const label = indicator?.timeline?.yearLabels?.[String(year)]
  return typeof label === 'string' && label.trim() ? label.trim() : String(year)
}
