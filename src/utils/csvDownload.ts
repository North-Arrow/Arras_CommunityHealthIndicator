import axios from 'axios'
import { CSV_DOWNLOAD_CELL_REPLACEMENTS } from '../constants'

function parseFilenameFromContentDisposition(header: string | undefined): string | null {
  if (!header) return null
  const utf8Match = header.match(/filename\*=UTF-8''([^;]+)/i)
  if (utf8Match) {
    try {
      return decodeURIComponent(utf8Match[1].trim())
    } catch {
      return utf8Match[1].trim()
    }
  }
  const quoted = header.match(/filename="([^"]+)"/i)
  if (quoted) return quoted[1]
  const unquoted = header.match(/filename=([^;]+)/i)
  if (unquoted) return unquoted[1].trim()
  return null
}

/** e.g. "Housing_Burden - Sheet1.csv" -> "Housing_Burden.csv" */
export function sanitizeCsvDownloadFilename(
  suggestedName: string | null | undefined,
  fallbackFilename: string,
): string {
  const raw = (suggestedName?.trim() || fallbackFilename.trim() || 'data.csv').replace(/[/\\]/g, '_')
  const withoutSheetSuffix = raw.includes(' - ') ? raw.split(' - ')[0].trim() : raw
  const base = withoutSheetSuffix.replace(/\.csv$/i, '')
  return `${base}.csv`
}

function parseCsvLine(line: string): string[] {
  const fields: string[] = []
  let current = ''
  let inQuotes = false
  for (let i = 0; i < line.length; i++) {
    const char = line[i]
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"'
        i++
      } else {
        inQuotes = !inQuotes
      }
    } else if (char === ',' && !inQuotes) {
      fields.push(current)
      current = ''
    } else {
      current += char
    }
  }
  fields.push(current)
  return fields
}

function formatCsvLine(fields: string[]): string {
  return fields
    .map((field) => {
      if (/[",\n\r]/.test(field)) {
        return `"${field.replace(/"/g, '""')}"`
      }
      return field
    })
    .join(',')
}

/** Decode URL-encoded cell text from Google Sheets exports (e.g. %2C → comma). */
function decodeCsvCellValue(cell: string): string {
  if (!/%[0-9A-Fa-f]{2}/.test(cell)) return cell
  try {
    return decodeURIComponent(cell.replace(/\+/g, ' '))
  } catch {
    return cell
  }
}

export function transformCsvForDownload(
  csvText: string,
  replacements: Record<string, string> = CSV_DOWNLOAD_CELL_REPLACEMENTS,
): string {
  const lookup = new Map(
    Object.entries(replacements).map(([key, value]) => [key.trim().toLowerCase(), value]),
  )

  const lines = csvText.split(/\r?\n/)
  return lines
    .map((line) => {
      if (!line.trim()) return line
      const fields = parseCsvLine(line)
      const updated = fields.map((cell) => {
        const decoded = decodeCsvCellValue(cell)
        const replacement = lookup.get(decoded.trim().toLowerCase())
        return replacement ?? decoded
      })
      return formatCsvLine(updated)
    })
    .join('\n')
}

export async function downloadGoogleSheetCsv(
  googleSheetsUrl: string,
  options?: {
    fallbackFilename?: string
    cellReplacements?: Record<string, string>
  },
): Promise<void> {
  const response = await axios.get<string>(googleSheetsUrl, {
    responseType: 'text',
    headers: { Accept: 'text/csv' },
  })

  const replacements = options?.cellReplacements ?? CSV_DOWNLOAD_CELL_REPLACEMENTS
  const csvContent = transformCsvForDownload(response.data, replacements)
  const filename = sanitizeCsvDownloadFilename(
    parseFilenameFromContentDisposition(response.headers['content-disposition'] as string | undefined),
    options?.fallbackFilename ?? 'data.csv',
  )

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8' })
  const objectUrl = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = objectUrl
  anchor.download = filename
  anchor.click()
  URL.revokeObjectURL(objectUrl)
}
