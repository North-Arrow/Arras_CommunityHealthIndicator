/**
 * Find approximate 1-based line/column for a JSON path segment in raw text.
 * Best-effort: searches for distinctive keys near an optional anchor (e.g. short_name).
 */
export function locateJsonPath(
  raw: string,
  path: string,
  anchor?: string
): { line?: number; column?: number } {
  const segments = path.split('.');
  const lastSeg = segments[segments.length - 1] ?? '';
  const keyMatch = lastSeg.match(/^([a-zA-Z_][\w-]*)(?:\[(\d+)\])?$/);
  const key = keyMatch?.[1];

  let searchFrom = 0;
  if (anchor) {
    const anchorIdx = raw.indexOf(`"${anchor}"`);
    if (anchorIdx >= 0) {
      searchFrom = Math.max(0, anchorIdx - 200);
    }
  }

  if (!key) {
    return offsetToLineCol(raw, searchFrom);
  }

  const needle = `"${key}"`;
  const idx = raw.indexOf(needle, searchFrom);
  if (idx < 0) {
    const fallback = raw.indexOf(needle);
    if (fallback < 0) return {};
    return offsetToLineCol(raw, fallback);
  }
  return offsetToLineCol(raw, idx);
}

export function offsetToLineCol(
  text: string,
  offset: number
): { line: number; column: number } {
  let line = 1;
  let column = 1;
  const end = Math.min(offset, text.length);
  for (let i = 0; i < end; i++) {
    if (text[i] === '\n') {
      line++;
      column = 1;
    } else {
      column++;
    }
  }
  return { line, column };
}

/** Extract character position from native JSON.parse error messages when present. */
export function parseJsonErrorPosition(
  message: string,
  raw: string
): { line?: number; column?: number } {
  const posMatch = message.match(/position\s+(\d+)/i);
  if (posMatch) {
    return offsetToLineCol(raw, Number(posMatch[1]));
  }
  const lineMatch = message.match(/line\s+(\d+)\s+column\s+(\d+)/i);
  if (lineMatch) {
    return { line: Number(lineMatch[1]), column: Number(lineMatch[2]) };
  }
  return {};
}

export function extractPlaceholders(text: string): string[] {
  const found: string[] = [];
  const re = /\{\{\s*([a-zA-Z_][\w]*)\s*\}\}/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    found.push(m[1]);
  }
  return found;
}
