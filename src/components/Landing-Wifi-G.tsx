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
import { authClient } from '../lib/supabase'
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
  const [headerScrolled, setHeaderScrolled] = useState(false)
  const { scrollY } = useScroll()

  useMotionValueEvent(scrollY, 'change', (currentScrollY) => {
    setHeaderScrolled(currentScrollY > 16)
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
    <div className="cloud-page alpine-site">
      <header
        className="cloud-header is-scrolled"
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
            <h1>Every investment. <br />One clear view.</h1>
            <p>See your shares, ETFs, income and Australian tax records together. Connect a supported account or import your statements to get started.</p>
            <div className="cloud-actions">
              <button className="cloud-button cloud-button-light" onClick={() => openAuthentication('signup')} disabled={redirecting}>
                {signupLabel}<ArrowRight />
              </button>
              {!signedIn && <button className="cloud-button cloud-button-outline-light" onClick={() => { onDemo(); onOpenApp?.() }}>Explore the demo</button>}
            </div>
            {!signedIn && <p className="cloud-trial-note">14-day free trial · No credit card · No automatic charge</p>}
          </motion.div>
          <figure className="alpine-hero-product"><img src="/marketing/masterdeck-portfolio-hero.png" width="1366" height="768" alt="Masterdeck portfolio dashboard with demo holdings" fetchPriority="high"/></figure>
        </section>

        <section className="alpine-assurance" aria-label="Trial and security"><span><ShieldCheck size={15}/>Read-only by design</span><span><Check size={15}/>14 days free</span><span><LockKeyhole size={15}/>No credit card required</span></section>
        <Reveal className="alpine-showcase cloud-container"><div><h2>A little clarity goes a long way.</h2><p>Your shares, ETFs, income and tax records, organised in one place.</p></div><figure><img src="/marketing/masterdeck-portfolio-hero.png" width="1366" height="768" alt="Actual Masterdeck portfolio with demo holdings, performance chart and returns" loading="lazy"/><figcaption>Actual Masterdeck app · Demo portfolio</figcaption></figure></Reveal>
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

        <Reveal id="product" className="alpine-feature-grid cloud-container" aria-label="Explore Masterdeck features">
          <div className="alpine-feature-heading"><h2>More perspective. <br/>Less piecing things together.</h2><p>One home for the details that matter to your portfolio.</p></div>
          {[
            { title: 'Your portfolio, together', text: 'Bring your accounts into one clear picture of what you own.', href: '/features/portfolio-tracking', icon: Globe2, image: 'portfolio-focus.png', tone: 'mint' },
            { title: 'See what drove the return', text: 'Explore performance, compare periods and follow your progress.', href: '/features/performance', icon: TrendingUp, image: 'performance-focus.png', tone: 'sky' },
            { title: 'Keep the tax detail close', text: 'Review Australian tax records with the transactions behind them.', href: '/features/australian-tax', icon: FileCheck2, image: 'tax-focus.png', tone: 'sky' },
            { title: 'A benchmark for your progress', text: 'Put your portfolio performance in context with a custom benchmark.', href: '/features/performance', icon: Gauge, image: 'benchmark.png', tone: 'mint' },
          ].map(({title,text,href,icon: Icon,image,tone}) => <a href={href} className={`alpine-feature-card ${tone}`} key={title}><div className="alpine-feature-art"><span><Icon size={22}/></span><img src={`/marketing/${image}`} alt="" loading="lazy"/></div><h3>{title}</h3><p>{text}</p><ArrowRight size={17}/></a>)}
        </Reveal>
        <section className="alpine-mid-cta cloud-container"><h2>A clearer view starts here.</h2><p>Bring your records. Find your perspective.</p><button className="cloud-button cloud-button-light" onClick={() => openAuthentication('signup')}>{signupLabel}</button></section>
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

function Reveal({ children, className = '', id, 'aria-label': ariaLabel }: { children: ReactNode; className?: string; id?: string; 'aria-label'?: string }) {
  const reduceMotion = useReducedMotion()
  const revealRef = useRef<HTMLElement>(null)
  const isInView = useInView(revealRef, { once: true, amount: 0.12, margin: '0px 0px -8% 0px' })
  return (
    <motion.section
      ref={revealRef}
      id={id}
      aria-label={ariaLabel}
      className={className}
      initial={reduceMotion ? false : { opacity: 0, y: 10 }}
      animate={reduceMotion || isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 10 }}
      transition={{ duration: reduceMotion ? 0 : 0.48, ease: [0.16, 1, 0.3, 1] }}
    >
      {children}
    </motion.section>
  )
}
