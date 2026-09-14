import { Activity, AreaChart, BarChart3, CandlestickChart, Check, ChevronDown, ChartLine, GitCompareArrows, Search, X } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import type { FinanceChartStyle, FinanceIndicatorId } from './financeChartUtils'
import { MotionPopover } from './ui'

export interface FinanceComparisonOption {
  id: string
  label: string
  detail?: string
  market?: string
}

const chartStyles: Array<{ id: FinanceChartStyle; label: string; icon: typeof ChartLine }> = [
  { id: 'line', label: 'Line', icon: ChartLine },
  { id: 'area', label: 'Area', icon: AreaChart },
  { id: 'candle', label: 'Candle', icon: CandlestickChart },
  { id: 'bar', label: 'Bar', icon: BarChart3 },
]

const indicators: Array<{ id: FinanceIndicatorId; label: string }> = [
  { id: 'sma', label: 'Moving average' },
  { id: 'macd', label: 'Moving average convergence divergence' },
  { id: 'envelope', label: 'Moving average envelope' },
]

function indicatorLabel(id: FinanceIndicatorId) {
  return indicators.find(item => item.id === id)?.label || id
}

export function FinanceProToggle({ enabled, onChange }: { enabled: boolean; onChange: (enabled: boolean) => void }) {
  return <button type="button" className={`finance-pro-toggle ${enabled ? 'is-active' : ''}`} aria-pressed={enabled} onClick={() => onChange(!enabled)} title="Use the Google Finance style chart controls">
    <Activity size={14}/><span>Pro graph</span>
  </button>
}

export function FinanceProToolbar({
  chartStyle,
  onChartStyleChange,
  comparison = 'none',
  onComparisonChange,
  comparisonOptions = [],
  indicators: selectedIndicators,
  onIndicatorsChange,
  candleAvailable = false,
  barAvailable = true,
  allowSymbolSearch = false,
}: {
  chartStyle: FinanceChartStyle
  onChartStyleChange: (style: FinanceChartStyle) => void
  comparison?: string
  onComparisonChange: (value: string) => void
  comparisonOptions?: FinanceComparisonOption[]
  indicators: FinanceIndicatorId[]
  onIndicatorsChange: (values: FinanceIndicatorId[]) => void
  candleAvailable?: boolean
  barAvailable?: boolean
  allowSymbolSearch?: boolean
}) {
  const root = useRef<HTMLDivElement>(null)
  const compareSearchRef = useRef<HTMLInputElement>(null)
  const [open, setOpen] = useState<'style' | 'compare' | 'indicator' | null>(null)
  const [query, setQuery] = useState('')

  useEffect(() => {
    const close = (event: MouseEvent) => {
      if (!root.current?.contains(event.target as Node)) setOpen(null)
    }
    const escape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(null)
    }
    document.addEventListener('mousedown', close)
    document.addEventListener('keydown', escape)
    return () => {
      document.removeEventListener('mousedown', close)
      document.removeEventListener('keydown', escape)
    }
  }, [])

  useEffect(() => {
    if (open !== 'compare') return
    const focusTimer = window.setTimeout(() => compareSearchRef.current?.focus(), 0)
    return () => window.clearTimeout(focusTimer)
  }, [open])

  const toggleIndicator = (id: FinanceIndicatorId) => {
    onIndicatorsChange(selectedIndicators.includes(id) ? selectedIndicators.filter(value => value !== id) : [...selectedIndicators, id])
  }
  const filteredComparisons = comparisonOptions.filter(item => `${item.label} ${item.detail || ''}`.toLowerCase().includes(query.trim().toLowerCase()))
  const styleLabel = chartStyles.find(item => item.id === chartStyle)?.label || 'Area'

  return <div className="finance-pro-tools" ref={root}>
    <div className="finance-pro-toolbar" role="toolbar" aria-label="Pro chart controls">
      <div className={`finance-pro-menu menu-anchor ${open === 'style' ? 'is-open' : ''}`}>
        <button type="button" className="finance-pro-menu-trigger" aria-haspopup="menu" aria-expanded={open === 'style'} onClick={() => setOpen(open === 'style' ? null : 'style')}>
          {chartStyle === 'line' ? <ChartLine size={17}/> : chartStyle === 'area' ? <AreaChart size={17}/> : chartStyle === 'candle' ? <CandlestickChart size={17}/> : <BarChart3 size={17}/>}<span>{styleLabel}</span><ChevronDown size={15}/>
        </button>
        <MotionPopover open={open === 'style'} className="finance-pro-menu-panel finance-pro-style-panel" role="menu" ariaLabel="Chart type" origin="top left">
          {chartStyles.map(({ id, label, icon: Icon }) => {
            const disabled = id === 'candle' ? !candleAvailable : id === 'bar' ? !barAvailable : false
            return <button type="button" key={id} role="menuitemradio" aria-checked={chartStyle === id} disabled={disabled} className={chartStyle === id ? 'is-selected' : ''} onClick={() => { onChartStyleChange(id); setOpen(null) }}>
              <Icon size={17}/><span>{label}</span>{chartStyle === id && <Check size={15}/>} {disabled && <small>Requires OHLC data</small>}
            </button>
          })}
        </MotionPopover>
      </div>

      <div className={`finance-pro-menu menu-anchor ${open === 'compare' ? 'is-open' : ''}`}>
        <button type="button" className="finance-pro-menu-trigger" aria-haspopup="menu" aria-expanded={open === 'compare'} onClick={() => setOpen(open === 'compare' ? null : 'compare')}>
          <GitCompareArrows size={17}/><span>Compare</span><ChevronDown size={15}/>
        </button>
        <MotionPopover open={open === 'compare'} className="finance-pro-menu-panel finance-pro-compare-panel" role="menu" ariaLabel="Compare to financial entity" origin="top left">
          <label className="finance-pro-search"><Search size={16}/><input ref={compareSearchRef} aria-label="Search for a symbol" placeholder="Search for a symbol…" value={query} onChange={event => setQuery(event.target.value)}/><button type="button" aria-label="Clear symbol search" onClick={() => setQuery('')}><X size={15}/></button></label>
          <span className="finance-pro-menu-heading">All symbols</span>
          <button type="button" role="menuitemradio" aria-checked={comparison === 'none'} className={comparison === 'none' ? 'is-selected' : ''} onClick={() => { onComparisonChange('none'); setOpen(null) }}><span>None</span>{comparison === 'none' && <Check size={15}/>}</button>
          {filteredComparisons.map(item => <button type="button" role="menuitemradio" aria-checked={comparison === item.id} className={comparison === item.id ? 'is-selected' : ''} key={item.id} onClick={() => { onComparisonChange(item.id); setOpen(null) }}><span><strong>{item.label}</strong>{item.detail && <small>{item.detail}</small>}</span>{comparison === item.id && <Check size={15}/>}</button>)}
          {allowSymbolSearch && query.trim() && /^[A-Z0-9.^=-]{1,15}$/i.test(query.trim()) && !comparisonOptions.some(item => item.id.toUpperCase() === query.trim().toUpperCase()) && <button type="button" role="menuitemradio" aria-checked={comparison === query.trim().toUpperCase()} className={comparison === query.trim().toUpperCase() ? 'is-selected' : ''} onClick={() => { onComparisonChange(query.trim().toUpperCase()); setOpen(null) }}><span><strong>{query.trim().toUpperCase()}</strong><small>Load market history</small></span>{comparison === query.trim().toUpperCase() && <Check size={15}/>}</button>}
          {!filteredComparisons.length && !(allowSymbolSearch && query.trim() && /^[A-Z0-9.^=-]{1,15}$/i.test(query.trim())) && <p className="finance-pro-empty">No comparison data for this chart.</p>}
        </MotionPopover>
      </div>

      <div className={`finance-pro-menu menu-anchor ${open === 'indicator' ? 'is-open' : ''}`}>
        <button type="button" className="finance-pro-menu-trigger" aria-haspopup="menu" aria-expanded={open === 'indicator'} onClick={() => setOpen(open === 'indicator' ? null : 'indicator')}>
          <BarChart3 size={17}/><span>Indicators</span><ChevronDown size={15}/>
        </button>
        <MotionPopover open={open === 'indicator'} className="finance-pro-menu-panel finance-pro-indicator-panel" role="menu" ariaLabel="Technical indicators" origin="top left">
          {indicators.map(item => <button type="button" role="menuitemcheckbox" aria-checked={selectedIndicators.includes(item.id)} className={selectedIndicators.includes(item.id) ? 'is-selected' : ''} key={item.id} onClick={() => toggleIndicator(item.id)}><span>{item.label}</span>{selectedIndicators.includes(item.id) && <Check size={15}/>}</button>)}
        </MotionPopover>
      </div>
    </div>
    {!!selectedIndicators.length && <div className="finance-indicator-chips" aria-label="Active indicators">
      {selectedIndicators.map(id => <button type="button" key={id} aria-label={`Remove ${indicatorLabel(id)}`} onClick={() => toggleIndicator(id)}><i className={`indicator-swatch indicator-${id}`}/><span>{id === 'sma' ? 'Moving average (SMA-5 Price)' : indicatorLabel(id)}</span><X size={15}/></button>)}
    </div>}
  </div>
}
