export const FINANCE_PERIODS = ['1D', '5D', '1W', '1M', '6M', 'YTD', '1Y', '5Y', 'MAX'] as const

export type FinancePeriod = typeof FINANCE_PERIODS[number]

const DAY_MS = 86_400_000

export function financePeriodCutoff(period: FinancePeriod, latest: string) {
  const end = Date.parse(latest)
  if (!Number.isFinite(end) || period === 'MAX') return null
  if (period === 'YTD') {
    const latestDate = new Date(end)
    return Date.UTC(latestDate.getUTCFullYear(), 0, 1)
  }
  const days: Record<Exclude<FinancePeriod, 'YTD' | 'MAX'>, number> = {
    '1D': 1,
    '5D': 5,
    '1W': 7,
    '1M': 31,
    '6M': 183,
    '1Y': 365,
    '5Y': 365 * 5,
  }
  return end - days[period as Exclude<FinancePeriod, 'YTD' | 'MAX'>] * DAY_MS
}

function utcDay(value: string) {
  return value.slice(0, 10)
}

function latestSession<T extends { date: string }>(points: T[]) {
  const latestDay = utcDay(points.at(-1)?.date || '')
  if (!latestDay) return []
  return points.filter((point) => utcDay(point.date) === latestDay)
}

export function filterFinancePoints<T extends { date: string }>(points: T[], period: FinancePeriod) {
  const sorted = [...points].sort((a, b) => Date.parse(a.date) - Date.parse(b.date))
  if (sorted.length < 2 || period === 'MAX') return sorted
  const latest = sorted.at(-1)?.date
  const cutoff = latest ? financePeriodCutoff(period, latest) : null
  if (cutoff === null) return sorted
  const filtered = sorted.filter((point) => Date.parse(point.date) >= cutoff)
  if (period === '1D') {
    const session = latestSession(sorted)
    if (session.length >= 2) return session
  }
  return filtered.length >= 2 ? filtered : sorted.slice(-2)
}
