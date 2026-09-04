import axios from 'axios';
import {
  CONFIG_FILES,
  type ConfigFileValidationResult,
  type SheetValidationResult,
  type ValidationIssue,
  type ValidationRunSummary,
} from './types';
import {
  collectSheetTargets,
  parseJsonSafe,
  validateBrandingConfig,
  validateMainConfig,
  validateThemeConfig,
  type ThemeValidationContext,
} from './validateConfigJson';
import { validateSheetCsv } from './validateSheetCsv';

function statusFromIssues(issues: ValidationIssue[]): 'pass' | 'fail' {
  return issues.some((i) => i.severity === 'fail') ? 'fail' : 'pass';
}

async function fetchText(url: string): Promise<{ text?: string; error?: string }> {
  try {
    const res = await axios.get(url, {
      responseType: 'text',
      transformResponse: [(data) => data],
      timeout: 45000,
      validateStatus: () => true,
    });
    if (res.status < 200 || res.status >= 300) {
      return { error: `HTTP ${res.status} fetching ${url}` };
    }
    const text =
      typeof res.data === 'string' ? res.data : String(res.data ?? '');
    return { text };
  } catch (e) {
    return {
      error: `Network error fetching ${url}: ${
        e instanceof Error ? e.message : String(e)
      }`,
    };
  }
}

export async function runValidation(
  sitePath: string
): Promise<ValidationRunSummary> {
  const fileByName = new Map<string, ConfigFileValidationResult>();
  const seenShortNames = new Map<string, string>();

  // Fetch all config files in parallel
  const configFetches = await Promise.all(
    CONFIG_FILES.map(async (filename) => {
      const path = `/config/${filename}`;
      const result = await fetchText(`${sitePath}${path}`);
      return { filename, path, result };
    })
  );

  let geoKeys = new Set<string>();
  let dataSourceKeys = new Set<string>();

  const mainEntry = configFetches.find((f) => f.filename === 'main.json');
  if (!mainEntry || mainEntry.result.error || mainEntry.result.text === undefined) {
    fileByName.set('main.json', {
      filename: 'main.json',
      path: '/config/main.json',
      status: 'fail',
      issues: [
        {
          severity: 'fail',
          message:
            mainEntry?.result.error ?? 'Failed to load main.json',
        },
      ],
      sheets: [],
    });
  } else {
    const raw = mainEntry.result.text;
    const parsed = parseJsonSafe(raw);
    const issues = [...parsed.issues];
    if (parsed.data !== undefined) {
      issues.push(...validateMainConfig(parsed.data, raw));
      const obj = parsed.data as Record<string, unknown>;
      if (obj.geo && typeof obj.geo === 'object') {
        geoKeys = new Set(Object.keys(obj.geo as object));
      }
      if (obj.data_sources && typeof obj.data_sources === 'object') {
        dataSourceKeys = new Set(Object.keys(obj.data_sources as object));
      }
    }
    fileByName.set('main.json', {
      filename: 'main.json',
      path: '/config/main.json',
      status: statusFromIssues(issues),
      issues,
      sheets: [],
    });
  }

  // Theme + branding: validate JSON sequentially so short_name uniqueness is stable
  type PendingSheets = {
    filename: string;
    path: string;
    issues: ValidationIssue[];
    targets: ReturnType<typeof collectSheetTargets>;
  };
  const pendingSheets: PendingSheets[] = [];

  for (const entry of configFetches) {
    if (entry.filename === 'main.json') continue;

    if (entry.result.error || entry.result.text === undefined) {
      fileByName.set(entry.filename, {
        filename: entry.filename,
        path: entry.path,
        status: 'fail',
        issues: [
          {
            severity: 'fail',
            message: entry.result.error ?? `Failed to load ${entry.filename}`,
          },
        ],
        sheets: [],
      });
      continue;
    }

    const raw = entry.result.text;
    const parsed = parseJsonSafe(raw);
    const issues: ValidationIssue[] = [...parsed.issues];

    if (parsed.data === undefined) {
      fileByName.set(entry.filename, {
        filename: entry.filename,
        path: entry.path,
        status: 'fail',
        issues,
        sheets: [],
      });
      continue;
    }

    if (entry.filename === 'arras_branding.json') {
      issues.push(...validateBrandingConfig(parsed.data, raw));
      fileByName.set(entry.filename, {
        filename: entry.filename,
        path: entry.path,
        status: statusFromIssues(issues),
        issues,
        sheets: [],
      });
      continue;
    }

    const ctx: ThemeValidationContext = {
      geoKeys,
      dataSourceKeys,
      seenShortNames,
      filename: entry.filename,
    };
    issues.push(...validateThemeConfig(parsed.data, raw, ctx));
    pendingSheets.push({
      filename: entry.filename,
      path: entry.path,
      issues,
      targets: collectSheetTargets(parsed.data, sitePath),
    });
  }

  // Fetch + lint all sheets in parallel
  await Promise.all(
    pendingSheets.map(async (pending) => {
      const sheetResults = await Promise.allSettled(
        pending.targets.map(async (t) => {
          const sheetIssues: ValidationIssue[] = [];
          const csvFetch = await fetchText(t.url);
          if (csvFetch.error || csvFetch.text === undefined) {
            sheetIssues.push({
              severity: 'fail',
              message: csvFetch.error ?? 'Failed to fetch sheet CSV',
            });
          } else {
            sheetIssues.push(
              ...validateSheetCsv(csvFetch.text, {
                geotype: t.geotype,
                yearValuePrefix: t.yearValuePrefix,
                requiredPrefixes: t.requiredPrefixes,
                isExtraLayer: t.label.includes('extra_layers'),
              })
            );
          }
          const result: SheetValidationResult = {
            label: t.label,
            shortName: t.shortName,
            url: t.url,
            status: statusFromIssues(sheetIssues),
            issues: sheetIssues,
          };
          return result;
        })
      );

      const sheets: SheetValidationResult[] = sheetResults.map((r) => {
        if (r.status === 'fulfilled') return r.value;
        return {
          label: 'unknown',
          shortName: 'unknown',
          url: '',
          status: 'fail' as const,
          issues: [
            {
              severity: 'fail' as const,
              message: `Unexpected validation error: ${
                r.reason instanceof Error ? r.reason.message : String(r.reason)
              }`,
            },
          ],
        };
      });

      const fileFails =
        statusFromIssues(pending.issues) === 'fail' ||
        sheets.some((s) => s.status === 'fail');

      fileByName.set(pending.filename, {
        filename: pending.filename,
        path: pending.path,
        status: fileFails ? 'fail' : 'pass',
        issues: pending.issues,
        sheets,
      });
    })
  );

  const files = CONFIG_FILES.map(
    (name) =>
      fileByName.get(name) ?? {
        filename: name,
        path: `/config/${name}`,
        status: 'fail' as const,
        issues: [{ severity: 'fail' as const, message: 'Validation did not run' }],
        sheets: [],
      }
  );

  let warnCount = 0;
  let failCount = 0;
  for (const f of files) {
    for (const i of f.issues) {
      if (i.severity === 'warn') warnCount++;
      else failCount++;
    }
    for (const s of f.sheets) {
      for (const i of s.issues) {
        if (i.severity === 'warn') warnCount++;
        else failCount++;
      }
    }
  }

  return {
    filesPassed: files.filter((f) => f.status === 'pass').length,
    filesFailed: files.filter((f) => f.status === 'fail').length,
    warnCount,
    failCount,
    files,
  };
}
