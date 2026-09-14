import { FINANCE_PERIODS, type FinancePeriod } from '../lib/financePeriods'
import { SlidingTabs } from './ui'

export function FinancePeriodSelector({ value, onChange, ariaLabel = 'Chart period' }: { value: FinancePeriod; onChange: (value: FinancePeriod) => void; ariaLabel?: string }) {
  return <SlidingTabs
    className="finance-periods"
    options={FINANCE_PERIODS.map(period => ({ value: period, label: period }))}
    value={value}
    onChange={onChange}
    ariaLabel={ariaLabel}
  />
}
