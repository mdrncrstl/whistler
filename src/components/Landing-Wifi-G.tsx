import { MarketingNavigation } from './MarketingNavigation'
import { MarketingContent } from './MarketingContent'
import type { MarketingPage } from '../lib/marketingPages'
import { marketingGroups, marketingPages } from '../lib/marketingPages'
import { config } from '../lib/config'
import {
  ArrowLeft, ArrowRight, BarChart3, Check, ChevronDown, Database, Eye, EyeOff,
  FileCheck2, FileSpreadsheet, Gauge, Globe2, Link2, LockKeyhole, Mail, Menu,
  Network, ShieldCheck, Star, TrendingUp, X,
} from 'lucide-react'
import { AnimatePresence, motion, useMotionValueEvent, useReducedMotion, useScroll } from 'framer-motion'
import { useEffect, useRef, useState, type FormEvent, type ReactNode } from 'react'
import { annualSavingsPercent, billingPlans, formatAud } from '../lib/billing'
import { brokers } from '../lib/brokers'
import { authClient } from '../lib/supabase'
import { applySeo } from '../lib/seo'
import { Brand, MotionDialogSurface } from './ui-Wifi-G'

const howItWorks = [
  { title: 'Bring in your records', copy: 'Choose a supported read-only source, upload a CSV or bring a compatible statement. Your broker keeps custody of your money and assets.', icon: Link2 },
  { title: 'Review the import', copy: 'Check holdings, transactions and any flagged records against your source before they become part of the portfolio history.', icon: FileCheck2 },
  { title: 'Read the reports', copy: 'See performance, income and Australian tax records with a clear path back to the transaction behind each result.', icon: BarChart3 },
] as const

const integrationBrokers = brokers.filter((broker) => broker.id !== 'ibkr' && broker.id !== 'other').slice(0, 10)

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
] as const

const principleRows = [
  ['Separate the return', 'Capital growth, income and currency effects stay visible as distinct parts of the answer.', TrendingUp],
  ['Keep the source close', 'Every report stays connected to the holdings, transactions and statements beneath it.', Database],
  ['Stay read-only', 'Masterdeck analyses records. It does not hold assets, move money or place trades.', ShieldCheck],
] as const

const placeholderReviews = [
  '“Finally, one place to see performance, income and tax records without rebuilding the story in a spreadsheet.”',
  '“The portfolio view made it much easier to understand what was driving my result.”',
  '“I could see the detail behind every number and keep my broker accounts separate.”',
] as const

type LandingProps = { onDemo: () => void; signedIn?: boolean; onOpenApp?: () => void; page?: MarketingPage | 'pricing' }

export function Landing({ onDemo, signedIn = false, onOpenApp, page }: LandingProps) {
  useEffect(() => {
    const path = page ? page === 'pricing' ? '/pricing' : page.path : '/'
    const title = page ? page === 'pricing' ? 'Pricing | Masterdeck' : `${page.title} | Masterdeck` : 'Masterdeck | Portfolio tracking with Australian CGT depth'
    const description = page ? page === 'pricing' ? 'Compare Masterdeck portfolio plans in AUD. Start a 14-day free trial without a credit card or automatic charge.' : page.description : 'Track shares, ETFs, income, performance and Australian CGT records across your portfolios in Masterdeck.'
    applySeo({ title, description, path, label: page === 'pricing' ? 'Pricing' : page?.label, group: page === 'pricing' ? undefined : page?.group, faqs: page ? undefined : faqs })
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

  const beginGoogleSignIn = async () => {
    setRedirecting(true)
    setError('')
    try {
      const { error: signInError } = await authClient.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
          queryParams: { prompt: 'select_account' },
        },
      })
      if (signInError) throw signInError
    } catch { setError('Google sign-in could not be started. Please try again.'); setRedirecting(false) }
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
          <figure className="alpine-hero-product">
            <div className="alpine-browser-bar" aria-hidden="true"><span className="alpine-browser-dots"><i/><i/><i/></span><span className="alpine-browser-address">masterdeck.app</span></div>
            <img src="/marketing/masterdeck-portfolio-hero.png" width="1585" height="900" alt="Masterdeck portfolio dashboard with demo holdings" fetchPriority="high"/>
          </figure>
        </section>

        <section className="alpine-assurance" aria-label="Trial and security"><span><ShieldCheck size={15}/>Read-only by design</span><span><Check size={15}/>14 days free</span><span><LockKeyhole size={15}/>No credit card required</span></section>
        <Reveal className="alpine-trustpilot cloud-container" aria-labelledby="trustpilot-heading">
          <div className="alpine-trustpilot-summary">
            <span className="section-label">TRUSTPILOT</span>
            <div className="alpine-trustpilot-rating" aria-label="4.7 out of 5 stars, placeholder rating">
              <strong>4.7</strong>
              <span className="alpine-star-row" aria-hidden="true">{Array.from({ length: 5 }, (_, index) => <Star key={index} size={16} fill="currentColor" />)}</span>
              <span>out of 5 · placeholder rating</span>
            </div>
            <h2 id="trustpilot-heading">A clearer view, backed by real investors.</h2>
            <p>Placeholder review content for the launch page. Replace these with verified Trustpilot reviews before publishing ads.</p>
            <span className="alpine-trustpilot-note">PLACEHOLDER REVIEWS · REPLACE BEFORE LAUNCH</span>
          </div>
          <div className="alpine-trustpilot-reviews">
            {placeholderReviews.map((quote) => (
              <article key={quote}>
                <div className="alpine-review-card-top"><span>Placeholder review</span><span className="alpine-review-stars" aria-hidden="true">{Array.from({ length: 5 }, (_, index) => <Star key={index} size={13} fill="currentColor" />)}</span></div>
                <blockquote>{quote}</blockquote>
                <cite>— Placeholder investor · Trustpilot placeholder</cite>
              </article>
            ))}
          </div>
        </Reveal>
        <Reveal className="alpine-showcase cloud-container">
          <div className="alpine-showcase-copy">
            <span className="section-label">PORTFOLIO TRACKING</span>
            <h2>Every account. Every holding. One working view.</h2>
            <p>Bring shares, ETFs, cash and transaction records together so the headline number always has a useful detail view behind it.</p>
            <a className="alpine-text-link" href="/features/portfolio-tracking">Explore portfolio tracking <ArrowRight size={16}/></a>
          </div>
          <figure><img src="/marketing/masterdeck-portfolio-hero.png" width="1585" height="900" alt="Actual Masterdeck portfolio with demo holdings, performance chart and returns" loading="lazy"/><figcaption>Actual Masterdeck app · Demo portfolio</figcaption></figure>
        </Reveal>
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

        <Reveal className="alpine-proof-section cloud-container">
          <div className="alpine-proof-copy">
            <span className="section-label">PERFORMANCE</span>
            <h2>Understand what is really driving the result.</h2>
            <p>Separate capital growth, income and currency effects, then compare the result with a benchmark without losing the records beneath it.</p>
            <a className="alpine-text-link" href="/features/performance">Explore performance <ArrowRight size={16}/></a>
          </div>
          <figure><img src="/marketing/performance-focus.png" width="2754" height="1400" alt="Masterdeck performance view showing return components and a benchmark" loading="lazy"/></figure>
        </Reveal>

        <Reveal className="alpine-proof-section alpine-proof-section-reverse cloud-container">
          <figure><img src="/marketing/tax-focus.png" width="2754" height="1300" alt="Masterdeck Australian tax view with connected investment records" loading="lazy"/></figure>
          <div className="alpine-proof-copy">
            <span className="section-label">AUSTRALIAN TAX</span>
            <h2>Keep the tax detail close to the trades.</h2>
            <p>Review disposals, parcel history and recorded income in the same workspace as the portfolio that produced them.</p>
            <a className="alpine-text-link" href="/features/australian-tax">Explore Australian tax records <ArrowRight size={16}/></a>
          </div>
        </Reveal>

        <section className="alpine-mid-cta"><div className="alpine-cta-inner"><h2>A clearer view starts here.</h2><p>Bring your records. Find your perspective.</p><button className="cloud-button cloud-button-light" onClick={() => openAuthentication('signup')}>{signupLabel}</button></div></section>
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
            <span className="section-label">GET STARTED IN JUST MINUTES</span>
            <h2>How it works</h2>
            <p>Start with the records you already have, then build a clearer view of the portfolio behind them.</p>
          </div>
          <ol className="cloud-steps-list">
            {howItWorks.map(({ title, copy, icon: Icon }, index) => (
              <li key={title}>
                <div className="alpine-step-icon"><Icon size={21}/></div>
                <span className="cloud-step-label">{`STEP ${index + 1}`}</span>
                <h3>{title}</h3>
                <p>{copy}</p>
              </li>
            ))}
          </ol>
        </Reveal>

        <Reveal className="alpine-integrations cloud-container" id="connections">
          <div className="alpine-integrations-copy">
            <span className="section-label">CONNECTIONS &amp; IMPORTS</span>
            <h2 aria-label="Bring every portfolio into one history.">Bring every portfolio<br /><em>into one history.</em></h2>
            <p>Use a named broker guide, a compatible CSV or a supported PDF statement. Start with the source you already have and keep your broker account separate.</p>
            <div className="alpine-integrations-proof"><strong>{brokers.filter((broker) => broker.id !== 'other').length}</strong><span>named broker guides<br/>plus compatible CSV imports</span></div>
            <a className="alpine-text-link" href="/features/integrations">Browse connections &amp; imports <ArrowRight size={16}/></a>
          </div>
          <div className="alpine-integrations-panel">
            <div className="alpine-integrations-head"><strong>Popular sources</strong><span>CSV · PDF · read-only sync</span></div>
            <div className="alpine-source-grid">
              {integrationBrokers.map((broker) => <div key={broker.id} className="alpine-source-item"><span>{broker.name.slice(0, 1)}</span><strong>{broker.name}</strong><small>{broker.region}</small></div>)}
            </div>
            <div className="alpine-import-note"><FileSpreadsheet size={18}/><span><strong>Another broker?</strong><small>Any compatible CSV export can get you started.</small></span></div>
          </div>
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
          <NativeGoogleSignIn busy={redirecting} onStart={() => { void beginGoogleSignIn() }}/>
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

function NativeGoogleSignIn({ busy, onStart }: { busy: boolean; onStart: () => void }) {
  return <button className="masterdeck-auth-method masterdeck-google-native" type="button" disabled={busy} onClick={onStart}>
      <span className="masterdeck-auth-method-icon masterdeck-google-icon" aria-hidden="true"><span className="masterdeck-google-letter">G</span></span>
    <span className="masterdeck-auth-method-text">{busy ? 'Opening Google sign-in…' : 'Continue with Google'}</span>
    <span className="masterdeck-auth-method-spacer" aria-hidden="true" />
  </button>
}

function Reveal({ children, className = '', id, 'aria-label': ariaLabel }: { children: ReactNode; className?: string; id?: string; 'aria-label'?: string }) {
  const reduceMotion = useReducedMotion()
  const revealRef = useRef<HTMLElement>(null)
  const [hasEntered, setHasEntered] = useState(false)
  return (
    <motion.section
      ref={revealRef}
      id={id}
      aria-label={ariaLabel}
      className={className}
      initial={reduceMotion ? false : { opacity: 0, y: 10 }}
      onViewportEnter={() => setHasEntered(true)}
      animate={reduceMotion || hasEntered ? { opacity: 1, y: 0 } : { opacity: 0, y: 10 }}
      viewport={{ once: true, amount: 0.12, margin: '0px 0px -8% 0px' }}
      transition={{ duration: reduceMotion ? 0 : 0.48, ease: [0.16, 1, 0.3, 1] }}
    >
      {children}
    </motion.section>
  )
}
