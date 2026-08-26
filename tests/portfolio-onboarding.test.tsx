import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import type { ReactNode } from 'react'
import { MemoryRouter, useLocation } from 'react-router-dom'
import { GoogleOAuthProvider } from '@react-oauth/google'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { demoBundle } from '../src/data/demo'
import { usePortfolio } from '../src/context/PortfolioContext'
import { Overview } from '../src/features/Overview'
import { Holdings } from '../src/features/Holdings'
import { Transactions } from '../src/features/Transactions'
import { Connections } from '../src/features/Connections'

vi.mock('../src/context/PortfolioContext', () => ({ usePortfolio: vi.fn() }))

const emptyBundle = {
  ...structuredClone(demoBundle),
  demo: false,
  holdings: [],
  transactions: [],
  snapshots: [],
  connections: [],
  cash: [],
  income: [],
  syncRuns: [],
}

function LocationReadout() {
  const location = useLocation()
  return <output aria-label="Current location">{location.pathname}{location.search}</output>
}

function renderScreen(node: ReactNode) {
  return render(<MemoryRouter initialEntries={['/app']}>{node}<LocationReadout /></MemoryRouter>)
}

describe('first portfolio onboarding', () => {
  beforeEach(() => {
    vi.mocked(usePortfolio).mockReturnValue({ bundle: emptyBundle, action: null, refreshQuotes: vi.fn() } as unknown as ReturnType<typeof usePortfolio>)
  })
  afterEach(() => cleanup())

  it.each([
    ['portfolio', <Overview />],
    ['holdings', <Holdings />],
    ['transactions', <Transactions />],
  ])('shows clear setup choices on the empty %s screen', (_name, node) => {
    renderScreen(node)
    expect(screen.getByRole('heading', { name: 'Add your first investments' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Connect Interactive Brokers/ })).toHaveAttribute('href', '/app/connections?setup=ibkr')
    expect(screen.getByRole('link', { name: /Import a Superhero report/ })).toHaveAttribute('href', '/app/connections?setup=import')
    expect(screen.getByText(/cannot place or modify trades/i)).toBeInTheDocument()
  })

  it('takes the import action to the exact connection setup state', () => {
    renderScreen(<Overview />)
    fireEvent.click(screen.getByRole('link', { name: /Import a Superhero report/ }))
    expect(screen.getByLabelText('Current location')).toHaveTextContent('/app/connections?setup=import')
  })

  it('opens the IBKR form when that setup path is selected', () => {
    render(<GoogleOAuthProvider clientId="test-client"><MemoryRouter initialEntries={['/app/connections?setup=ibkr']}><Connections /></MemoryRouter></GoogleOAuthProvider>)
    expect(screen.getByRole('dialog', { name: 'Connect Interactive Brokers' })).toBeInTheDocument()
    expect(screen.getByLabelText('Flex Web Service token')).toBeInTheDocument()
  })

  it('focuses the report uploader when the import path is selected', async () => {
    render(<GoogleOAuthProvider clientId="test-client"><MemoryRouter initialEntries={['/app/connections?setup=import']}><Connections /></MemoryRouter></GoogleOAuthProvider>)
    expect(await screen.findByRole('button', { name: 'Choose Superhero report' })).toHaveFocus()
  })
})
