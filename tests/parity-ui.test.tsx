import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { ReactNode } from 'react'
import { PortfolioProvider } from '../src/context/PortfolioContext'
import { AppShell } from '../src/components/AppShell'
import { Reports } from '../src/features/Reports'
import { TaxCentre } from '../src/features/TaxCentre'
import { Tools } from '../src/features/Tools'
import { Overview } from '../src/features/Overview'
import { HoldingDetail } from '../src/features/HoldingDetail'
import { SupplyChain } from '../src/features/SupplyChain'

function renderRoute(path: string, route: string, node: ReactNode) {
  return render(<MemoryRouter initialEntries={[path]}><PortfolioProvider session={null} demo><Routes><Route path={route} element={node}/></Routes></PortfolioProvider></MemoryRouter>)
}

describe('Navexa-depth workspace routes', () => {
  beforeEach(() => window.localStorage.clear())
  afterEach(() => { cleanup(); vi.useRealTimers(); vi.unstubAllGlobals() })

  it('scopes the tax income ledger to the selected financial year', () => {
    renderRoute('/app/tax/taxable-income', '/app/tax/:report', <TaxCentre/>)
    fireEvent.change(screen.getByLabelText('Financial year'), {target:{value:'2026/27'}})
    expect(screen.getByRole('row', {name:/Open VGS holding/})).toBeInTheDocument()
    expect(screen.queryByRole('row', {name:/Open AAPL holding/})).not.toBeInTheDocument()
    fireEvent.change(screen.getByLabelText('Financial year'), {target:{value:'2025/26'}})
    expect(screen.getByRole('row', {name:/Open AAPL holding/})).toBeInTheDocument()
  })

  it('does not invent franking amounts or annualised portfolio returns', () => {
    const tax = renderRoute('/app/tax/mytax', '/app/tax/:report', <TaxCentre/>)
    expect(screen.getByRole('row', {name:'11U Franking credits Not supplied'})).toBeInTheDocument()
    tax.unmount()
    renderRoute('/app', '/app', <Overview/>)
    expect(screen.queryByText('p.a.')).not.toBeInTheDocument()
    expect(within(screen.getByRole('row', {name:'Open AAPL holding'})).getByText('$7,797.40')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('tab', {name:/Capital Gain/}))
    expect(screen.getByText('Historical return components are not available')).toBeInTheDocument()
  })

  it('renders the full nested report and tax sidebar hierarchy', () => {
    render(<MemoryRouter initialEntries={['/app']}><PortfolioProvider session={null} demo><AppShell onExitDemo={() => undefined}><div>Workspace</div></AppShell></PortfolioProvider></MemoryRouter>)
    const nav = screen.getByRole('navigation', { name: 'Portfolio navigation' })
    expect(within(nav).getByText('Performance')).toBeInTheDocument()
    expect(within(nav).getByRole('link', { name: 'Benchmark Analysis' })).toBeInTheDocument()
    expect(within(nav).getByText('Tax Reports')).toBeInTheDocument()
    expect(within(nav).getByRole('link', { name: 'Recorded Cost' })).toBeInTheDocument()
    expect(within(nav).queryByRole('link', { name: 'Holdings' })).not.toBeInTheDocument()
    expect(within(nav).queryByRole('link', { name: 'Connections' })).not.toBeInTheDocument()
  })

  it('collapses report sections and the complete sidebar rail', () => {
    const { container } = render(<MemoryRouter initialEntries={['/app']}><PortfolioProvider session={null} demo><AppShell onExitDemo={() => undefined}><div>Workspace</div></AppShell></PortfolioProvider></MemoryRouter>)
    const nav = screen.getByRole('navigation', { name: 'Portfolio navigation' })
    fireEvent.click(within(nav).getByRole('button', { name: 'Performance' }))
    expect(within(nav).getByRole('button', { name: 'Performance' })).toHaveAttribute('aria-expanded', 'false')
    expect(within(nav).queryByRole('link', { name: 'Benchmark Analysis' })).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Collapse sidebar' }))
    expect(container.querySelector('.app-shell')).toHaveClass('sidebar-collapsed')
    expect(screen.getByRole('button', { name: 'Expand sidebar' })).toBeInTheDocument()
  })

  it('opens the portfolio selector and keyboard command palette', () => {
    render(<MemoryRouter initialEntries={['/app']}><PortfolioProvider session={null} demo><AppShell onExitDemo={() => undefined}><div>Workspace</div></AppShell></PortfolioProvider></MemoryRouter>)
    fireEvent.click(screen.getByRole('button', { name: /All Portfolios/i }))
    expect(screen.getByRole('menuitem', { name: /Manage portfolios/ })).toBeInTheDocument()
    fireEvent.keyDown(window, { key: 'k', ctrlKey: true })
    expect(screen.getByRole('dialog', { name: 'Search workspace' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Add holdings/ })).toBeInTheDocument()
  })

  it('supports keyboard selection in the command palette and closes the mobile drawer', async () => {
    const { container } = render(<MemoryRouter initialEntries={['/app']}><PortfolioProvider session={null} demo><AppShell onExitDemo={() => undefined}><div>Workspace</div></AppShell></PortfolioProvider></MemoryRouter>)
    fireEvent.keyDown(window, { key: 'k', ctrlKey: true })
    const input = screen.getByRole('textbox', { name: 'Search or jump to' })
    fireEvent.change(input, { target: { value: 'port' } })
    fireEvent.keyDown(input, { key: 'ArrowDown' })
    expect(container.querySelectorAll('.command-results button[aria-selected="true"]').length).toBe(1)
    fireEvent.click(screen.getByRole('button', { name: 'Open navigation' }))
    expect(container.querySelector('.mobile-drawer')).toBeInTheDocument()
    fireEvent.keyDown(window, { key: 'Escape' })
    await waitFor(() => expect(container.querySelector('.mobile-drawer')).not.toBeInTheDocument())
    fireEvent.click(screen.getByRole('button', { name: 'Open navigation' }))
    const drawer = container.querySelector('.mobile-drawer')!
    fireEvent.mouseDown(drawer)
    await waitFor(() => expect(container.querySelector('.mobile-drawer')).not.toBeInTheDocument())
  })

  it('opens the complete account menu and changes theme without leaving the page', () => {
    render(<MemoryRouter initialEntries={['/app']}><PortfolioProvider session={null} demo><AppShell onExitDemo={() => undefined}><div>Workspace</div></AppShell></PortfolioProvider></MemoryRouter>)
    fireEvent.click(screen.getByRole('button', { name: 'Open account menu' }))
    expect(screen.getByRole('menuitem', { name: /Billing & Subscription/ })).toBeInTheDocument()
    expect(screen.getByRole('menuitem', { name: /Refer a Friend/ })).toBeInTheDocument()
    fireEvent.click(screen.getByRole('menuitem', { name: /Dark mode/ }))
    expect(document.documentElement).toHaveAttribute('data-theme', 'dark')
  })

  it('makes the portfolio filter, chart, groups and columns interactive', () => {
    renderRoute('/app', '/app', <Overview/>)
    fireEvent.click(screen.getByRole('button', { name: 'All Time' }))
    fireEvent.click(screen.getByRole('button', { name: 'Custom range' }))
    expect(screen.getByRole('region', { name: 'Custom date range' })).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Filter' }))
    expect(screen.getByRole('region', { name: 'Portfolio filters' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Filter' })).toHaveAttribute('data-tooltip', 'Filter Holdings')
    expect(screen.getByRole('button', { name: 'All Positions' })).toHaveAttribute('data-tooltip', expect.stringContaining('closed positions'))
    fireEvent.click(screen.getByRole('button', { name: 'Percent' }))
    expect(screen.getByRole('button', { name: 'Percent' })).toHaveClass('active')
    expect(screen.queryByRole('button', { name: 'Bar' })).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Columns' }))
    expect(screen.getByRole('dialog', { name: 'Column Settings' })).toBeInTheDocument()
    const averagePrice = screen.getByRole('checkbox', { name: 'Avg Buy Price' })
    expect(averagePrice).not.toBeChecked()
    fireEvent.click(averagePrice)
    fireEvent.click(screen.getByRole('button', { name: 'Apply Changes' }))
    expect(screen.getByRole('columnheader', { name: 'Avg Buy Price' })).toBeInTheDocument()
    fireEvent.click(screen.getByRole('tab', { name: /Capital Gain/ }))
    expect(screen.getByRole('tab', { name: /Capital Gain/ })).toHaveAttribute('aria-selected', 'true')
  })

  it('opens a full holding route with working tabs instead of a modal', () => {
    renderRoute('/app/holdings/AAPL', '/app/holdings/:symbol', <HoldingDetail/>)
    expect(screen.getByRole('heading', { name: 'Apple Inc.' })).toBeInTheDocument()
    const capitalMetric = screen.getByText('Capital Gain').closest('article')!
    const oneYearCapital = within(capitalMetric).getByText(/\$/).textContent
    fireEvent.click(screen.getAllByRole('button', { name: 'All' })[0])
    expect(within(capitalMetric).getByText(/\$/).textContent).not.toBe(oneYearCapital)
    fireEvent.click(screen.getByRole('button', { name: 'Bar' }))
    expect(screen.getByRole('button', { name: 'Bar' })).toHaveAttribute('aria-pressed', 'true')
    fireEvent.click(screen.getByRole('button', { name: 'Line' }))
    fireEvent.click(screen.getByRole('button', { name: 'Trades' }))
    expect(screen.getByRole('heading', { name: 'Trades' })).toBeInTheDocument()
    fireEvent.click(screen.getAllByRole('button', { name: 'Expand trade details' })[0])
    expect(screen.getByText('Audit history')).toBeInTheDocument()
    fireEvent.click(screen.getAllByRole('checkbox', { name: /Select trade/ })[0])
    expect(screen.getByText('1 selected')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Export selected/ })).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Income' }))
    expect(screen.getByRole('heading', { name: 'Income' })).toBeInTheDocument()
    expect(screen.getByText(/FY 2026 subtotal/)).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Notes' }))
    fireEvent.change(screen.getByPlaceholderText(/Add a note about AAPL/), { target: { value: 'Review allocation' } })
    fireEvent.click(screen.getByRole('button', { name: 'Save note' }))
    expect(window.localStorage.getItem('masterdeck-note-AAPL')).toBe('Review allocation')
    expect(screen.getByRole('link', { name: /View supply chain/ })).toHaveAttribute('href', '/app/tools/supply-chain/AAPL')
    fireEvent.click(screen.getByRole('button', { name: 'Overview' }))
    expect(screen.getByRole('heading', { name: 'Company relationships' })).toBeInTheDocument()
    expect(screen.getByRole('group', { name: 'Relationship filters' })).toBeInTheDocument()
  })

  it('renders the performance controls, metrics and grouped ledger', async () => {
    renderRoute('/app/reports/performance', '/app/reports/:report', <Reports/>)
    expect(await screen.findByRole('heading', { name: 'Performance breakdown' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Total return' })).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Income return' }))
    expect(screen.getByRole('heading', { name: 'Return by market · Income return' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Capital, income and currency contribution' })).toBeInTheDocument()
    expect(screen.getAllByText('NASDAQ').length).toBeGreaterThan(0)
  })

  it('renders and navigates the selectable daily movement calendar', async () => {
    renderRoute('/app/reports/income-calendar', '/app/reports/:report', <Reports/>)
    expect(await screen.findByRole('heading', { name: 'Income calendar' })).toBeInTheDocument()
    const calendar = screen.getByRole('grid', { name: 'August 2026 portfolio movement' })
    expect(within(calendar).getByRole('gridcell', { name: /1 August 2026, \+\$8,455/ })).toBeInTheDocument()
    fireEvent.click(within(calendar).getByRole('gridcell', { name: /Saturday 1 August 2026/ }))
    expect(screen.getByText('Change between recorded portfolio snapshots.')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Next month' }))
    expect(screen.getByText('September 2026')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Previous month' }))
    expect(screen.getByText('August 2026')).toBeInTheDocument()
  })

  it('opens a holding when any diversification row cell is clicked', async () => {
    render(<MemoryRouter initialEntries={['/app/reports/diversification']}><PortfolioProvider session={null} demo><Routes><Route path="/app/reports/:report" element={<Reports/>}/><Route path="/app/holdings/:symbol" element={<HoldingDetail/>}/></Routes></PortfolioProvider></MemoryRouter>)
    const appleRow = await screen.findByRole('row', { name: /Open AAPL holding/ })
    fireEvent.click(within(appleRow).getAllByRole('cell').at(-1)!)
    expect(await screen.findByRole('heading', { name: 'Apple Inc.' })).toBeInTheDocument()
  })

  it('opens report assets from the keyboard and exposes holdings in global search', async () => {
    const { unmount } = render(<MemoryRouter initialEntries={['/app/reports/performance']}><PortfolioProvider session={null} demo><Routes><Route path="/app/reports/:report" element={<Reports/>}/><Route path="/app/holdings/:symbol" element={<HoldingDetail/>}/></Routes></PortfolioProvider></MemoryRouter>)
    const appleRow = await screen.findByRole('row', { name: /Open AAPL holding/ })
    fireEvent.keyDown(appleRow, { key: 'Enter' })
    expect(await screen.findByRole('heading', { name: 'Apple Inc.' })).toBeInTheDocument()
    unmount()

    render(<MemoryRouter initialEntries={['/app']}><PortfolioProvider session={null} demo><AppShell onExitDemo={() => undefined}><div>Workspace</div></AppShell></PortfolioProvider></MemoryRouter>)
    fireEvent.keyDown(window, { key: 'k', ctrlKey: true })
    const searchInput = screen.getByRole('textbox', { name: 'Search or jump to' })
    fireEvent.change(searchInput, { target: { value: 'AAPL' } })
    const appleResult = screen.getByRole('button', { name: /AAPL · Apple Inc/ })
    expect(appleResult).toBeInTheDocument()
    expect(appleResult.querySelector('[data-symbol="AAPL"]')).toBeInTheDocument()
    fireEvent.change(searchInput, { target: { value: 'Apple' } })
    expect(screen.getByRole('button', { name: /AAPL · Apple Inc/ })).toBeInTheDocument()
  })

  it('renders the tax overview finalisation and full report index', async () => {
    renderRoute('/app/tax', '/app/tax/:report?', <TaxCentre/>)
    expect(await screen.findByRole('heading', { name: 'Tax overview' })).toBeInTheDocument()
    expect(screen.getByText(/items to review/)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /ATO myTax/ })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Recorded cost/ })).toBeInTheDocument()
  })

  it('answers a Deck AI portfolio question in the chat', async () => {
    window.history.pushState({}, '', '/app/tools/assistant')
    renderRoute('/app/tools/assistant', '/app/tools/:tool', <Tools/>)
    const suggestion = await screen.findByRole('button', { name: /Show my portfolio value/ })
    vi.useFakeTimers()
    fireEvent.click(suggestion)
    expect(screen.getByText('Preparing your answer')).toBeInTheDocument()
    expect(screen.queryByText(/Portfolio value is/)).not.toBeInTheDocument()
    act(() => { vi.advanceTimersByTime(1600) })
    expect(screen.getByText(/Portfolio value is/)).toBeInTheDocument()
    expect(screen.queryByText('Preparing your answer')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'New chat' })).toBeInTheDocument()
  })

  it('cancels pending answers on stop and new chat', async () => {
    window.history.pushState({}, '', '/app/tools/assistant')
    renderRoute('/app/tools/assistant', '/app/tools/:tool', <Tools/>)
    const suggestion = await screen.findByRole('button', { name: /Show my portfolio value/ })
    vi.useFakeTimers()
    fireEvent.click(suggestion)
    fireEvent.click(screen.getByRole('button', { name: 'Stop response' }))
    act(() => { vi.advanceTimersByTime(2000) })
    expect(screen.queryByText(/Portfolio value is/)).not.toBeInTheDocument()
    fireEvent.change(screen.getByLabelText('Ask Masterdeck AI'), { target: { value: 'portfolio value' } })
    fireEvent.click(screen.getByRole('button', { name: 'Send question' }))
    fireEvent.click(screen.getByRole('button', { name: 'New chat' }))
    act(() => { vi.advanceTimersByTime(2000) })
    expect(screen.queryByText(/Portfolio value is/)).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Show my portfolio value/ })).toBeInTheDocument()
  })

  it('does not append a remote answer after a cancelled research request resolves', async () => {
    window.history.pushState({}, '', '/app/tools/assistant')
    renderRoute('/app/tools/assistant', '/app/tools/:tool', <Tools/>)
    await screen.findByRole('button', { name: /Show my portfolio value/ })
    let finish!: (value: Response) => void
    let requestSignal: AbortSignal | undefined
    vi.stubGlobal('fetch', vi.fn((_url, options) => {
      requestSignal = options.signal
      return new Promise<Response>(resolve => { finish = resolve })
    }))
    vi.useFakeTimers()
    fireEvent.change(screen.getByLabelText('Ask Masterdeck AI'), { target: { value: 'Research Microsoft' } })
    fireEvent.click(screen.getByRole('button', { name: 'Send question' }))
    act(() => { vi.advanceTimersByTime(1600) })
    fireEvent.click(screen.getByRole('button', { name: 'New chat' }))
    expect(requestSignal?.aborted).toBe(true)
    await act(async () => {
      finish(new Response(JSON.stringify({name:'Microsoft',symbol:'MSFT',currency:'USD',exchange:'NASDAQ',type:'EQUITY',price:100,low:90,high:110,points:[],candidates:[],sourceUrl:'https://finance.yahoo.com/quote/MSFT/'})))
      await Promise.resolve()
    })
    expect(screen.queryByRole('heading', { name: 'Microsoft' })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Show my portfolio value/ })).toBeInTheDocument()
  })

  it('loads a live ticker network and opens the selected company network', async () => {
    const apple = { id: 'aapl', name: 'Apple Inc.', ticker: 'AAPL', country: 'United States', market: 'Nasdaq', sector: 'Technology', description: 'Apple live filing profile.' }
    const alphabet = { id: 'googl', name: 'Alphabet Inc.', ticker: 'GOOGL', country: 'United States', market: 'Nasdaq', sector: 'Technology', description: 'Alphabet live filing profile.' }
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input)
      const active = url.includes('ticker=GOOGL') ? alphabet : apple
      const related = url.includes('ticker=GOOGL') ? apple : alphabet
      return new Response(JSON.stringify({ company: active, companies: [active, related], relationships: [{ id: `sec-${active.id}-${related.id}`, from: active.id, to: related.id, type: 'partner', note: `${related.name} is named in partner context.`, confidence: 'High', source: '10-K filed 2025-10-31', sourceKind: 'live-sec', sourceUrl: 'https://www.sec.gov/example', updated: '2025-10-31' }], filing: { form: '10-K', filedAt: '2025-10-31', accession: 'test', primaryDocument: 'test.htm', url: 'https://www.sec.gov/example' }, coverage: 'live-sec-filing', generatedAt: '2026-08-29T00:00:00.000Z' }), { status: 200, headers: { 'Content-Type': 'application/json' } })
    })
    vi.stubGlobal('fetch', fetchMock)
    renderRoute('/app/tools/supply-chain/AAPL', '/app/tools/supply-chain/:symbol?', <SupplyChain />)
    expect(screen.getByRole('heading', { name: 'Supply chain intelligence' })).toBeInTheDocument()
    expect(await screen.findByText('Filing', { exact: true })).toBeInTheDocument()
    expect(screen.getByRole('checkbox', { name: /Include curated background/ })).not.toBeChecked()
    fireEvent.click(screen.getByRole('button', { name: /Alphabet Inc.*GOOGL.*Partner.*Filing/ }))
    expect(screen.getByLabelText('Selected relationship evidence')).toHaveTextContent('Alphabet Inc. is named in partner context.')
    fireEvent.click(screen.getByRole('button', { name: 'Explore Alphabet Inc.' }))
    await waitFor(() => expect(fetchMock).toHaveBeenCalledWith(expect.stringContaining('ticker=GOOGL'), expect.anything()))
    expect(await screen.findByRole('heading', { name: 'Alphabet Inc.' })).toBeInTheDocument()
  })
})


