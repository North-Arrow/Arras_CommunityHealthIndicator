export type SheetsUrlFields = {
  google_sheets_url?: string;
  dev_google_sheets_url?: string;
};

/** True when the app is served from the staging base (e.g. /dev). */
export function isStagingSite(sitePath: string | null | undefined): boolean {
  if (!sitePath) return false;
  const normalized = sitePath.replace(/\/+$/, '');
  return normalized === '/dev' || normalized.endsWith('/dev');
}

/**
 * Production always uses google_sheets_url.
 * On staging (/dev), prefer dev_google_sheets_url when set.
 */
export function resolveGoogleSheetsUrl(
  fields: SheetsUrlFields | null | undefined,
  sitePath: string | null | undefined
): string | undefined {
  const prod = fields?.google_sheets_url?.trim() || undefined;
  const staging = fields?.dev_google_sheets_url?.trim() || undefined;
  if (isStagingSite(sitePath) && staging) {
    return staging;
  }
  return prod;
}

export function resolveGoogleSheetsUrlSource(
  fields: SheetsUrlFields | null | undefined,
  sitePath: string | null | undefined
): 'dev' | 'prod' | undefined {
  const url = resolveGoogleSheetsUrl(fields, sitePath);
  if (!url) return undefined;
  if (
    isStagingSite(sitePath) &&
    fields?.dev_google_sheets_url?.trim() &&
    url === fields.dev_google_sheets_url.trim()
  ) {
    return 'dev';
  }
  return 'prod';
}
