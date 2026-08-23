export const money = (value: number, currency = 'AUD', maximumFractionDigits = 0) =>
  new Intl.NumberFormat('en-AU', { style: 'currency', currency, maximumFractionDigits }).format(Number(value || 0))

export const number = (value: number, maximumFractionDigits = 2) =>
  new Intl.NumberFormat('en-AU', { maximumFractionDigits }).format(Number(value || 0))

export const percent = (value: number, digits = 2) => `${value >= 0 ? '+' : ''}${Number(value || 0).toFixed(digits)}%`

export const date = (value?: string | null, options: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short', year: 'numeric' }) => {
  if (!value) return 'Never'
  const parsed = new Date(value)
  return Number.isNaN(parsed.getTime()) ? 'Unknown' : new Intl.DateTimeFormat('en-AU', options).format(parsed)
}

export const relativeDate = (value?: string | null) => {
  if (!value) return 'Never synced'
  const milliseconds = Date.now() - new Date(value).getTime()
  const minutes = Math.round(milliseconds / 60_000)
  if (minutes < 2) return 'Just now'
  if (minutes < 60) return `${minutes} minutes ago`
  const hours = Math.round(minutes / 60)
  if (hours < 24) return `${hours} hour${hours === 1 ? '' : 's'} ago`
  const days = Math.round(hours / 24)
  return `${days} day${days === 1 ? '' : 's'} ago`
}

export function csvCell(value: unknown) {
  const text = String(value ?? '')
  return /[",\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text
}

export function downloadCsv(filename: string, headers: string[], rows: unknown[][]) {
  const content = [headers, ...rows].map((row) => row.map(csvCell).join(',')).join('\n')
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  document.body.appendChild(anchor)
  anchor.click()
  anchor.remove()
  URL.revokeObjectURL(url)
}
