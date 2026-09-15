/* eslint-disable react-refresh/only-export-components */
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import type { Session } from '@supabase/supabase-js'
import { demoBundle } from '../data/demo'
import { LoadingScreen } from '../components/ui'
import { portfolioApi } from '../lib/api'
import { fetchMarketSnapshot, type MarketDataState } from '../lib/marketDataApi'
import { applyMarketSnapshot } from '../lib/repricePortfolio'
import type { PortfolioBundle, Profile, SuperheroReport } from '../types'

interface Notice {
  tone: 'success' | 'error' | 'info'
  message: string
}

interface PortfolioContextValue {
  bundle: PortfolioBundle
  session: Session | null
  demo: boolean
  loading: boolean
  action: string | null
  notice: Notice | null
  marketData: MarketDataState
  setNotice: (notice: Notice | null) => void
  refresh: () => Promise<void>
  connectIbkr: (input: { label: string; token: string; queryId: string }) => Promise<void>
  syncIbkr: (connectionId: string) => Promise<void>
  startSnapTrade: (brokerId: string, returnUrl?: string) => Promise<{ redirectUrl: string; connectionId: string }>
  syncSnapTrade: (connectionId: string) => Promise<void>
  importSuperhero: (report: SuperheroReport) => Promise<void>
  connectGmail: (accessToken: string) => Promise<void>
  syncGmail: (connectionId: string) => Promise<void>
  refreshQuotes: () => Promise<void>
  disconnect: (connectionId: string) => Promise<void>
  updateProfile: (profile: Pick<Profile, 'full_name' | 'avatar_url' | 'settings'>) => Promise<void>
}

const PortfolioContext = createContext<PortfolioContextValue | null>(null)

const idleMarketData: MarketDataState = { status: 'idle', source: null, generatedAt: null, updated: 0, failed: 0, message: null }

const emptyLiveBundle: PortfolioBundle = {
  profile: null,
  holdings: [],
  transactions: [],
  cash: [],
  snapshots: [],
  connections: [],
  syncRuns: [],
  demo: false,
}

function createDemoBundle() {
  const initial = structuredClone(demoBundle)
  if (initial.profile) {
    try {
      const stored = window.sessionStorage.getItem('masterdeck-demo-settings')
      if (stored) initial.profile.settings = { ...initial.profile.settings, ...JSON.parse(stored) }
    } catch {
      // Demo preferences are best-effort and remain local to this browser session.
    }
  }
  return initial
}

export function PortfolioProvider({ session, demo, children }: { session: Session | null; demo: boolean; children: ReactNode }) {
  const [bundle, setBundle] = useState<PortfolioBundle>(() => demo ? createDemoBundle() : structuredClone(emptyLiveBundle))
  const [loading, setLoading] = useState(!demo)
  const [action, setAction] = useState<string | null>(null)
  const [notice, setNotice] = useState<Notice | null>(null)
  const [marketData, setMarketData] = useState<MarketDataState>(idleMarketData)
  const sessionRef = useRef(session)
  const [hasHydrated, setHasHydrated] = useState(demo)
  const hasHydratedRef = useRef(demo)
  const providerKey = `${session?.user?.id || 'anonymous'}:${demo ? 'demo' : 'live'}`
  const previousProviderKey = useRef(providerKey)

  useEffect(() => {
    if (previousProviderKey.current === providerKey) return
    previousProviderKey.current = providerKey
    hasHydratedRef.current = demo
    setHasHydrated(demo)
    setLoading(!demo)
    setBundle(demo ? createDemoBundle() : structuredClone(emptyLiveBundle))
    setMarketData(idleMarketData)
  }, [demo, providerKey])

  useEffect(() => {
    sessionRef.current = session
  }, [session])

  const requireSession = useCallback(() => {
    if (!sessionRef.current) throw new Error('Sign in to use a live connection.')
    return sessionRef.current
  }, [])

  const loadMarketData = useCallback(async (baseBundle: PortfolioBundle, force = false) => {
    if (!baseBundle.holdings.length) {
      setMarketData({ ...idleMarketData, status: 'ready', generatedAt: new Date().toISOString(), message: 'No open holdings to price.' })
      return baseBundle
    }
    if (baseBundle.demo) {
      setMarketData({ status: 'ready', source: 'Illustrative demo snapshot', generatedAt: new Date().toISOString(), updated: 0, failed: 0, message: 'Demo prices are illustrative; connect a broker for live quotes.' })
      return baseBundle
    }
    setMarketData((current) => ({ ...current, status: 'loading', message: null }))
    const controller = new AbortController()
    const timeout = window.setTimeout(() => controller.abort(), 12000)
    try {
      const snapshot = await fetchMarketSnapshot(baseBundle.holdings, controller.signal, force)
      const result = applyMarketSnapshot(baseBundle, snapshot)
      const status = result.failed || snapshot.failures.length ? 'partial' : 'ready'
      setBundle(result.bundle)
      setMarketData({ status, source: snapshot.source, generatedAt: snapshot.generatedAt, updated: result.updated, failed: Math.max(result.failed, snapshot.failures.length), message: null })
      return result.bundle
    } catch (error) {
      const message = error instanceof Error && error.name === 'AbortError'
        ? 'Market data request timed out.'
        : error instanceof Error ? error.message : 'Market data is unavailable.'
      setMarketData((current) => ({ ...current, status: 'error', message }))
      if (force) throw new Error(message, { cause: error })
      return baseBundle
    } finally {
      window.clearTimeout(timeout)
    }
  }, [])

  const refresh = useCallback(async () => {
    if (demo) {
      const baseBundle = createDemoBundle()
      setBundle(baseBundle)
      hasHydratedRef.current = true
      setHasHydrated(true)
      setLoading(false)
      void loadMarketData(baseBundle)
      return
    }
    if (!hasHydratedRef.current) setLoading(true)
    try {
      const baseBundle = await portfolioApi.bundle(requireSession())
      setBundle(baseBundle)
      void loadMarketData(baseBundle)
    } catch (error) {
      setNotice({ tone: 'error', message: error instanceof Error ? error.message : 'Could not load the portfolio.' })
      throw error
    } finally {
      hasHydratedRef.current = true
      setHasHydrated(true)
      setLoading(false)
    }
  }, [demo, loadMarketData, requireSession])

  const run = useCallback(async (name: string, work: () => Promise<{ message?: string } | void>) => {
    setAction(name)
    try {
      const result = await work()
      setNotice({ tone: 'success', message: result?.message || 'Done.' })
      if (!demo) {
        const baseBundle = await portfolioApi.bundle(requireSession())
        setBundle(baseBundle)
        void loadMarketData(baseBundle)
      }
    } catch (error) {
      setNotice({ tone: 'error', message: error instanceof Error ? error.message : 'The request failed.' })
      throw error
    } finally {
      setAction(null)
    }
  }, [demo, loadMarketData, requireSession])

  useEffect(() => {
    Promise.resolve().then(refresh).catch(() => undefined)
  }, [refresh, session?.user?.id])

  const refreshQuotes = useCallback(async () => {
    if (demo) return run('refresh-quotes', async () => ({ message: 'Demo prices are illustrative and were not sent anywhere.' }))
    return run('refresh-quotes', () => portfolioApi.refreshQuotes(requireSession()))
  }, [demo, requireSession, run])

  const startSnapTrade = useCallback(async (brokerId: string, returnUrl?: string) => {
    setAction(`start-snaptrade-${brokerId}`)
    try {
      const result = await portfolioApi.startSnapTrade(requireSession(), brokerId, returnUrl)
      setNotice({ tone: 'info', message: 'Opening secure broker connection…' })
      return { redirectUrl: result.redirectUrl, connectionId: result.connectionId }
    } catch (error) {
      setNotice({ tone: 'error', message: error instanceof Error ? error.message : 'The broker connection could not be started.' })
      throw error
    } finally {
      setAction(null)
    }
  }, [requireSession])

  const syncSnapTrade = useCallback((connectionId: string) =>
    run(`sync-${connectionId}`, () => portfolioApi.syncSnapTrade(requireSession(), connectionId)), [requireSession, run])

  const value = useMemo<PortfolioContextValue>(() => ({
    bundle,
    session,
    demo,
    loading,
    action,
    notice,
    marketData,
    setNotice,
    refresh,
    connectIbkr: (input) => run('connect-ibkr', () => portfolioApi.connectIbkr(requireSession(), input)),
    syncIbkr: (connectionId) => run(`sync-${connectionId}`, () => portfolioApi.syncIbkr(requireSession(), connectionId)),
    startSnapTrade,
    syncSnapTrade,
    importSuperhero: (report) => run('import-superhero', () => portfolioApi.importSuperhero(requireSession(), report)),
    connectGmail: (accessToken) => run('connect-gmail', () => portfolioApi.storeGmailToken(requireSession(), accessToken)),
    syncGmail: (connectionId) => run(`sync-${connectionId}`, () => portfolioApi.syncGmail(requireSession(), connectionId)),
    refreshQuotes,
    disconnect: (connectionId) => {
      const connection = bundle.connections.find((item) => item.id === connectionId)
      return run(`disconnect-${connectionId}`, () => connection?.provider === 'snaptrade'
        ? portfolioApi.disconnectSnapTrade(requireSession(), connectionId)
        : portfolioApi.disconnect(requireSession(), connectionId))
    },
    updateProfile: (profile) => demo
      ? run('save-profile', async () => {
          try { window.sessionStorage.setItem('masterdeck-demo-settings', JSON.stringify(profile.settings)) } catch { /* best effort */ }
          setBundle((current) => ({ ...current, profile: current.profile ? { ...current.profile, ...profile } : null }))
          return { message: 'Demo preferences updated for this session.' }
        })
      : run('save-profile', () => portfolioApi.updateProfile(requireSession(), profile)),
  }), [action, bundle, demo, loading, marketData, notice, refresh, refreshQuotes, requireSession, run, session, startSnapTrade, syncSnapTrade])

  return <PortfolioContext.Provider value={value}>{loading && !hasHydrated ? <LoadingScreen /> : children}</PortfolioContext.Provider>
}

export function usePortfolio() {
  const value = useContext(PortfolioContext)
  if (!value) throw new Error('usePortfolio must be used inside PortfolioProvider.')
  return value
}
