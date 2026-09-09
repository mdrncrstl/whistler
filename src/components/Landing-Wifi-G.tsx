import { MarketingNavigation } from './MarketingNavigation'
import { MarketingContent } from './MarketingContent'
import type { MarketingPage } from '../lib/marketingPages'
import { marketingGroups, marketingPages } from '../lib/marketingPages'
import { config } from '../lib/config'
import { GoogleLogin } from '@react-oauth/google'
import {
  ArrowLeft, ArrowRight, BarChart3, Check, ChevronDown, Database, Eye, EyeOff,
  FileCheck2, FileSpreadsheet, Gauge, Globe2, Link2, LockKeyhole, Mail, Menu,
  Network, ShieldCheck, TrendingUp, X,
} from 'lucide-react'
import { AnimatePresence, motion, useInView, useMotionValueEvent, useReducedMotion, useScroll } from 'framer-motion'
import { useEffect, useRef, useState, type FormEvent, type ReactNode } from 'react'
import { annualSavingsPercent, billingPlans, formatAud } from '../lib/billing'
import { brokers } from '../lib/brokers'
import { demoBundle } from '../data/demo'
import { money, percent } from '../lib/format'
import { summarisePortfolio } from '../lib/portfolio'
import { authClient } from '../lib/supabase'
import { HoldingLogo } from './HoldingLogo'
import { Brand, MotionDialogSurface } from './ui-Wifi-G'

const howItWorks = [
  ['Bring in your records', 'Bring one or several portfolios through a read-only connection, a CSV export, or a supported statement. Nothing you connect can place a trade or move money.'],
  ['Check what came in', 'The import preview flags unmapped columns, ambiguous numbers, duplicate rows and missing exchange rates before anything is saved. Reconcile the totals against your broker statement.'],
  ['Read the reports', 'Performance, income, diversification and Australian tax reports are all built from those records, and every figure keeps a path back to the transaction behind it.'],
] as const

const proofStats = [
  { value: '1–10', label: 'portfolios per workspace', icon: BarChart3 },
  { value: `${brokers.filter((broker) => broker.id !== 'other').length}`, label: 'named broker guides', icon: Link2 },
  { value: 'CSV + PDF', label: 'imports from supported exports', icon: FileSpreadsheet },
]

const productViews = [
  {
    id: 'portfolio',
    label: 'Portfolio',
    title: 'See the whole portfolio at once.',
    copy: 'Holdings, capital gains, income and currency effects stay connected to the records that produced them.',
    icon: BarChart3,
  },
  {
    id: 'performance',
    label: 'Performance',
    title: 'Find what actually drove the return.',
    copy: 'Compare periods, benchmarks and contribution without flattening the answer into one headline number.',
    icon: Gauge,
  },
  {
    id: 'tax',
    label: 'Australian tax',
    title: 'Keep tax records close to the trades.',
    copy: 'Review matched disposals, parcel choices, taxable income, valuations and historical cost in one working record.',
    icon: FileCheck2,
  },
] as const

const faqs = [
  ['Is Masterdeck a broker?', 'No. Masterdeck tracks and analyses portfolios. It cannot hold assets, move money or place trades.'],
  ['Which accounts can I connect?', 'Bring records from named broker formats, any broker that exports CSV, and supported PDF statements. Where a direct read-only sync is available, it is optional; every import is reviewed before it is saved.'],
  ['Does it work for global portfolios?', 'Track performance, income, currency and allocation for supported global holdings, with dedicated Australian CGT records.'],
  ['Can I try it before paying?', 'Yes. Start a 14-day free trial without a credit card, or explore the demo without creating an account. The trial does not automatically charge you.'],
]

const principleRows = [
  ['Separate the return', 'Capital growth, income and currency effects stay visible as distinct parts of the answer.', TrendingUp],
  ['Keep the source close', 'Every report stays connected to the holdings, transactions and statements beneath it.', Database],
  ['Stay read-only', 'Masterdeck analyses records. It does not hold assets, move money or place trades.', ShieldCheck],
] as const

const previewSummary = summarisePortfolio(demoBundle)
type LandingProps = { onDemo: () => void; signedIn?: boolean; onOpenApp?: () => void; page?: MarketingPage | 'pricing' }

export function Landing({ onDemo, signedIn = false, onOpenApp, page }: LandingProps) {
  useEffect(() => {
    document.title = page ? `${page === 'pricing' ? 'Pricing' : page.label} | Masterdeck` : 'MASTERDECK'
    const canonical = document.querySelector<HTMLLinkElement>('link[rel="canonical"]')
    if (canonical) canonical.href = `https://masterdeck.app${page ? page === 'pricing' ? '/pricing' : page.path : '/'}`
    const description = document.querySelector<HTMLMetaElement>('meta[name="description"]')
    if (description) description.content = page ? page === 'pricing' ? 'Compare Masterdeck portfolio plans in AUD. Start a 14-day trial without a credit card.' : page.description : 'Track your portfolio, recorded income and Australian tax records in Masterdeck.'
  }, [page])
  const reduceMotion = useReducedMotion()
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [redirecting, setRedirecting] = useState(false)
  const [signInOpen, setSignInOpen] = useState(false)
  const [appleAvailable, setAppleAvailable] = useState(false)
  useEffect(() => {
    if (!signInOpen) return
    const controller = new AbortController()
    void fetch(`${config.authUrl}/auth/v1/settings`, { headers: { apikey: config.authKey }, signal: controller.signal })
      .then(async response => response.ok && (await response.json()).external?.apple === true)
      .then(available => { if (!controller.signal.aborted) setAppleAvailable(Boolean(available)) })
      .catch(() => { if (!controller.signal.aborted) setAppleAvailable(false) })
    return () => controller.abort()
  }, [signInOpen])
  const [authMode, setAuthMode] = useState<'signin' | 'signup'>('signin')
  const [authMethod, setAuthMethod] = useState<'choice' | 'email' | 'google'>('choice')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [passwordVisible, setPasswordVisible] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [annual, setAnnual] = useState(true)
  const [openFaq, setOpenFaq] = useState(0)
  const [activeView, setActiveView] = useState(0)
  const [headerScrolled, setHeaderScrolled] = useState(false)
  const { scrollY } = useScroll()

  useMotionValueEvent(scrollY, 'change', (currentScrollY) => {
    setHeaderScrolled(currentScrollY > 16)
  })

  useMotionValueEvent(scrollY, 'change', () => {
    const readingLine = Math.min(220, window.innerHeight * 0.3)
    let nextView = 0
    productViews.forEach((view, index) => {
      const panel = document.getElementById(`product-${view.id}`)
      if (panel && panel.getBoundingClientRect().top <= readingLine) nextView = index
    })
    setActiveView(current => current === nextView ? current : nextView)
  })

  const openAuthentication = (mode: 'signin' | 'signup') => {
    if (signedIn) {
      onOpenApp?.()
      return
    }
    setAuthMode(mode)
    setError('')
    setNotice('')
    setPassword('')
    setPasswordVisible(false)
    setAuthMethod('choice')
    setSignInOpen(true)
  }

  const switchAuthMode = (mode: 'signin' | 'signup') => {
    setAuthMode(mode)
    setError('')
    setNotice('')
    setPassword('')
  }

  const closeAuthentication = () => {
    if (redirecting) return
    setSignInOpen(false)
    setError('')
    setNotice('')
    setPassword('')
    setPasswordVisible(false)
  }

  const friendlyAuthError = (message: string) => {
    const normalized = message.toLowerCase()
    if (normalized.includes('invalid login credentials')) return 'Email or password is incorrect.'
    if (normalized.includes('email not confirmed')) return 'Confirm your email before signing in.'
    if (normalized.includes('rate limit') || normalized.includes('too many')) return 'Too many attempts. Wait a moment, then try again.'
    if (normalized.includes('password')) return message
    return 'We could not complete that request. Please try again.'
  }

  const completeEmailAuthentication = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setAuthMethod('email')
    const cleanEmail = email.trim().toLowerCase()
    if (!cleanEmail) {
      setError('Enter your email address.')
      return
    }
    if (!password) {
      setError('Enter your password.')
      return
    }
    if (authMode === 'signup' && password.length < 8) {
      setError('Use at least 8 characters for your password.')
      return
    }

    setRedirecting(true)
    setError('')
    setNotice('')

    if (authMode === 'signin') {
      const { error: signInError } = await authClient.auth.signInWithPassword({ email: cleanEmail, password })
      if (signInError) {
        setError(friendlyAuthError(signInError.message))
        setRedirecting(false)
        return
      }
      setSignInOpen(false)
      setPassword('')
      onOpenApp?.()
      return
    }

    const { data, error: signUpError } = await authClient.auth.signUp({
      email: cleanEmail,
      password,
      options: { emailRedirectTo: window.location.origin + '/auth/callback' },
    })
    if (signUpError) {
      setError(friendlyAuthError(signUpError.message))
      setRedirecting(false)
      return
    }
    if (data.session) {
      setSignInOpen(false)
      setPassword('')
      onOpenApp?.()
      return
    }
    setPassword('')
    setNotice('Check ' + cleanEmail + ' for your confirmation link.')
    setRedirecting(false)
  }

  const finishGoogleSignIn = async (credential?: string) => {
    if (!credential) { setError('Google did not return a sign-in token. Please try again.'); return }
    setRedirecting(true)
    setError('')
    try {
      const { data, error: signInError } = await authClient.auth.signInWithIdToken({ provider: 'google', token: credential })
      if (signInError || !data.session) throw signInError || new Error('No session')
      onOpenApp?.()
    } catch { setError('Google sign-in could not be completed. Please try again.'); setRedirecting(false) }
  }

  const beginAppleSignIn = async () => {
    setRedirecting(true)
    setError('')
    try {
      const response = await fetch(`${config.authUrl}/auth/v1/settings`, { headers: { apikey: config.authKey } })
      const settings = await response.json()
      if (!response.ok || !settings.external?.apple) throw new Error('Apple sign-in is not available yet. Please use Google or email.')
      const { error: signInError } = await authClient.auth.signInWithOAuth({ provider: 'apple', options: { redirectTo: `${window.location.origin}/auth/callback` } })
      if (signInError) throw signInError
    } catch (error) { setError(error instanceof Error ? error.message : 'Apple sign-in could not be started.'); setRedirecting(false) }
  }

  const signupLabel = signedIn ? 'Open Masterdeck' : redirecting ? 'Finishing sign-in...' : 'Try Masterdeck free'
  const pricingCtaLabel = signedIn ? 'Open Masterdeck' : 'Start free trial'

  return (
    <div className="cloud-page">
      <header
        className={'cloud-header ' + (headerScrolled || page ? 'is-scrolled' : 'is-at-top')}
        data-scroll-state={headerScrolled ? 'scrolled' : 'top'}
        role="banner"
      >
        <div className="cloud-container cloud-nav">
          <a className="cloud-home" href="/" aria-label="Masterdeck home"><Brand /></a>
          <nav className="cloud-desktop-nav" aria-label="Main navigation"><MarketingNavigation /></nav>
          <div className="cloud-nav-actions">
            <button className="cloud-login" onClick={() => openAuthentication('signin')}>{signedIn ? 'Open app' : 'Log in'}</button>
            <button className="cloud-button cloud-button-small" onClick={() => openAuthentication('signup')} disabled={redirecting}>
              {signupLabel}<ArrowRight />
            </button>
          </div>
          <button className="cloud-menu" aria-label="Toggle mobile menu" aria-expanded={mobileOpen} onClick={() => setMobileOpen(!mobileOpen)}>
            {mobileOpen ? <X /> : <Menu />}
          </button>
        </div>
        <AnimatePresence initial={false}>
          {mobileOpen && (
            <motion.nav
              className="cloud-mobile-nav"
              aria-label="Mobile navigation"
              initial={reduceMotion ? false : { opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={reduceMotion ? undefined : { opacity: 0, y: -8 }}
            >
              <MarketingNavigation mobile onNavigate={() => setMobileOpen(false)} />
              <button className="cloud-button" onClick={() => openAuthentication('signup')} disabled={redirecting}>
                {signupLabel}<ArrowRight />
              </button>
            </motion.nav>
          )}
        </AnimatePresence>
      </header>

      {page ? <MarketingContent page={page} onStart={() => openAuthentication('signup')} onDemo={() => { onDemo(); onOpenApp?.() }} /> : <main id="top">
        <section className="cloud-hero cloud-container">
          <div className="cloud-hero-field" aria-hidden="true">
            <span className="cloud-hero-grid" />
            <span className="cloud-hero-scan" />
            <span className="cloud-hero-orbit cloud-hero-orbit-one" />
            <span className="cloud-hero-orbit cloud-hero-orbit-two" />
          </div>
          <motion.div
            className="cloud-hero-copy"
            initial={reduceMotion ? false : { opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.54, ease: [0.16, 1, 0.3, 1] }}
          >
            <h1>Know what your portfolio is <em>really</em> doing.</h1>
            <p>See your shares, ETFs, income and Australian tax records together. Connect a supported account or import your statements to get started.</p>
            <div className="cloud-actions">
              <button className="cloud-button cloud-button-light" onClick={() => openAuthentication('signup')} disabled={redirecting}>
                {signupLabel}<ArrowRight />
              </button>
              {!signedIn && <button className="cloud-button cloud-button-outline-light" onClick={() => { onDemo(); onOpenApp?.() }}>Explore the demo</button>}
            </div>
            {!signedIn && <p className="cloud-trial-note">14-day free trial · No credit card · No automatic charge</p>}
          </motion.div>
          <motion.div
            className="cloud-hero-preview"
            initial={reduceMotion ? false : { opacity: 0, y: 26, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.68, delay: 0.08, ease: [0.16, 1, 0.3, 1] }}
          >
            <figure className="cloud-app-screenshot"><img src="/marketing/masterdeck-portfolio-hero.png" width="1366" height="768" alt="Masterdeck portfolio dashboard showing portfolio value, returns, performance chart and holdings" fetchPriority="high" decoding="async" /><figcaption>Actual Masterdeck app · Demo portfolio</figcaption></figure>
          </motion.div>
        </section>

        <Reveal className="cloud-region cloud-container">
          <div className="cloud-region-intro">
            <h2>Every portfolio.<br />One clear record.</h2>
            <p>Start with one of our named broker guides, or bring a compatible CSV or PDF from another broker. Every holding and trade stays connected to the return you are looking at now.</p>
          </div>
          <div className="cloud-stat-table" aria-label="Masterdeck coverage">
            {proofStats.map(({ value, label, icon: Icon }) => (
              <div className="cloud-stat-row" key={label}>
                <Icon />
                <strong>{value}</strong>
                <span>{label}</span>
              </div>
            ))}
          </div>
        </Reveal>

        <section className="cloud-product cloud-container cloud-product-story" id="product">
          <Reveal className="cloud-section-intro">
            <h2 aria-label="One portfolio. No blind spots.">One portfolio.<br /><em>No blind spots.</em></h2>
            <p>Follow the full picture, from your holdings to performance and Australian tax records.</p>
          </Reveal>
          <div className="cloud-product-layout">
            <nav className="cloud-product-rail" aria-label="Masterdeck product views">
              {productViews.map((view, index) => {
                const Icon = view.icon
                return <a key={view.id} href={`#product-${view.id}`} aria-current={activeView === index ? 'location' : undefined}
                  onClick={event => {
                    event.preventDefault()
                    document.getElementById(`product-${view.id}`)?.scrollIntoView({ behavior: reduceMotion ? 'instant' : 'smooth', block: 'start' })
                    setActiveView(index)
                  }}>
                  <Icon /><span className="cloud-product-rail-label"><strong>{view.label}</strong><small>{view.title}</small></span><ArrowRight />
                </a>
              })}
            </nav>
            <div className="cloud-product-panels">
              {productViews.map(view => <Reveal key={view.id} id={`product-${view.id}`} className="cloud-product-stage">
                <div className="cloud-product-copy"><h3>{view.title}</h3><p>{view.copy}</p></div>
                <ProductModule view={view} />
              </Reveal>)}
            </div>
          </div>
        </section>

        <Reveal className="cloud-principles">
          <div className="cloud-container cloud-principles-layout">
            <div className="cloud-principles-intro">
              <h2>Designed for the part no dashboard can hide.</h2>
              <p>Investing is a stack of accounts, currencies, transactions and decisions. The interface should make that stack legible.</p>
            </div>
            <div className="cloud-principles-list">
              {principleRows.map(([title, copy, Icon], index) => (
                <div className="cloud-principle-row" key={title}>
                  <span className="cloud-principle-index">0{index + 1}</span>
                  <Icon />
                  <div><h3>{title}</h3><p>{copy}</p></div>
                  <ArrowRight />
                </div>
              ))}
            </div>
          </div>
        </Reveal>

        <Reveal className="cloud-steps cloud-container" id="how-it-works">
          <div className="cloud-section-intro cloud-steps-intro">
            <span className="section-label">HOW IT WORKS</span>
            <h2>Three steps to a portfolio you can trust.</h2>
            <p>No spreadsheet rebuild, and no number that appears without a record behind it.</p>
          </div>
          <ol className="cloud-steps-list">
            {howItWorks.map(([title, copy], index) => (
              <li key={title}>
                <span className="cloud-step-index">{index + 1}</span>
                <h3>{title}</h3>
                <p>{copy}</p>
              </li>
            ))}
          </ol>
        </Reveal>

        <Reveal className="cloud-connections cloud-container" id="connections">
          <div className="cloud-connections-head">
            <div>
              <h2 aria-label="Bring every portfolio into one history.">Bring every portfolio<br /><em>into one history.</em></h2>
            </div>
            <div className="cloud-connections-proof"><strong>1–10</strong><span>portfolios in one workspace</span></div>
          </div>
          <div className="cloud-connection-rows">
            <div className="cloud-connection-row">
              <span>01</span><Globe2 /><div><strong>Global holdings</strong><p>Track holdings, currencies and returns across the markets you already use.</p></div><ArrowRight />
            </div>
            <div className="cloud-connection-row">
              <span>02</span><BarChart3 /><div><strong>Multiple portfolios</strong><p>Keep up to ten portfolios together while their records and returns stay distinct.</p></div><ArrowRight />
            </div>
            <div className="cloud-connection-row">
              <span>03</span><FileSpreadsheet /><div><strong>CSV and PDF imports</strong><p>Start with a named broker guide or upload any compatible export for review.</p></div><ArrowRight />
            </div>
          </div>
          <a className="cloud-button cloud-button-outline-light cloud-connections-cta" href="/pricing">See pricing<ArrowRight /></a>
        </Reveal>

        <Reveal className="cloud-pricing cloud-container" id="pricing">
          <div className="cloud-pricing-head">
            <div className="cloud-section-intro">
              <h2 aria-label="Clear pricing. Try it before you pay.">Clear pricing.<br /><em>Try it before you pay.</em></h2>
            </div>
            <div className="cloud-pricing-copy">
              <p><strong>Try every plan free for 14 days.</strong><br />No card required. Cancel anytime.</p>
              <div className="cloud-billing-toggle" aria-label="Billing period">
                <button aria-pressed={!annual} className={!annual ? 'active' : ''} onClick={() => setAnnual(false)}>Monthly</button>
                <button aria-pressed={annual} className={annual ? 'active' : ''} onClick={() => setAnnual(true)}>Annual <span>save 26%</span></button>
              </div>
            </div>
          </div>
          <div className="cloud-pricing-grid">
            {billingPlans.map((plan) => (
              <article key={plan.id} className={plan.featured ? 'featured' : ''}>
                {plan.featured && <span className="cloud-plan-badge">Recommended</span>}
                <span className="cloud-plan-index">0{billingPlans.indexOf(plan) + 1}</span>
                <h3>{plan.name}</h3>
                <p>Up to {plan.portfolios} {plan.portfolios === 1 ? 'portfolio' : 'portfolios'}</p>
                <div className="cloud-price" aria-live="polite">
                  <AnimatePresence initial={false} mode="wait">
                    <motion.strong
                      key={plan.id + '-' + (annual ? 'annual' : 'monthly')}
                      initial={reduceMotion ? false : { opacity: 0, y: 7 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={reduceMotion ? undefined : { opacity: 0, y: -7 }}
                      transition={{ duration: reduceMotion ? 0 : 0.18, ease: [0.16, 1, 0.3, 1] }}
                    >
                      {'$' + formatAud(annual ? plan.annual : plan.monthly)}
                    </motion.strong>
                  </AnimatePresence>
                  <span>AUD / month</span>
                </div>
                <AnimatePresence initial={false} mode="wait">
                  <motion.small
                    key={plan.id + '-' + (annual ? 'annual-note' : 'monthly-note')}
                    initial={reduceMotion ? false : { opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={reduceMotion ? undefined : { opacity: 0, y: -5 }}
                    transition={{ duration: reduceMotion ? 0 : 0.16 }}
                    className="cloud-plan-note"
                  >
                    {annual ? '$' + formatAud(plan.annualTotal) + ' billed annually, save ' + annualSavingsPercent(plan) + '%' : 'Billed monthly. Cancel anytime.'}
                  </motion.small>
                </AnimatePresence>
                <button className="cloud-button cloud-button-price" onClick={() => openAuthentication('signup')}>{pricingCtaLabel}</button>
                <ul>{plan.features.slice(0, 4).map((item) => <li key={item}><Check />{item}</li>)}</ul>
              </article>
            ))}
          </div>
          <div className="cloud-pricing-foot"><span><ShieldCheck /> No card required</span><span><LockKeyhole /> Read-only by design</span><span><ArrowRight /> Cancel anytime</span></div>
        </Reveal>

        <Reveal className="cloud-faq cloud-container" id="faq">
          <div className="cloud-faq-heading">
            <h2>Before you connect anything.</h2>
            <p>Direct answers about access, data and the product.</p>
          </div>
          <div className="cloud-faq-list">
            {faqs.map(([question, answer], index) => (
              <article key={question}>
                <button aria-expanded={openFaq === index} aria-controls={'cloud-faq-' + index} onClick={() => setOpenFaq(openFaq === index ? -1 : index)}>
                  <span>{question}</span><ChevronDown />
                </button>
                <AnimatePresence initial={false}>
                  {openFaq === index && (
                    <motion.p
                      id={'cloud-faq-' + index}
                      initial={reduceMotion ? false : { opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={reduceMotion ? undefined : { opacity: 0, height: 0 }}
                    >
                      {answer}
                    </motion.p>
                  )}
                </AnimatePresence>
              </article>
            ))}
          </div>
        </Reveal>

        <Reveal className="cloud-final">
          <div className="cloud-container cloud-final-inner">
            <Network />
            <h2>Your portfolio should make sense.</h2>
            <p>Give Masterdeck the records. Get back the full picture.</p>
            <div className="cloud-actions">
              <button className="cloud-button cloud-button-light" onClick={() => openAuthentication('signup')} disabled={redirecting}>{signupLabel}<ArrowRight /></button>
              <a className="cloud-button cloud-button-outline-light" href="/pricing">See pricing</a>
            </div>
          </div>
        </Reveal>
      </main>}

      <footer className="cloud-footer">
        <div className="cloud-container cloud-footer-grid">
          <div className="cloud-footer-brand"><Brand /><p>Global portfolio tracking with serious Australian CGT depth.</p><span><LockKeyhole /> Read-only by design</span></div>
          {marketingGroups.map(group => <div key={group}><strong>{group}</strong>{marketingPages.filter(item => item.group === group).map(item => <a key={item.path} href={item.path}>{item.label}</a>)}</div>)}
          <div><strong>Account</strong><a href="/pricing">Pricing</a><button onClick={() => openAuthentication('signin')}>{signedIn ? 'Open app' : 'Log in'}</button><button onClick={() => openAuthentication('signup')}>{signupLabel}</button></div>
        </div>
        <div className="cloud-container cloud-legal"><span>© 2026 Masterdeck</span><p>Portfolio record-keeping and analysis software.</p></div>
      </footer>

      <MotionDialogSurface open={signInOpen} className="masterdeck-signin-dialog" labelledBy="masterdeck-signin-title" onClose={closeAuthentication}>
        <div className="masterdeck-auth-topline">
          <Brand />
          <button className="masterdeck-signin-close" type="button" aria-label="Close sign-in" disabled={redirecting} onClick={closeAuthentication}><X /></button>
        </div>
        <h2 id="masterdeck-signin-title">Continue to Masterdeck</h2>
        <p>{authMode === 'signin' ? 'Welcome back. Choose how to sign in.' : 'Try Masterdeck free for 14 days. No card or automatic charge.'}</p>
        <div className="masterdeck-auth-tabs" role="tablist" aria-label="Email authentication">
          <button type="button" role="tab" aria-selected={authMode === 'signin'} onClick={() => switchAuthMode('signin')}>Sign in</button>
          <button type="button" role="tab" aria-selected={authMode === 'signup'} onClick={() => switchAuthMode('signup')}>Create account</button>
        </div>
        <div className="masterdeck-auth-methods" aria-label="Choose a sign-in method">
          <NativeGoogleSignIn busy={redirecting} onCredential={credential => { void finishGoogleSignIn(credential) }} onError={() => { setError('Google sign-in was cancelled or blocked. Please try again.'); setRedirecting(false) }}/>
          {authMethod !== 'email' && <button
              className="masterdeck-auth-method"
              type="button"
              disabled={redirecting}
              onClick={() => { setAuthMethod('email'); setError(''); setNotice('') }}
            >
              <span className="masterdeck-auth-method-icon" aria-hidden="true"><Mail /></span>
              <span className="masterdeck-auth-method-text">Continue with email</span>
              <span className="masterdeck-auth-method-spacer" aria-hidden="true" />
            </button>}
          {appleAvailable && <button className="masterdeck-auth-method" type="button" disabled={redirecting} onClick={beginAppleSignIn}>
            <span className="masterdeck-auth-method-icon" aria-hidden="true"><img src="/holding-logos/apple.ico" width="22" height="22" alt=""/></span>
            <span className="masterdeck-auth-method-text">Continue with Apple</span>
            <span className="masterdeck-auth-method-spacer" aria-hidden="true" />
          </button>}
        </div>
        {authMethod === 'email' && <button className="masterdeck-auth-back" type="button" disabled={redirecting} onClick={() => { setAuthMethod('choice'); setError(''); setNotice('') }}><ArrowLeft /> Choose another method</button>}
        <form className={'masterdeck-email-auth ' + (authMethod !== 'email' ? 'is-collapsed' : '')} onSubmit={completeEmailAuthentication} noValidate>
          <label htmlFor="masterdeck-auth-email">Email</label>
          <input id="masterdeck-auth-email" name="email" type="email" autoComplete="email" inputMode="email" placeholder="you@example.com" value={email} disabled={redirecting} onChange={(event) => setEmail(event.target.value)} />
          <label htmlFor="masterdeck-auth-password">Password</label>
          <div className="masterdeck-password-field">
            <input id="masterdeck-auth-password" name="password" type={passwordVisible ? 'text' : 'password'} autoComplete={authMode === 'signin' ? 'current-password' : 'new-password'} placeholder={authMode === 'signup' ? 'At least 8 characters' : 'Your password'} value={password} disabled={redirecting} onChange={(event) => setPassword(event.target.value)} />
            <button type="button" aria-label={passwordVisible ? 'Hide password' : 'Show password'} disabled={redirecting} onClick={() => setPasswordVisible(!passwordVisible)}>{passwordVisible ? <EyeOff /> : <Eye />}</button>
          </div>
          <button className="masterdeck-email-submit" type="submit" disabled={redirecting}>{redirecting ? 'Please wait...' : authMode === 'signin' ? 'Sign in with email' : 'Create account'}</button>
        </form>
        {error && <p className="masterdeck-signin-error" role="alert">{error}</p>}
        {notice && <p className="masterdeck-signin-notice" role="status">{notice}</p>}
      </MotionDialogSurface>
    </div>
  )
}

function NativeGoogleSignIn({ busy, onCredential, onError }: { busy: boolean; onCredential: (credential?: string) => void; onError: () => void }) {
  const host = useRef<HTMLDivElement>(null)
  const [width, setWidth] = useState(400)
  useEffect(() => {
    if (!host.current) return
    const measure = () => setWidth(Math.min(400, Math.floor(host.current?.clientWidth || 400)))
    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(host.current)
    return () => observer.disconnect()
  }, [])
  return <div ref={host} className="masterdeck-google-native" aria-busy={busy} inert={busy}>
    <div className="masterdeck-auth-method masterdeck-google-visual" aria-hidden="true">
      <span className="masterdeck-auth-method-icon masterdeck-google-icon"><span className="masterdeck-google-letter">G</span></span>
      <span className="masterdeck-auth-method-text">Continue with Google</span>
      <span className="masterdeck-auth-method-spacer" aria-hidden="true" />
    </div>
    <div className="masterdeck-google-hit-area">
      <GoogleLogin text="continue_with" theme="outline" size="large" shape="rectangular" width={width} ux_mode="popup" onSuccess={response => onCredential(response.credential)} onError={onError}/>
    </div>
  </div>
}

function Reveal({ children, className = '', id }: { children: ReactNode; className?: string; id?: string }) {
  const reduceMotion = useReducedMotion()
  const revealRef = useRef<HTMLElement>(null)
  const isInView = useInView(revealRef, { once: true, amount: 0.12, margin: '0px 0px -8% 0px' })
  return (
    <motion.section
      ref={revealRef}
      id={id}
      className={className}
      initial={reduceMotion ? false : { opacity: 0, y: 18 }}
      animate={reduceMotion || isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 18 }}
      transition={{ duration: reduceMotion ? 0 : 0.6, ease: [0.16, 1, 0.3, 1] }}
    >
      {children}
    </motion.section>
  )
}

function ProductModule({ view }: { view: typeof productViews[number] }) {
  const holdings = demoBundle.holdings.slice(0, 5)
  const taxRows = demoBundle.transactions.filter((transaction) => transaction.type === 'SELL' || transaction.type === 'DIVIDEND').slice(0, 4)
  return (
    <div className="cloud-module" role="img" aria-label={view.label + ' performance report preview'}>
      <div className="cloud-module-head"><h4>{view.label}</h4></div>
      {view.id === 'portfolio' && (
        <>
          <div className="cloud-module-summary">
            <div><span>Portfolio value</span><strong>{money(previewSummary.total, 'AUD', 0)}</strong><em className="positive">{percent(previewSummary.returnPct, 1)}</em></div>
            <div><span>Capital gain</span><strong>{money(previewSummary.unrealised, 'AUD', 0)}</strong><em className="positive">tracked</em></div>
            <div><span>Income</span><strong>{money(previewSummary.income, 'AUD', 0)}</strong><em>recorded</em></div>
          </div>
          <div className="cloud-module-ledger">
            {holdings.map((holding) => <div key={holding.symbol}><HoldingLogo symbol={holding.symbol} assetClass={holding.asset_class} size={28} /><span><strong>{holding.symbol}</strong><small>{holding.name}</small></span><b>{money(holding.value_aud, 'AUD', 0)}</b><em className="positive">{percent(holding.return_pct, 1)}</em></div>)}
          </div>
        </>
      )}
      {view.id === 'performance' && (
        <div className="cloud-module-performance">
          <div className="cloud-module-performance-chart"><span /><span /><span /><span /><span /><span /><span /><span /></div>
          <div className="cloud-module-performance-legend"><span><i className="green-dot" />Portfolio return <b>{percent(previewSummary.returnPct, 1)}</b></span><span><i className="soft-dot" />Benchmark <b>+26.4%</b></span></div>
          <div className="cloud-module-contribution">{holdings.slice(0, 4).map((holding) => <div key={holding.symbol}><HoldingLogo symbol={holding.symbol} assetClass={holding.asset_class} size={26} /><span>{holding.symbol}</span><div><i style={{ width: Math.min(100, Math.max(18, holding.return_pct)) + '%' }} /></div><b>{percent(holding.return_pct, 1)}</b></div>)}</div>
        </div>
      )}
      {view.id === 'tax' && (
        <div className="cloud-module-tax">
          <div className="cloud-module-tax-head"><span>Activity record</span><span>Status</span><span>Amount</span></div>
          {taxRows.map((transaction) => <div key={transaction.provider_external_id}><span><strong>{transaction.symbol}</strong><small>{transaction.type === 'SELL' ? 'Disposal matched to parcels' : 'Income record'}</small></span><em>{transaction.type === 'SELL' ? 'Matched' : 'Recorded'}</em><b>{money(Math.abs(transaction.amount * (transaction.fx_rate || 1)), 'AUD', 0)}</b></div>)}
          <div className="cloud-module-tax-footer"><FileCheck2 /> Parcel history stays attached to each report.</div>
        </div>
      )}
    </div>
  )
}
