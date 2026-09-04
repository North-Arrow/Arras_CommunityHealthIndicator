import { formatAndNormalizeGoogleSheetData } from '../data-transformations';
import { EXCLUDED_GEO_PATTERNS } from '../../constants';
import {
  ALLOWED_EXTRA_COLUMNS,
  POINT_GEOTYPES,
  YEAR_COLUMN_RE,
  type ValidationIssue,
} from './types';

function isExcludedGeoRow(row: Record<string, string | undefined>): boolean {
  const geoid = (row.geoid || '').toLowerCase();
  const name = (row.name || '').toLowerCase();
  return EXCLUDED_GEO_PATTERNS.some(
    (p) => geoid.includes(p) || name.includes(p)
  );
}

export interface SheetLintContext {
  geotype?: string;
  yearValuePrefix?: string;
  requiredPrefixes: Set<string>;
  /** When true, skip point lat/lng and year-prefix requirements (extra merge sheets). */
  isExtraLayer?: boolean;
}

/** Parse a CSV line respecting double-quoted fields. */
export function parseCsvLine(line: string): {
  cells: string[];
  issues: ValidationIssue[];
} {
  const cells: string[] = [];
  const issues: ValidationIssue[] = [];
  let cur = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"') {
        if (line[i + 1] === '"') {
          cur += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        cur += ch;
      }
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === ',') {
      cells.push(cur);
      cur = '';
    } else {
      cur += ch;
    }
  }
  cells.push(cur);
  if (inQuotes) {
    issues.push({
      severity: 'fail',
      message: 'Unterminated double-quote in CSV field',
    });
  }
  return { cells, issues };
}

function hasControlChars(value: string): boolean {
  for (let i = 0; i < value.length; i++) {
    const code = value.charCodeAt(i);
    if (code < 32 && code !== 9 && code !== 10 && code !== 13) {
      return true;
    }
  }
  return false;
}

function looksLikeHtml(text: string): boolean {
  const sample = text.slice(0, 500).toLowerCase();
  return (
    sample.includes('<!doctype html') ||
    sample.includes('<html') ||
    sample.includes('sign in') && sample.includes('google')
  );
}

export function validateSheetCsv(
  csvText: string,
  ctx: SheetLintContext
): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  if (!csvText || !csvText.trim()) {
    issues.push({ severity: 'fail', message: 'Sheet CSV body is empty' });
    return issues;
  }

  if (looksLikeHtml(csvText)) {
    issues.push({
      severity: 'fail',
      message:
        'Response looks like HTML (sheet may not be published, or URL is wrong)',
    });
    return issues;
  }

  const rawLines = csvText.replace(/^\uFEFF/, '').split(/\r?\n/);
  // Drop trailing empty lines only
  while (rawLines.length && rawLines[rawLines.length - 1].trim() === '') {
    rawLines.pop();
  }

  if (rawLines.length < 2) {
    issues.push({
      severity: 'fail',
      message: 'CSV must have at least two header rows (labels + short names)',
      row: 1,
    });
    return issues;
  }

  const parsedRows = rawLines.map((line, idx) => {
    const { cells, issues: lineIssues } = parseCsvLine(line);
    for (const li of lineIssues) {
      issues.push({ ...li, row: idx + 1, message: `Row ${idx + 1}: ${li.message}` });
    }
    for (let c = 0; c < cells.length; c++) {
      if (hasControlChars(cells[c])) {
        issues.push({
          severity: 'fail',
          message: `Row ${idx + 1}, column ${c + 1}: contains illegal control characters`,
          row: idx + 1,
          column: c + 1,
        });
      }
    }
    return cells;
  });

  const expectedCols = parsedRows[0]?.length ?? 0;
  for (let r = 1; r < Math.min(parsedRows.length, 50); r++) {
    if (parsedRows[r].length !== expectedCols) {
      issues.push({
        severity: 'fail',
        message: `Row ${r + 1}: column count ${parsedRows[r].length} != header count ${expectedCols} (possible unescaped comma or quote)`,
        row: r + 1,
      });
    }
  }

  // Find short-name header row (same heuristic as formatGoogleSheetData)
  let shortNameRowIdx = parsedRows.findIndex(
    (row) =>
      row.some((c) => c.toLowerCase() === 'geoid') &&
      !row.some((c) => c.includes('-') || c.includes(' '))
  );
  if (shortNameRowIdx === -1) {
    shortNameRowIdx = parsedRows.findIndex((row) =>
      row.some((c) => c.toLowerCase() === 'geoid')
    );
  }

  if (shortNameRowIdx === -1) {
    issues.push({
      severity: 'fail',
      message: 'No header row containing "geoid" short name found',
      row: 1,
    });
    return issues;
  }

  if (shortNameRowIdx > 1) {
    issues.push({
      severity: 'fail',
      message: `Short-name header with geoid found at row ${shortNameRowIdx + 1}; expected within first two rows`,
      row: shortNameRowIdx + 1,
    });
  }

  const headerShortNames = parsedRows[shortNameRowIdx].map((h) =>
    h.trim().toLowerCase()
  );
  const labelRowIdx = shortNameRowIdx === 0 ? 1 : 0;
  if (!parsedRows[labelRowIdx]) {
    issues.push({
      severity: 'fail',
      message: 'Missing human-readable label header row',
    });
  }

  if (!headerShortNames.includes('geoid')) {
    issues.push({
      severity: 'fail',
      message: 'Short-name headers must include "geoid"',
      row: shortNameRowIdx + 1,
      columnName: 'geoid',
    });
  }

  headerShortNames.forEach((name, colIdx) => {
    if (!name) {
      issues.push({
        severity: 'fail',
        message: `Empty short-name header at column ${colIdx + 1}`,
        row: shortNameRowIdx + 1,
        column: colIdx + 1,
      });
      return;
    }
    if (/\s/.test(name)) {
      issues.push({
        severity: 'fail',
        message: `Short-name header "${name}" must not contain spaces`,
        row: shortNameRowIdx + 1,
        column: colIdx + 1,
        columnName: name,
      });
    }
    const isYear = YEAR_COLUMN_RE.test(name);
    const isLegacyBareYear =
      ctx.yearValuePrefix === 'rate_' && /^\d{4}$/.test(name);
    const isLegacyCountAll = /^countall_\d{4}$/.test(name);
    const isAllowed =
      ALLOWED_EXTRA_COLUMNS.has(name) ||
      isYear ||
      isLegacyBareYear ||
      isLegacyCountAll;
    if (!isAllowed) {
      issues.push({
        severity: 'warn',
        message: `Unrecognized short-name column "${name}" (expected geoid/name/lat/lng/acres or pct_|count_|pop_|rate_YYYY)`,
        row: shortNameRowIdx + 1,
        column: colIdx + 1,
        columnName: name,
      });
    } else if (isLegacyBareYear || isLegacyCountAll) {
      issues.push({
        severity: 'warn',
        message: isLegacyBareYear
          ? `Legacy bare year column "${name}" will be treated as rate_${name}; rename the sheet short-name row to rate_${name}`
          : `Legacy column "${name}" will be treated as count_${name.slice('countall_'.length)}; rename to count_${name.slice('countall_'.length)}`,
        row: shortNameRowIdx + 1,
        column: colIdx + 1,
        columnName: name,
      });
    }
  });

  const duplicates = headerShortNames.filter(
    (n, i) => n && headerShortNames.indexOf(n) !== i
  );
  if (duplicates.length) {
    issues.push({
      severity: 'fail',
      message: `Duplicate short-name headers: ${[...new Set(duplicates)].join(', ')}`,
      row: shortNameRowIdx + 1,
    });
  }

  if (!ctx.isExtraLayer) {
    if (ctx.geotype && POINT_GEOTYPES.has(ctx.geotype)) {
      for (const col of ['lat', 'lng'] as const) {
        if (!headerShortNames.includes(col)) {
          issues.push({
            severity: 'fail',
            message: `Point geotype "${ctx.geotype}" requires "${col}" column`,
            row: shortNameRowIdx + 1,
            columnName: col,
          });
        }
      }
    }
  }

  // Parse via existing helper for data-row checks (normalizes legacy bare years / countall_)
  let parsed: ReturnType<typeof formatAndNormalizeGoogleSheetData> | null = null;
  try {
    parsed = formatAndNormalizeGoogleSheetData(csvText, ctx.yearValuePrefix);
  } catch (e) {
    issues.push({
      severity: 'fail',
      message: `Failed to parse sheet with formatAndNormalizeGoogleSheetData: ${
        e instanceof Error ? e.message : String(e)
      }`,
    });
    return issues;
  }

  if (!ctx.isExtraLayer) {
    if (ctx.yearValuePrefix) {
      const hasPrefix = parsed.headerShortNames.some((h) =>
        h.startsWith(ctx.yearValuePrefix!)
      );
      if (!hasPrefix) {
        issues.push({
          severity: 'fail',
          message: `No columns match timeline.yearValuePrefix "${ctx.yearValuePrefix}"`,
          row: shortNameRowIdx + 1,
        });
      }
    }
    for (const prefix of ctx.requiredPrefixes) {
      if (!parsed.headerShortNames.some((h) => h.startsWith(prefix))) {
        issues.push({
          severity: 'fail',
          message: `Config placeholders require columns with prefix "${prefix}" but none found`,
          row: shortNameRowIdx + 1,
        });
      }
    }
  }

  const geoidSeen = new Map<string, number>();
  const yearCols = parsed.headerShortNames.filter((h) => YEAR_COLUMN_RE.test(h));

  parsed.data.forEach((row, dataIdx) => {
    const csvRow = dataIdx + 3; // two header rows + 1-based
    const geoid = row.geoid;
    if (!geoid) {
      // Skip completely empty rows
      const hasAny = Object.values(row).some((v) => v !== undefined && v !== '');
      if (hasAny) {
        issues.push({
          severity: 'fail',
          message: `Row ${csvRow}: missing geoid`,
          row: csvRow,
          columnName: 'geoid',
        });
      }
      return;
    }

    const prev = geoidSeen.get(geoid);
    if (prev !== undefined) {
      issues.push({
        severity: 'fail',
        message: `Duplicate geoid "${geoid}" (also row ${prev})`,
        row: csvRow,
        columnName: 'geoid',
      });
    } else {
      geoidSeen.set(geoid, csvRow);
    }

    for (const col of yearCols) {
      const val = row[col];
      if (val === undefined || val === '') continue;
      const num = Number(val);
      if (Number.isNaN(num)) {
        issues.push({
          severity: 'fail',
          message: `Row ${csvRow}, column ${col}: expected number, got "${val}"`,
          row: csvRow,
          columnName: col,
        });
        continue;
      }
      const kind = col.split('_')[0];
      if (kind === 'pct' && (num < 0 || num > 100)) {
        issues.push({
          severity: 'warn',
          message: `Row ${csvRow}, column ${col}: percentage ${num} is outside 0–100`,
          row: csvRow,
          columnName: col,
        });
      }
      if ((kind === 'count' || kind === 'pop') && num < 0) {
        issues.push({
          severity: kind === 'pop' ? 'fail' : 'warn',
          message: `Row ${csvRow}, column ${col}: ${kind} is negative (${num})`,
          row: csvRow,
          columnName: col,
        });
      }
    }

    if (row.acres !== undefined && row.acres !== '') {
      const num = Number(row.acres);
      if (Number.isNaN(num)) {
        issues.push({
          severity: 'fail',
          message: `Row ${csvRow}, column acres: expected number, got "${row.acres}"`,
          row: csvRow,
          columnName: 'acres',
        });
      } else if (num < 0) {
        issues.push({
          severity: 'fail',
          message: `Row ${csvRow}, column acres: cannot be negative (${num})`,
          row: csvRow,
          columnName: 'acres',
        });
      }
    }

    if (
      !ctx.isExtraLayer &&
      ctx.geotype &&
      POINT_GEOTYPES.has(ctx.geotype) &&
      !isExcludedGeoRow(row)
    ) {
      for (const col of ['lat', 'lng'] as const) {
        const val = row[col];
        if (val === undefined || val === '') {
          issues.push({
            severity: 'fail',
            message: `Row ${csvRow}: missing ${col} for point feature`,
            row: csvRow,
            columnName: col,
          });
        } else if (Number.isNaN(Number(val))) {
          issues.push({
            severity: 'fail',
            message: `Row ${csvRow}, column ${col}: expected number, got "${val}"`,
            row: csvRow,
            columnName: col,
          });
        }
      }
    }
  });

  return issues;
}
