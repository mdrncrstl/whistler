import { render, screen } from '@testing-library/react'
import type { Session } from '@supabase/supabase-js'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { PortfolioProvider } from '../src/context/PortfolioContext'
import { portfolioApi } from '../src/lib/api'

const session = { access_token: 'test-token' } as Session

describe('signed-in portfolio hydration', () => {
  afterEach(() => vi.restoreAllMocks())

  it('never renders demo holdings while the live bundle is loading', async () => {
    vi.spyOn(portfolioApi, 'bundle').mockResolvedValue({
      profile: null,
      holdings: [],
      transactions: [],
      cash: [],
      snapshots: [],
      connections: [],
      syncRuns: [],
      demo: false,
    })

    render(<PortfolioProvider session={session} demo={false}><div>Live workspace</div></PortfolioProvider>)

    expect(screen.getByText('Preparing your portfolio…')).toBeInTheDocument()
    expect(screen.queryByText('AAPL')).not.toBeInTheDocument()
    expect(await screen.findByText('Live workspace')).toBeInTheDocument()
  })
})
