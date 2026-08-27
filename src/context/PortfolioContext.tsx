/* eslint-disable react-refresh/only-export-components */
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import type { Session } from '@supabase/supabase-js'
import { demoBundle } from '../data/demo'
import { LoadingScreen } from '../components/ui'
import { portfolioApi } from '../lib/api'
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
  setNotice: (notice: Notice | null) => void
  refresh: () => Promise<void>
  connectIbkr: (input: { label: string; token: string; queryId: string }) => Promise<void>
  syncIbkr: (connectionId: string) => Promise<void>
  importSuperhero: (report: SuperheroReport) => Promise<void>
  connectGmail: (accessToken: string) => Promise<void>
  syncGmail: (connectionId: string) => Promise<void>
  refreshQuotes: () => Promise<void>
  disconnect: (connectionId: string) => Promise<void>
  updateProfile: (profile: Pick<Profile, 'full_name' | 'avatar_url' | 'settings'>) => Promise<void>
}

const PortfolioContext = createContext<PortfolioContextValue | null>(null)

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

export function PortfolioProvider({ session, demo, children }: { session: Session | null; demo: boolean; children: ReactNode }) {
  const [bundle, setBundle] = useState<PortfolioBundle>(() => structuredClone(demo ? demoBundle : emptyLiveBundle))
  const [loading, setLoading] = useState(!demo)
  const [action, setAction] = useState<string | null>(null)
  const [notice, setNotice] = useState<Notice | null>(null)
  const sessionRef = useRef(session)

  useEffect(() => {
    sessionRef.current = session
  }, [session])

  const requireSession = useCallback(() => {
    if (!sessionRef.current) throw new Error('Sign in to use a live connection.')
    return sessionRef.current
  }, [])

  const refresh = useCallback(async () => {
    if (demo) {
      setBundle((current) => ({ ...current, demo: true }))
      setLoading(false)
      return
    }
    setLoading(true)
    try {
      setBundle(await portfolioApi.bundle(requireSession()))
    } catch (error) {
      setNotice({ tone: 'error', message: error instanceof Error ? error.message : 'Could not load the portfolio.' })
      throw error
    } finally {
      setLoading(false)
    }
  }, [demo, requireSession])

  const run = useCallback(async (name: string, work: () => Promise<{ message?: string } | void>) => {
    setAction(name)
    try {
      const result = await work()
      setNotice({ tone: 'success', message: result?.message || 'Done.' })
      if (!demo) setBundle(await portfolioApi.bundle(requireSession()))
    } catch (error) {
      setNotice({ tone: 'error', message: error instanceof Error ? error.message : 'The request failed.' })
      throw error
    } finally {
      setAction(null)
    }
  }, [demo, requireSession])

  useEffect(() => {
    Promise.resolve().then(refresh).catch(() => undefined)
  }, [refresh, session?.user?.id])

  const value = useMemo<PortfolioContextValue>(() => ({
    bundle,
    session,
    demo,
    loading,
    action,
    notice,
    setNotice,
    refresh,
    connectIbkr: (input) => run('connect-ibkr', () => portfolioApi.connectIbkr(requireSession(), input)),
    syncIbkr: (connectionId) => run(`sync-${connectionId}`, () => portfolioApi.syncIbkr(requireSession(), connectionId)),
    importSuperhero: (report) => run('import-superhero', () => portfolioApi.importSuperhero(requireSession(), report)),
    connectGmail: (accessToken) => run('connect-gmail', () => portfolioApi.storeGmailToken(requireSession(), accessToken)),
    syncGmail: (connectionId) => run(`sync-${connectionId}`, () => portfolioApi.syncGmail(requireSession(), connectionId)),
    refreshQuotes: () => demo
      ? run('refresh-quotes', async () => ({ message: 'Demo prices are illustrative and were not sent anywhere.' }))
      : run('refresh-quotes', () => portfolioApi.refreshQuotes(requireSession())),
    disconnect: (connectionId) => run(`disconnect-${connectionId}`, () => portfolioApi.disconnect(requireSession(), connectionId)),
    updateProfile: (profile) => demo
      ? run('save-profile', async () => {
          setBundle((current) => ({ ...current, profile: current.profile ? { ...current.profile, ...profile } : null }))
          return { message: 'Demo preferences updated for this session.' }
        })
      : run('save-profile', () => portfolioApi.updateProfile(requireSession(), profile)),
  }), [action, bundle, demo, loading, notice, refresh, requireSession, run, session])

  return <PortfolioContext.Provider value={value}>{loading ? <LoadingScreen /> : children}</PortfolioContext.Provider>
}

export function usePortfolio() {
  const value = useContext(PortfolioContext)
  if (!value) throw new Error('usePortfolio must be used inside PortfolioProvider.')
  return value
}
