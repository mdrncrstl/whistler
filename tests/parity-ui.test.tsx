import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import type { ReactNode } from 'react'
import { PortfolioProvider } from '../src/context/PortfolioContext'
import { AppShell } from '../src/components/AppShell'
import { Reports } from '../src/features/Reports'
import { TaxCentre } from '../src/features/TaxCentre'
import { Tools } from '../src/features/Tools'
import { Overview } from '../src/features/Overview'

function renderRoute(path: string, route: string, node: ReactNode) {
  return render(<MemoryRouter initialEntries={[path]}><PortfolioProvider session={null} demo><Routes><Route path={route} element={node}/></Routes></PortfolioProvider></MemoryRouter>)
}

describe('Navexa-depth workspace routes', () => {
  beforeEach(() => window.localStorage.clear())
  afterEach(() => cleanup())

  it('renders the full nested report and tax sidebar hierarchy', () => {
    render(<MemoryRouter initialEntries={['/app']}><PortfolioProvider session={null} demo><AppShell onExitDemo={() => undefined}><div>Workspace</div></AppShell></PortfolioProvider></MemoryRouter>)
    const nav = screen.getByRole('navigation', { name: 'Portfolio navigation' })
    expect(within(nav).getByText('Performance')).toBeInTheDocument()
    expect(within(nav).getByRole('link', { name: 'Benchmark Analysis' })).toBeInTheDocument()
    expect(within(nav).getByText('Tax Reports')).toBeInTheDocument()
    expect(within(nav).getByRole('link', { name: 'Historical Cost' })).toBeInTheDocument()
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
    fireEvent.click(screen.getByRole('button', { name: /All portfolios/ }))
    expect(screen.getByRole('menuitem', { name: /Manage portfolios/ })).toBeInTheDocument()
    fireEvent.keyDown(window, { key: 'k', ctrlKey: true })
    expect(screen.getByRole('dialog', { name: 'Search workspace' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Add holdings/ })).toBeInTheDocument()
  })

  it('makes the portfolio filter, chart, groups and columns interactive', () => {
    renderRoute('/app', '/app', <Overview/>)
    fireEvent.click(screen.getByRole('button', { name: 'All Time' }))
    fireEvent.click(screen.getByRole('button', { name: 'Custom range' }))
    expect(screen.getByRole('region', { name: 'Custom date range' })).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Filter' }))
    expect(screen.getByRole('region', { name: 'Portfolio filters' })).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Percent' }))
    expect(screen.getByRole('button', { name: 'Percent' })).toHaveClass('active')
    expect(screen.queryByRole('button', { name: 'Bar' })).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Columns' }))
    expect(screen.getByRole('dialog', { name: 'Column Settings' })).toBeInTheDocument()
    expect(screen.getByRole('checkbox', { name: 'Avg Buy Price' })).not.toBeChecked()
  })

  it('renders the performance controls, metrics and grouped ledger', async () => {
    renderRoute('/app/reports/performance', '/app/reports/:report', <Reports/>)
    expect(await screen.findByRole('heading', { name: 'Performance breakdown' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Total return' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Capital, income and currency contribution' })).toBeInTheDocument()
    expect(screen.getAllByText('NASDAQ').length).toBeGreaterThan(0)
  })

  it('renders the tax overview finalisation and full report index', async () => {
    renderRoute('/app/tax', '/app/tax/:report?', <TaxCentre/>)
    expect(await screen.findByRole('heading', { name: 'Tax overview' })).toBeInTheDocument()
    expect(screen.getByText(/items to review/)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /ATO myTax/ })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Historical cost/ })).toBeInTheDocument()
  })

  it('answers a Deck AI portfolio question in the chat', async () => {
    window.history.pushState({}, '', '/app/tools/assistant')
    render(<PortfolioProvider session={null} demo><Tools/></PortfolioProvider>)
    fireEvent.click(await screen.findByRole('button', { name: 'Show my portfolio performance for all time' }))
    expect(screen.getByText(/Portfolio value is/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'New chat' })).toBeInTheDocument()
  })
})
