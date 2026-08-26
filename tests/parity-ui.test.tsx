import { fireEvent, render, screen, within } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import type { ReactNode } from 'react'
import { PortfolioProvider } from '../src/context/PortfolioContext'
import { AppShell } from '../src/components/AppShell'
import { Reports } from '../src/features/Reports'
import { TaxCentre } from '../src/features/TaxCentre'
import { Tools } from '../src/features/Tools'

function renderRoute(path: string, route: string, node: ReactNode) {
  return render(<MemoryRouter initialEntries={[path]}><PortfolioProvider session={null} demo><Routes><Route path={route} element={node}/></Routes></PortfolioProvider></MemoryRouter>)
}

describe('Navexa-depth workspace routes', () => {
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

  it('renders the performance controls, metrics and grouped ledger', async () => {
    renderRoute('/app/reports/performance', '/app/reports/:report', <Reports/>)
    expect(await screen.findByRole('heading', { name: 'Performance breakdown' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Total return' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Capital, income and currency contribution' })).toBeInTheDocument()
    expect(screen.getByText('NASDAQ')).toBeInTheDocument()
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
