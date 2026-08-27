import { lazy, Suspense, useEffect, useState } from 'react'
import type { Session } from '@supabase/supabase-js'
import { Navigate, Route, Routes } from 'react-router-dom'
import { AppShell } from './components/AppShell'
import { AuthCallback } from './components/AuthCallback'
import { Landing } from './components/Landing'
import { LoadingScreen } from './components/ui'
import { PortfolioProvider } from './context/PortfolioContext'
import { authClient } from './lib/supabase'

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
const Billing = lazy(() => import('./features/Billing').then((module) => ({ default: module.Billing })))

function PortfolioRoutes({ onExitDemo }: { onExitDemo: () => void }) {
  return (
    <AppShell onExitDemo={onExitDemo}>
      <Suspense fallback={<div className="feature-loading">Loading workspace…</div>}>
        <Routes>
          <Route index element={<Overview />} />
          <Route path="holdings" element={<Holdings />} />
          <Route path="holdings/:symbol" element={<HoldingDetail />} />
          <Route path="transactions" element={<Transactions />} />
          <Route path="income" element={<Income />} />
          <Route path="reports/:report?" element={<Reports />} />
          <Route path="tax/:report?" element={<TaxCentre />} />
          <Route path="tools/:tool?" element={<Tools />} />
          <Route path="connections" element={<Connections />} />
          <Route path="settings" element={<Settings onExitDemo={onExitDemo} />} />
          <Route path="billing" element={<Billing />} />
          <Route path="*" element={<Navigate to="/app" replace />} />
        </Routes>
      </Suspense>
    </AppShell>
  )
}

export default function App() {
  const [session, setSession] = useState<Session | null | undefined>(undefined)
  const [demo, setDemo] = useState(() => window.sessionStorage.getItem('masterdeck-demo') === 'true')

  useEffect(() => {
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
      <Route path="/app/*" element={authenticated ? <PortfolioProvider session={session || null} demo={demo}><PortfolioRoutes onExitDemo={exitDemo} /></PortfolioProvider> : <Navigate to="/" replace />} />
      <Route path="*" element={<Navigate to={authenticated ? '/app' : '/'} replace />} />
    </Routes>
  )
}
