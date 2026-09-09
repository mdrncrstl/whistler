import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import type { Session } from '@supabase/supabase-js'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { PortfolioProvider, usePortfolio } from '../src/context/PortfolioContext'
import { portfolioApi } from '../src/lib/api'

const session = { access_token: 'test-token' } as Session

function RefreshHarness() {
  const { refresh } = usePortfolio()
  return <><button type="button" onClick={() => void refresh()}>Refresh workspace</button><div>Live workspace</div></>
}

describe('signed-in portfolio hydration', () => {
  afterEach(() => {
    cleanup()
    vi.restoreAllMocks()
  })

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

    expect(screen.getByText('Loading your portfolio…')).toBeInTheDocument()
    expect(screen.queryByText('AAPL')).not.toBeInTheDocument()
    expect(await screen.findByText('Live workspace')).toBeInTheDocument()
  })

  it('keeps the hydrated workspace mounted when the same user session refreshes', async () => {
    const bundle = vi.spyOn(portfolioApi, 'bundle').mockResolvedValue({
      profile: null,
      holdings: [],
      transactions: [],
      cash: [],
      snapshots: [],
      connections: [],
      syncRuns: [],
      demo: false,
    })
    const initialSession = { access_token: 'initial-token', user: { id: 'same-user' } } as Session
    const refreshedSession = { access_token: 'refreshed-token', user: { id: 'same-user' } } as Session

    const { rerender } = render(
      <PortfolioProvider session={initialSession} demo={false}><div>Live workspace</div></PortfolioProvider>,
    )

    expect(await screen.findByText('Live workspace')).toBeInTheDocument()
    expect(bundle).toHaveBeenCalledTimes(1)

    rerender(<PortfolioProvider session={refreshedSession} demo={false}><div>Live workspace</div></PortfolioProvider>)

    expect(screen.queryByText('Preparing your portfolio…')).not.toBeInTheDocument()
    expect(screen.getByText('Live workspace')).toBeInTheDocument()
    await waitFor(() => expect(bundle).toHaveBeenCalledTimes(1))
  })

  it('keeps the workspace mounted during a later data refresh', async () => {
    const bundleValue = {
      profile: null,
      holdings: [],
      transactions: [],
      cash: [],
      snapshots: [],
      connections: [],
      syncRuns: [],
      demo: false,
    }
    let resolveRefresh: (value: typeof bundleValue) => void = () => undefined
    const laterRefresh = new Promise<typeof bundleValue>((resolve) => { resolveRefresh = resolve })
    const bundle = vi.spyOn(portfolioApi, 'bundle')
      .mockResolvedValueOnce(bundleValue)
      .mockReturnValueOnce(laterRefresh)

    render(<PortfolioProvider session={session} demo={false}><RefreshHarness /></PortfolioProvider>)
    await screen.findByText('Live workspace')

    fireEvent.click(screen.getByRole('button', { name: 'Refresh workspace' }))

    expect(screen.getByText('Live workspace')).toBeInTheDocument()
    expect(screen.queryByText('Preparing your portfolio…')).not.toBeInTheDocument()

    resolveRefresh(bundleValue)
    await waitFor(() => expect(bundle).toHaveBeenCalledTimes(2))
  })
})
