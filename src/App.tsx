import { marketingPages } from './lib/marketingPages'
import { lazy, Suspense, useEffect, useState } from 'react'
import type { Session } from '@supabase/supabase-js'
import { Navigate, Route, Routes, useLocation } from 'react-router-dom'
import { AppShell } from './components/AppShell-Wifi-G'
import { Onboarding } from './components/Onboarding'
import { AuthCallback } from './components/AuthCallback'
import { Landing } from './components/Landing-Wifi-G'
import { PointerChartEnhancer } from './components/PointerChartSurface'
import { LoadingScreen, AppLoadingProvider } from './components/AppLoading'
import { AccountAccessProvider, useAccountAccess } from './context/AccountAccessContext'
import { PortfolioProvider } from './context/PortfolioContext'
import { useBillingStatus } from './hooks/useBillingStatus'
import { authClient } from './lib/supabase'

const Overview = lazy(() => import('./features/Overview-Wifi-G').then((module) => ({ default: module.Overview })))
const Holdings = lazy(() => import('./features/Holdings-Wifi-G').then((module) => ({ default: module.Holdings })))
const HoldingDetail = lazy(() => import('./features/HoldingDetail').then((module) => ({ default: module.HoldingDetail })))
const Transactions = lazy(() => import('./features/Transactions-Wifi-G').then((module) => ({ default: module.Transactions })))
const Income = lazy(() => import('./features/Income-Wifi-G').then((module) => ({ default: module.Income })))
const TaxCentre = lazy(() => import('./features/TaxCentre-Wifi-G').then((module) => ({ default: module.TaxCentre })))
const Connections = lazy(() => import('./features/Connections-Wifi-G').then((module) => ({ default: module.Connections })))
const Settings = lazy(() => import('./features/Settings-Wifi-G').then((module) => ({ default: module.Settings })))
const Reports = lazy(() => import('./features/Reports').then((module) => ({ default: module.Reports })))
const Tools = lazy(() => import('./features/Tools').then((module) => ({ default: module.Tools })))
const SupplyChain = lazy(() => import('./features/SupplyChain').then((module) => ({ default: module.SupplyChain })))
const Billing = lazy(() => import('./features/Billing').then((module) => ({ default: module.Billing })))
const Referrals = lazy(() => import('./features/Referrals').then((module) => ({ default: module.Referrals })))

function PortfolioRoutes({ onExitDemo }: { onExitDemo: () => void }) {
  return (
    <AppShell onExitDemo={onExitDemo}>
      <Suspense fallback={<LoadingScreen />}>
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
  const { access, loading: accessLoading, onboardingRequired, trialExpired } = useAccountAccess()
  const { subscription } = useBillingStatus(session, demo)
  const previewingOnboarding = new URLSearchParams(location.search).get('preview') === '1'
  const paid = Boolean(subscription && subscriptionAllowsAccess.has(subscription.status))

  // The branded loading screen belongs to the workspace boot. Onboarding is a standalone
  // page with its own background, so gating it behind a full-screen logo animation made a
  // sub-second account-access read look like the app was starting up.
  const onboardingPath = location.pathname === '/welcome'
  if (accessLoading) return onboardingPath ? <main className="onboarding-page onboarding-page-waiting" aria-busy="true" /> : <LoadingScreen />

  const routes = <Routes>
    <Route path="/app/*" element={onboardingRequired
      ? <Navigate to="/welcome" replace />
      : trialExpired && !paid && access?.access_mode !== 'grandfathered' && location.pathname !== '/app/billing'
        ? <Navigate to="/app/billing?trial=ended" replace />
        : <PortfolioRoutes onExitDemo={onExitDemo} />} />
    <Route path="/welcome" element={previewingOnboarding || demo || onboardingRequired ? <Onboarding /> : <Navigate to="/app" replace />} />
    <Route path="*" element={<Navigate to="/app" replace />} />
  </Routes>

  const workspacePath = location.pathname === '/app' || location.pathname.startsWith('/app/')
  return workspacePath && !onboardingRequired ? <PortfolioProvider session={session} demo={demo}>{routes}</PortfolioProvider> : routes
}

function AppContent() {
  const location = useLocation()
  const [session, setSession] = useState<Session | null | undefined>(undefined)
  const [demo, setDemo] = useState(() => window.sessionStorage.getItem('masterdeck-demo') === 'true')
  const publicMarketingPath = location.pathname === '/'
    || location.pathname === '/pricing'
    || marketingPages.some(page => page.path === location.pathname)

  useEffect(() => {
    let mounted = true
    authClient.auth.getSession().then(({ data }) => { if (mounted) setSession(data.session) }).catch(() => { if (mounted) setSession(null) })
    const { data: subscription } = authClient.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession)
      if (nextSession) {
        window.sessionStorage.removeItem('masterdeck-demo')
        setDemo(false)
      }
    })
    return () => { mounted = false; subscription.subscription.unsubscribe() }
  }, [])

  const enterDemo = () => {
    window.sessionStorage.setItem('masterdeck-demo', 'true')
    setDemo(true)
  }
  const exitDemo = () => {
    window.sessionStorage.removeItem('masterdeck-demo')
    setDemo(false)
  }

  if (session === undefined && location.pathname === '/auth/callback') return <AuthCallback />
  // Same reasoning as the account-access gate below: the onboarding route keeps its own
  // surface while the session resolves rather than borrowing the workspace loader.
  if (session === undefined && !publicMarketingPath) return location.pathname === '/welcome'
    ? <main className="onboarding-page onboarding-page-waiting" aria-busy="true" />
    : <LoadingScreen />
  const authenticated = Boolean(session || demo)
  return (
    <>
      <PointerChartEnhancer />
      <Routes>
        <Route path="/" element={<Landing onDemo={enterDemo} signedIn={authenticated} onOpenApp={() => window.location.assign('/app')} />} />
        {marketingPages.map(page => <Route key={page.path} path={page.path} element={<Landing page={page} onDemo={enterDemo} signedIn={authenticated} onOpenApp={() => window.location.assign('/app')} />} />)}
        <Route path="/pricing" element={<Landing page="pricing" onDemo={enterDemo} signedIn={authenticated} onOpenApp={() => window.location.assign('/app')} />} />
        <Route path="/auth/callback" element={<AuthCallback />} />
        <Route path="/*" element={authenticated ? <AccountAccessProvider session={session || null} demo={demo}><AccountRoutes session={session || null} demo={demo} onExitDemo={exitDemo} /></AccountAccessProvider> : <Navigate to="/" replace />} />
        <Route path="*" element={<Navigate to={authenticated ? '/app' : '/'} replace />} />
      </Routes>
    </>
  )
}

export default function App() {
  return <AppLoadingProvider><AppContent /></AppLoadingProvider>
}
