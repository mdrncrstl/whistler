import { FINANCE_PERIODS, type FinancePeriod } from '../lib/financePeriods'

export function FinancePeriodSelector({ value, onChange, ariaLabel = 'Chart period' }: { value: FinancePeriod; onChange: (value: FinancePeriod) => void; ariaLabel?: string }) {
  return <div className="finance-periods" role="group" aria-label={ariaLabel}>
    {FINANCE_PERIODS.map((period) => <button key={period} type="button" aria-pressed={value === period} onClick={() => onChange(period)}>{period}</button>)}
  </div>
}
