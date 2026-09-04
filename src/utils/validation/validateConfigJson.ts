import {
  ALLOWED_PLACEHOLDERS,
  MAP_COLUMN_KINDS,
  POINT_GEOTYPES,
  SHORT_NAME_RE,
  type ValidationIssue,
} from './types';
import {
  extractPlaceholders,
  locateJsonPath,
  parseJsonErrorPosition,
} from './locateInText';

function issue(
  severity: ValidationIssue['severity'],
  message: string,
  path: string | undefined,
  raw: string,
  anchor?: string
): ValidationIssue {
  const loc = path ? locateJsonPath(raw, path, anchor) : {};
  return { severity, message, path, ...loc };
}

export function parseJsonSafe(raw: string): {
  data?: unknown;
  issues: ValidationIssue[];
} {
  try {
    return { data: JSON.parse(raw), issues: [] };
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    const loc = parseJsonErrorPosition(message, raw);
    return {
      issues: [
        {
          severity: 'fail',
          message: `Invalid JSON: ${message}`,
          path: '(root)',
          ...loc,
        },
      ],
    };
  }
}

export function validateMainConfig(
  data: unknown,
  raw: string
): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    issues.push(issue('fail', 'main.json must be a JSON object', '(root)', raw));
    return issues;
  }
  const obj = data as Record<string, unknown>;

  for (const key of ['categories', 'geo', 'data_sources'] as const) {
    if (!(key in obj)) {
      issues.push(issue('fail', `Missing required top-level key "${key}"`, key, raw));
    }
  }

  if (!Array.isArray(obj.categories)) {
    if (obj.categories !== undefined) {
      issues.push(
        issue('fail', '"categories" must be an array', 'categories', raw)
      );
    }
  } else {
    obj.categories.forEach((cat, i) => {
      const path = `categories[${i}]`;
      if (!cat || typeof cat !== 'object') {
        issues.push(issue('fail', 'Category must be an object', path, raw));
        return;
      }
      const c = cat as Record<string, unknown>;
      if (c.enabled && !c.config) {
        issues.push(
          issue(
            'fail',
            'Enabled category is missing "config" path',
            `${path}.config`,
            raw
          )
        );
      }
      if (c.enabled && !c.query_str) {
        issues.push(
          issue(
            'fail',
            'Enabled category is missing "query_str"',
            `${path}.query_str`,
            raw
          )
        );
      }
      if (c.config !== undefined && typeof c.config !== 'string') {
        issues.push(
          issue('fail', '"config" must be a string', `${path}.config`, raw)
        );
      }
    });
  }

  if (obj.geo !== undefined) {
    if (!obj.geo || typeof obj.geo !== 'object' || Array.isArray(obj.geo)) {
      issues.push(issue('fail', '"geo" must be an object', 'geo', raw));
    } else {
      const geo = obj.geo as Record<string, unknown>;
      for (const [geotype, cfg] of Object.entries(geo)) {
        const path = `geo.${geotype}`;
        if (!cfg || typeof cfg !== 'object') {
          issues.push(issue('fail', 'Geotype config must be an object', path, raw));
          continue;
        }
        const g = cfg as Record<string, unknown>;
        if (typeof g.geolevel !== 'string') {
          issues.push(
            issue('fail', 'Missing or invalid "geolevel"', `${path}.geolevel`, raw)
          );
        }
        if (typeof g.source_name !== 'string') {
          issues.push(
            issue(
              'fail',
              'Missing or invalid "source_name"',
              `${path}.source_name`,
              raw
            )
          );
        }
        if (!g.layers || typeof g.layers !== 'object') {
          issues.push(
            issue('fail', 'Missing or invalid "layers"', `${path}.layers`, raw)
          );
        } else {
          const layers = g.layers as Record<string, unknown>;
          if (typeof layers.main !== 'string') {
            issues.push(
              issue(
                'fail',
                'layers.main must be a string',
                `${path}.layers.main`,
                raw
              )
            );
          }
        }
      }
    }
  }

  if (obj.data_sources !== undefined) {
    if (
      !obj.data_sources ||
      typeof obj.data_sources !== 'object' ||
      Array.isArray(obj.data_sources)
    ) {
      issues.push(
        issue('fail', '"data_sources" must be an object', 'data_sources', raw)
      );
    } else {
      for (const [key, src] of Object.entries(
        obj.data_sources as Record<string, unknown>
      )) {
        const path = `data_sources.${key}`;
        if (!src || typeof src !== 'object') {
          issues.push(issue('fail', 'Data source must be an object', path, raw));
          continue;
        }
        const s = src as Record<string, unknown>;
        if (typeof s.text !== 'string' || !s.text.trim()) {
          issues.push(
            issue('fail', 'data_source.text must be a non-empty string', `${path}.text`, raw)
          );
        }
        if (typeof s.url !== 'string' || !s.url.trim()) {
          issues.push(
            issue('fail', 'data_source.url must be a non-empty string', `${path}.url`, raw)
          );
        }
      }
    }
  }

  return issues;
}

export function validateBrandingConfig(
  data: unknown,
  raw: string
): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    issues.push(
      issue('fail', 'arras_branding.json must be a JSON object', '(root)', raw)
    );
    return issues;
  }
  const obj = data as Record<string, unknown>;
  const colors = obj.colors;
  if (!colors || typeof colors !== 'object' || Array.isArray(colors)) {
    issues.push(
      issue('fail', 'Missing "colors" object of named tokens', 'colors', raw)
    );
    return issues;
  }
  for (const [name, value] of Object.entries(colors as Record<string, unknown>)) {
    if (typeof value !== 'string' || !value.trim()) {
      issues.push(
        issue(
          'fail',
          `Color token "${name}" must be a non-empty string`,
          `colors.${name}`,
          raw
        )
      );
    }
  }
  return issues;
}

function checkPlaceholdersInString(
  text: string,
  path: string,
  raw: string,
  anchor: string | undefined,
  issues: ValidationIssue[]
) {
  for (const ph of extractPlaceholders(text)) {
    if (!ALLOWED_PLACEHOLDERS.has(ph)) {
      issues.push(
        issue(
          'fail',
          `Unknown placeholder {{${ph}}}; allowed: ${[...ALLOWED_PLACEHOLDERS].join(', ')}`,
          path,
          raw,
          anchor
        )
      );
    }
  }
}

function walkStringsForPlaceholders(
  value: unknown,
  path: string,
  raw: string,
  anchor: string | undefined,
  issues: ValidationIssue[]
) {
  if (typeof value === 'string') {
    checkPlaceholdersInString(value, path, raw, anchor, issues);
    return;
  }
  if (Array.isArray(value)) {
    value.forEach((v, i) =>
      walkStringsForPlaceholders(v, `${path}[${i}]`, raw, anchor, issues)
    );
    return;
  }
  if (value && typeof value === 'object') {
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      walkStringsForPlaceholders(v, `${path}.${k}`, raw, anchor, issues);
    }
  }
}

export interface ThemeValidationContext {
  geoKeys: Set<string>;
  dataSourceKeys: Set<string>;
  /** short_name → first seen "filename::index" for uniqueness across themes */
  seenShortNames: Map<string, string>;
  filename: string;
}

export function validateThemeConfig(
  data: unknown,
  raw: string,
  ctx: ThemeValidationContext
): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    issues.push(
      issue('fail', 'Theme config must be a JSON object', '(root)', raw)
    );
    return issues;
  }
  const obj = data as Record<string, unknown>;
  if (!Array.isArray(obj.indicators)) {
    issues.push(
      issue(
        'fail',
        'Theme config must contain an "indicators" array',
        'indicators',
        raw
      )
    );
    return issues;
  }

  obj.indicators.forEach((ind, i) => {
    const base = `indicators[${i}]`;
    if (!ind || typeof ind !== 'object') {
      issues.push(issue('fail', 'Indicator must be an object', base, raw));
      return;
    }
    const indicator = ind as Record<string, unknown>;
    const shortName =
      typeof indicator.short_name === 'string' ? indicator.short_name : undefined;
    const anchor = shortName;

    const required = [
      'title',
      'short_title',
      'geotype',
      'default',
      'google_sheets_url',
      'short_name',
      'timeline',
      'popup',
      'legend',
    ] as const;

    for (const key of required) {
      if (indicator[key] === undefined || indicator[key] === null) {
        issues.push(
          issue(
            'fail',
            `Missing required property "${key}"`,
            `${base}.${key}`,
            raw,
            anchor
          )
        );
      }
    }

    for (const strKey of ['title', 'short_title', 'short_name', 'google_sheets_url'] as const) {
      if (indicator[strKey] !== undefined && typeof indicator[strKey] !== 'string') {
        issues.push(
          issue(
            'fail',
            `"${strKey}" must be a string`,
            `${base}.${strKey}`,
            raw,
            anchor
          )
        );
      }
    }

    if (typeof indicator.short_name === 'string') {
      if (!indicator.short_name.trim()) {
        issues.push(
          issue('fail', 'short_name must be non-empty', `${base}.short_name`, raw)
        );
      } else if (!SHORT_NAME_RE.test(indicator.short_name)) {
        issues.push(
          issue(
            'fail',
            'short_name must be URL-safe (letters, numbers, _ or - only)',
            `${base}.short_name`,
            raw,
            anchor
          )
        );
      } else {
        const prev = ctx.seenShortNames.get(indicator.short_name);
        if (prev) {
          issues.push(
            issue(
              'fail',
              `Duplicate short_name "${indicator.short_name}" (also in ${prev})`,
              `${base}.short_name`,
              raw,
              anchor
            )
          );
        } else {
          ctx.seenShortNames.set(
            indicator.short_name,
            `${ctx.filename}::${base}`
          );
        }
      }
    }

    if (typeof indicator.geotype === 'string') {
      if (!ctx.geoKeys.has(indicator.geotype)) {
        issues.push(
          issue(
            'fail',
            `geotype "${indicator.geotype}" is not defined in main.json geo`,
            `${base}.geotype`,
            raw,
            anchor
          )
        );
      }
    } else if (indicator.geotype !== undefined) {
      issues.push(
        issue('fail', 'geotype must be a string', `${base}.geotype`, raw, anchor)
      );
    }

    const def = indicator.default;
    if (def === '') {
      issues.push(
        issue(
          'fail',
          'default must not be empty string; use false instead',
          `${base}.default`,
          raw,
          anchor
        )
      );
    } else if (def !== undefined && def !== 'left' && def !== 'right' && def !== false) {
      issues.push(
        issue(
          'fail',
          'default must be "left", "right", or false',
          `${base}.default`,
          raw,
          anchor
        )
      );
    }

    if (typeof indicator.google_sheets_url === 'string') {
      const url = indicator.google_sheets_url;
      if (!url.includes('output=csv')) {
        issues.push(
          issue(
            'fail',
            'google_sheets_url must be a published CSV URL (contain output=csv)',
            `${base}.google_sheets_url`,
            raw,
            anchor
          )
        );
      }
      try {
        void new URL(url);
      } catch {
        issues.push(
          issue(
            'fail',
            'google_sheets_url is not a valid URL',
            `${base}.google_sheets_url`,
            raw,
            anchor
          )
        );
      }
    }

    if (indicator.data_source !== undefined && indicator.data_source !== null) {
      if (typeof indicator.data_source === 'string') {
        if (!ctx.dataSourceKeys.has(indicator.data_source)) {
          issues.push(
            issue(
              'fail',
              `data_source "${indicator.data_source}" is not in main.json data_sources`,
              `${base}.data_source`,
              raw,
              anchor
            )
          );
        }
      } else if (
        typeof indicator.data_source === 'object'
      ) {
        // Resolved object shape is OK at runtime after merge; warn if unexpected in file
        issues.push(
          issue(
            'warn',
            'data_source should be a string key into main.json data_sources',
            `${base}.data_source`,
            raw,
            anchor
          )
        );
      } else {
        issues.push(
          issue(
            'fail',
            'data_source must be a string key (or null/omitted)',
            `${base}.data_source`,
            raw,
            anchor
          )
        );
      }
    }

    const timeline = indicator.timeline;
    if (timeline !== undefined) {
      if (!timeline || typeof timeline !== 'object' || Array.isArray(timeline)) {
        issues.push(
          issue('fail', 'timeline must be an object', `${base}.timeline`, raw, anchor)
        );
      } else {
        const t = timeline as Record<string, unknown>;
        if (typeof t.yearValuePrefix !== 'string' || !t.yearValuePrefix) {
          issues.push(
            issue(
              'fail',
              'timeline.yearValuePrefix must be a non-empty string',
              `${base}.timeline.yearValuePrefix`,
              raw,
              anchor
            )
          );
        }
        if (typeof t.yearValueShortFormat !== 'string') {
          issues.push(
            issue(
              'fail',
              'timeline.yearValueShortFormat must be a string',
              `${base}.timeline.yearValueShortFormat`,
              raw,
              anchor
            )
          );
        } else if (!t.yearValueShortFormat.includes('{{value}}')) {
          issues.push(
            issue(
              'fail',
              'timeline.yearValueShortFormat must include {{value}}',
              `${base}.timeline.yearValueShortFormat`,
              raw,
              anchor
            )
          );
        }
        if (!Array.isArray(t.filterOut)) {
          issues.push(
            issue(
              'fail',
              'timeline.filterOut must be an array',
              `${base}.timeline.filterOut`,
              raw,
              anchor
            )
          );
        }
      }
    }

    const popup = indicator.popup;
    if (popup !== undefined) {
      if (!popup || typeof popup !== 'object' || Array.isArray(popup)) {
        issues.push(
          issue('fail', 'popup must be an object', `${base}.popup`, raw, anchor)
        );
      } else {
        const p = popup as Record<string, unknown>;
        const format = p.format;
        if (!format || typeof format !== 'object' || Array.isArray(format)) {
          issues.push(
            issue(
              'fail',
              'popup.format must be an object',
              `${base}.popup.format`,
              raw,
              anchor
            )
          );
        } else {
          const f = format as Record<string, unknown>;
          if (typeof f.title !== 'string' || !f.title.trim()) {
            issues.push(
              issue(
                'fail',
                'popup.format.title must be a non-empty string',
                `${base}.popup.format.title`,
                raw,
                anchor
              )
            );
          }
        }
        walkStringsForPlaceholders(popup, `${base}.popup`, raw, anchor, issues);
      }
    }

    const legend = indicator.legend;
    if (legend !== undefined) {
      if (!legend || typeof legend !== 'object' || Array.isArray(legend)) {
        issues.push(
          issue('fail', 'legend must be an object', `${base}.legend`, raw, anchor)
        );
      } else {
        const l = legend as Record<string, unknown>;
        if (l.title === undefined && l['title-column'] === undefined) {
          issues.push(
            issue(
              'fail',
              'legend must have "title" and/or "title-column"',
              `${base}.legend`,
              raw,
              anchor
            )
          );
        }
        walkStringsForPlaceholders(legend, `${base}.legend`, raw, anchor, issues);

        const extra = l.extra_layers;
        if (extra !== undefined) {
          if (!extra || typeof extra !== 'object' || Array.isArray(extra)) {
            issues.push(
              issue(
                'fail',
                'legend.extra_layers must be an object',
                `${base}.legend.extra_layers`,
                raw,
                anchor
              )
            );
          } else {
            const el = extra as Record<string, unknown>;
            const dm = el.data_merge as Record<string, unknown> | undefined;
            if (dm?.google_sheets_url !== undefined) {
              if (typeof dm.google_sheets_url !== 'string') {
                issues.push(
                  issue(
                    'fail',
                    'extra_layers data_merge.google_sheets_url must be a string',
                    `${base}.legend.extra_layers.data_merge.google_sheets_url`,
                    raw,
                    anchor
                  )
                );
              } else if (!dm.google_sheets_url.includes('output=csv')) {
                issues.push(
                  issue(
                    'fail',
                    'extra_layers google_sheets_url must contain output=csv',
                    `${base}.legend.extra_layers.data_merge.google_sheets_url`,
                    raw,
                    anchor
                  )
                );
              }
            }
          }
        }
      }
    }

    const map = indicator.map;
    if (map !== undefined) {
      if (!map || typeof map !== 'object' || Array.isArray(map)) {
        issues.push(
          issue('fail', 'map must be an object', `${base}.map`, raw, anchor)
        );
      } else {
        const m = map as Record<string, unknown>;
        if (m.size !== undefined) {
          if (typeof m.size !== 'string' || !MAP_COLUMN_KINDS.has(m.size)) {
            issues.push(
              issue(
                'fail',
                `map.size must be one of: ${[...MAP_COLUMN_KINDS].join(', ')}`,
                `${base}.map.size`,
                raw,
                anchor
              )
            );
          }
          if (
            typeof indicator.geotype === 'string' &&
            !POINT_GEOTYPES.has(indicator.geotype)
          ) {
            issues.push(
              issue(
                'fail',
                'map.size is only allowed for point geotypes (school, facility)',
                `${base}.map.size`,
                raw,
                anchor
              )
            );
          }
        }
        if (m.color !== undefined && m.color !== null) {
          if (typeof m.color !== 'string' || !MAP_COLUMN_KINDS.has(m.color)) {
            issues.push(
              issue(
                'fail',
                `map.color must be null or one of: ${[...MAP_COLUMN_KINDS].join(', ')}`,
                `${base}.map.color`,
                raw,
                anchor
              )
            );
          }
        }
      }
    }
  });

  return issues;
}

export function collectSheetTargets(
  data: unknown
): Array<{
  shortName: string;
  label: string;
  url: string;
  geotype?: string;
  yearValuePrefix?: string;
  requiredPrefixes: Set<string>;
}> {
  const targets: Array<{
    shortName: string;
    label: string;
    url: string;
    geotype?: string;
    yearValuePrefix?: string;
    requiredPrefixes: Set<string>;
  }> = [];

  if (!data || typeof data !== 'object') return targets;
  const indicators = (data as Record<string, unknown>).indicators;
  if (!Array.isArray(indicators)) return targets;

  indicators.forEach((ind, i) => {
    if (!ind || typeof ind !== 'object') return;
    const indicator = ind as Record<string, unknown>;
    const shortName =
      typeof indicator.short_name === 'string'
        ? indicator.short_name
        : `indicators[${i}]`;
    const geotype =
      typeof indicator.geotype === 'string' ? indicator.geotype : undefined;
    const timeline = indicator.timeline as Record<string, unknown> | undefined;
    const yearValuePrefix =
      typeof timeline?.yearValuePrefix === 'string'
        ? timeline.yearValuePrefix
        : undefined;

    const requiredPrefixes = new Set<string>();
    if (yearValuePrefix) {
      requiredPrefixes.add(yearValuePrefix);
    }

    const collectFromText = (text: unknown) => {
      if (typeof text !== 'string') return;
      for (const ph of extractPlaceholders(text)) {
        if (ph === 'pct' || ph === 'count' || ph === 'pop' || ph === 'rate') {
          requiredPrefixes.add(`${ph}_`);
        }
      }
    };
    const walk = (v: unknown) => {
      if (typeof v === 'string') collectFromText(v);
      else if (Array.isArray(v)) v.forEach(walk);
      else if (v && typeof v === 'object') {
        Object.values(v as Record<string, unknown>).forEach(walk);
      }
    };
    walk(indicator.popup);
    walk(indicator.legend);

    if (typeof indicator.google_sheets_url === 'string') {
      targets.push({
        shortName,
        label: `${shortName}`,
        url: indicator.google_sheets_url,
        geotype,
        yearValuePrefix,
        requiredPrefixes,
      });
    }

    const legend = indicator.legend as Record<string, unknown> | undefined;
    const extra = legend?.extra_layers as Record<string, unknown> | undefined;
    const dm = extra?.data_merge as Record<string, unknown> | undefined;
    if (typeof dm?.google_sheets_url === 'string') {
      targets.push({
        shortName,
        label: `${shortName} (extra_layers)`,
        url: dm.google_sheets_url,
        geotype,
        yearValuePrefix: undefined,
        requiredPrefixes: new Set(),
      });
    }
  });

  return targets;
}
