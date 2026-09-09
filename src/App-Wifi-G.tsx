import { lazy, Suspense, useEffect, useState } from 'react'
import type { Session } from '@supabase/supabase-js'
import { Navigate, Route, Routes, useLocation } from 'react-router-dom'
import { AppShell } from './components/AppShell'
import { AuthCallback } from './components/AuthCallback'
import { Landing } from './components/Landing'
import { Onboarding } from './components/Onboarding'
import { LoadingScreen } from './components/ui'
import { AccountAccessProvider, useAccountAccess } from './context/AccountAccessContext'
import { PortfolioProvider } from './context/PortfolioContext'
import { useBillingStatus } from './hooks/useBillingStatus'
import { authClient } from './lib/supabase'
import { captureReferralFromLocation, claimStoredReferral } from './lib/referrals'

const Overview = lazy(() => import('./features/Overview').then((module) => ({ default: module.Overview })))
const Holdings = lazy(() => import('./features/Holdings').then((module) => ({ default: module.Holdings })))
const HoldingDetail = lazy(() => import('./features/HoldingDetail').then((module) => ({ default: module.HoldingDetail })))
const Transactions = lazy(() => import('./features/Transactions').then((module) => ({ default: module.Transactions })))
const Income = lazy(() => import('./features/Income').then((module) => ({ default: module.Income })))
const TaxCentre = lazy(() => import('./features/TaxCentre').then((module) => ({ default: module.TaxCentre })))
const Connections = lazy(() => import('./features/Connections').then((module) => ({ default: module.Connections })))
const Settings = lazy(() => import('./features/Settings').then((module) => ({ default: module.Settings })))
const Reports = lazy(() => import('./features/Reports').then((module) => ({ default: module.Reports })))
const Tools = lazy(() => import('./features/Tools').then((module) => ({ default: module.Tools })))
const SupplyChain = lazy(() => import('./features/SupplyChain').then((module) => ({ default: module.SupplyChain })))
const Billing = lazy(() => import('./features/Billing').then((module) => ({ default: module.Billing })))
const Referrals = lazy(() => import('./features/Referrals').then((module) => ({ default: module.Referrals })))

const routePrefetchers = [
  () => import('./features/Overview'),
  () => import('./features/Holdings'),
  () => import('./features/HoldingDetail'),
  () => import('./features/Transactions'),
  () => import('./features/Income'),
  () => import('./features/TaxCentre'),
  () => import('./features/Connections'),
  () => import('./features/Settings'),
  () => import('./features/Reports'),
  () => import('./features/Tools'),
  () => import('./features/SupplyChain'),
  () => import('./features/Billing'),
  () => import('./features/Referrals'),
]

function prefetchRoutes() {
  void Promise.all(routePrefetchers.map((load) => load())).catch(() => undefined)
}

function PortfolioRoutes({ onExitDemo }: { onExitDemo: () => void }) {
  return (
    <AppShell onExitDemo={onExitDemo}>
      <Suspense fallback={null}>
        <Routes>
          <Route index element={<Overview />} />
          <Route path="holdings" element={<Holdings />} />
          <Route path="holdings/:symbol" element={<HoldingDetail />} />
          <Route path="transactions" element={<Transactions />} />
          <Route path="income" element={<Income />} />
          <Route path="reports/:report?" element={<Reports />} />
          <Route path="tax/:report?" element={<TaxCentre />} />
          <Route path="tools/supply-chain/:symbol?" element={<SupplyChain />} />
          <Route path="tools/:tool?" element={<Tools />} />
          <Route path="connections" element={<Connections />} />
          <Route path="settings" element={<Settings onExitDemo={onExitDemo} />} />
          <Route path="billing" element={<Billing />} />
          <Route path="referrals" element={<Referrals />} />
          <Route path="*" element={<Navigate to="/app" replace />} />
        </Routes>
      </Suspense>
    </AppShell>
  )
}

const subscriptionAllowsAccess = new Set(['active', 'trialing', 'past_due', 'unpaid'])

function AccountRoutes({ session, demo, onExitDemo }: { session: Session | null; demo: boolean; onExitDemo: () => void }) {
  const location = useLocation()
  const { access, onboardingRequired, trialExpired } = useAccountAccess()
  const { subscription } = useBillingStatus(session, demo)
  const previewingOnboarding = new URLSearchParams(location.search).get('preview') === '1'
  const paid = Boolean(subscription && subscriptionAllowsAccess.has(subscription.status))

  const routes = <Routes>
    <Route path="/welcome" element={previewingOnboarding || demo || onboardingRequired ? <Onboarding /> : <Navigate to="/app" replace />} />
    <Route path="/app/*" element={onboardingRequired
      ? <Navigate to="/welcome" replace />
      : trialExpired && !paid && access?.access_mode !== 'grandfathered' && location.pathname !== '/app/billing'
        ? <Navigate to="/app/billing?trial=ended" replace />
        : <PortfolioRoutes onExitDemo={onExitDemo} />} />
    <Route path="*" element={<Navigate to={onboardingRequired ? '/welcome' : '/app'} replace />} />
  </Routes>

  const workspacePath = location.pathname === '/app' || location.pathname.startsWith('/app/')
  return workspacePath && !onboardingRequired
    ? <PortfolioProvider session={session} demo={demo}>{routes}</PortfolioProvider>
    : routes
}

export default function App() {
  const [session, setSession] = useState<Session | null | undefined>(undefined)
  const [demo, setDemo] = useState(() => window.sessionStorage.getItem('masterdeck-demo') === 'true')

  useEffect(() => {
    captureReferralFromLocation()
    prefetchRoutes()
    let mounted = true
    authClient.auth.getSession().then(({ data }) => { if (mounted) setSession(data.session) })
    const { data: subscription } = authClient.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession)
      if (nextSession) {
        window.sessionStorage.removeItem('masterdeck-demo')
        setDemo(false)
      }
    })
    return () => { mounted = false; subscription.subscription.unsubscribe() }
  }, [])

  useEffect(() => {
    if (!session) return
    void claimStoredReferral().catch(() => undefined)
  }, [session])

  const enterDemo = () => {
    window.sessionStorage.setItem('masterdeck-demo', 'true')
    setDemo(true)
  }
  const exitDemo = () => {
    window.sessionStorage.removeItem('masterdeck-demo')
    setDemo(false)
  }

  if (session === undefined) return <LoadingScreen />
  const authenticated = Boolean(session || demo)
  return (
    <Routes>
      <Route path="/" element={<Landing onDemo={enterDemo} signedIn={authenticated} onOpenApp={() => window.location.assign('/app')} />} />
      <Route path="/auth/callback" element={<AuthCallback />} />
      <Route path="/*" element={authenticated ? <AccountAccessProvider session={session || null} demo={demo}><AccountRoutes session={session || null} demo={demo} onExitDemo={exitDemo} /></AccountAccessProvider> : <Navigate to="/" replace />} />
      <Route path="*" element={<Navigate to={authenticated ? '/app' : '/'} replace />} />
    </Routes>
  )
}
