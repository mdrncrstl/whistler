import { MarketingNavigation } from './MarketingNavigation'
import { MarketingContent } from './MarketingContent'
import type { MarketingPage } from '../lib/marketingPages'
import { marketingGroups, marketingPages } from '../lib/marketingPages'
import { config } from '../lib/config'
import {
  ArrowLeft, ArrowRight, BarChart3, Check, ChevronDown, Database, Eye, EyeOff,
  FileCheck2, FileSpreadsheet, Gauge, Globe2, Link2, LockKeyhole, Mail, Menu,
  ShieldCheck, TrendingUp, X,
} from 'lucide-react'
import { AnimatePresence, motion, useMotionValueEvent, useReducedMotion, useScroll } from 'framer-motion'
import { useEffect, useRef, useState, type FormEvent, type ReactNode } from 'react'
import { GoogleLogin, type CredentialResponse } from '@react-oauth/google'
import { annualSavingsPercent, billingPlans, formatAud } from '../lib/billing'
import { brokers, type Broker } from '../lib/brokers'
import { captureDemoLead, clearPendingDemoIntent, savePendingDemoIntent } from '../lib/demo-leads'
import { authClient } from '../lib/supabase'
import { applySeo } from '../lib/seo'
import { canonicalAppUrl } from '../lib/app-origin'
import { Brand, MotionDialogSurface, SlidingTabs } from './ui-Wifi-G'

const howItWorks = [
  { title: 'Bring in your records', copy: 'Connect a supported source or upload your broker statement.', icon: Link2 },
  { title: 'Review the import', copy: 'Check your holdings and trades, then confirm the import.', icon: FileCheck2 },
  { title: 'Read the reports', copy: 'Explore your returns, income and Australian tax records.', icon: BarChart3 },
] as const

const clarityViews = [
  { title: 'What do I own?', copy: 'See holdings across your accounts in one place.', icon: Globe2 },
  { title: 'What changed?', copy: 'Separate capital growth, income and currency effects.', icon: TrendingUp },
  { title: 'What does it mean for tax?', copy: 'Review Australian tax records with the transactions behind them.', icon: FileCheck2 },
] as const

const supportedBrokers = brokers.filter((broker) => broker.id !== 'other')
const integrationBrokers = supportedBrokers.slice(0, 10)

const brokerLogoDomains: Partial<Record<Broker['id'], string>> = {
  ibkr: 'interactivebrokers.com',
  superhero: 'superhero.com.au',
  commsec: 'commsec.com.au',
  selfwealth: 'selfwealth.com.au',
  pearler: 'pearler.com',
  'stake-au': 'hellostake.com',
  nabtrade: 'nabtrade.com.au',
  cmc: 'cmcmarkets.com.au',
  westpac: 'westpac.com.au',
  anz: 'anz.com.au',
  'bell-direct': 'belldirect.com.au',
  macquarie: 'macquarie.com.au',
  betashares: 'betashares.com.au',
  'vanguard-au': 'vanguard.com.au',
  raiz: 'raiz.com.au',
  'sharesies-au': 'sharesies.com.au',
  'stake-us': 'hellostake.com',
  moomoo: 'moomoo.com',
  webull: 'webull.com',
  schwab: 'schwab.com',
  fidelity: 'fidelity.com',
  robinhood: 'robinhood.com',
  etrade: 'etrade.com',
  'vanguard-us': 'investor.vanguard.com',
  degiro: 'degiro.com',
  saxo: 'home.saxo',
  wealthsimple: 'wealthsimple.com',
  hatch: 'hatchinvest.nz',
}

function brokerLogoSources(broker: Broker) {
  const domain = brokerLogoDomains[broker.id]
  if (!domain) return []
  const logoDevKey = import.meta.env.VITE_LOGO_DEV_PUBLIC_KEY?.trim()
  return [
    ...(logoDevKey ? [`https://img.logo.dev/${encodeURIComponent(domain)}?token=${encodeURIComponent(logoDevKey)}&size=128&format=png&retina=true&fallback=404`] : []),
    `https://www.google.com/s2/favicons?domain=${encodeURIComponent(domain)}&sz=128`,
  ]
}

function BrokerLogo({ broker, size = 28 }: { broker: Broker; size?: number }) {
  const sources = brokerLogoSources(broker)
  const [sourceIndex, setSourceIndex] = useState(0)
  const source = sources[sourceIndex]
  return (
    <span className="alpine-broker-logo" style={{ width: size, height: size }} aria-hidden="true">
      {source ? <img src={source} alt="" onError={() => setSourceIndex((current) => current + 1)} /> : <span>{broker.name.slice(0, 2).toUpperCase()}</span>}
    </span>
  )
}

const faqs = [
  ['Is Masterdeck a broker?', 'No. Masterdeck tracks and analyses portfolios. It cannot hold assets, move money or place trades.'],
  ['Which accounts can I connect?', 'Bring records from named broker formats, any broker that exports CSV, and supported PDF statements. Where a direct read-only sync is available, it is optional; every import is reviewed before it is saved.'],
  ['Does it work for global portfolios?', 'Track performance, income, currency and allocation for supported global holdings, with dedicated Australian CGT records.'],
  ['Can I try it before paying?', 'Yes. Create a free account to open the demo, or start a 14-day trial when you are ready to add your own records. Neither requires a credit card or creates an automatic charge.'],
] as const

const principleRows = [
  ['Separate the return', 'Capital growth, income and currency effects stay visible as distinct parts of the answer.', TrendingUp],
  ['Keep the source close', 'Every report stays connected to the holdings, transactions and statements beneath it.', Database],
  ['Stay read-only', 'Masterdeck analyses records. It does not hold assets, move money or place trades.', ShieldCheck],
] as const

const investorPerspectives = [
  {
    title: 'Finally got rid of my portfolio spreadsheet',
    quote: 'I had investments split between IBKR and a couple of other accounts, so figuring out my actual performance was always a pain. Having everything together and being able to see returns without rebuilding it in Excel has been really useful.',
    reviewer: 'James R.',
    role: 'Self-directed investor, Melbourne',
  },
  {
    title: 'Made my actual returns much clearer',
    quote: 'I realised I was looking at my portfolio balance rather than properly separating deposits from investment performance. The returns page made it much easier to see what was actually driving the result.',
    reviewer: 'Sophie N.',
    role: 'Long-term investor',
  },
  {
    title: 'I can actually see where the numbers come from',
    quote: 'The thing I like most is being able to click into a figure and see the transactions behind it. I still use my brokers normally, but Masterdeck gives me a much better overall view.',
    reviewer: 'Daniel K.',
    role: 'Portfolio investor',
  },
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
  const [pendingDemo, setPendingDemo] = useState(false)
  const [marketingOptIn, setMarketingOptIn] = useState(false)
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
  useEffect(() => {
    if (!mobileOpen) return
    const closeOutside = (event: PointerEvent) => { if (!(event.target as Element).closest('.cloud-header')) setMobileOpen(false) }
    const escape = (event: KeyboardEvent) => { if (event.key === 'Escape') { setMobileOpen(false); document.querySelector<HTMLButtonElement>('.cloud-menu')?.focus() } }
    const resize = () => { if (window.innerWidth > 860) setMobileOpen(false) }
    document.addEventListener('pointerdown', closeOutside)
    document.addEventListener('keydown', escape)
    window.addEventListener('resize', resize)
    return () => { document.removeEventListener('pointerdown', closeOutside); document.removeEventListener('keydown', escape); window.removeEventListener('resize', resize) }
  }, [mobileOpen])
  const [annual, setAnnual] = useState(true)
  const [openFaq, setOpenFaq] = useState(0)
  const [headerScrolled, setHeaderScrolled] = useState(false)
  const { scrollY } = useScroll()

  useMotionValueEvent(scrollY, 'change', (currentScrollY) => {
    setHeaderScrolled(currentScrollY > 16)
  })

  const openAuthentication = (mode: 'signin' | 'signup', intent: 'account' | 'demo' = 'account') => {
    setMobileOpen(false)
    if (signedIn) {
      if (intent === 'demo') void launchDemo()
      else onOpenApp?.()
      return
    }
    const isDemoIntent = intent === 'demo'
    setPendingDemo(isDemoIntent)
    if (isDemoIntent) savePendingDemoIntent(false)
    else clearPendingDemoIntent()
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
    setPendingDemo(false)
    clearPendingDemoIntent()
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

  const launchDemo = async () => {
    setRedirecting(true)
    setError('')
    setNotice('')
    try {
      try {
        await captureDemoLead(marketingOptIn)
      } catch {
        // Supabase Auth has already recorded the account email. Keep demo access
        // available if the optional lead-capture function is temporarily down.
      }
      onDemo()
      setPendingDemo(false)
      clearPendingDemoIntent()
      setSignInOpen(false)
      setPassword('')
      onOpenApp?.()
    } catch {
      setError('We could not save your demo access. Please try again.')
    } finally {
      setRedirecting(false)
    }
  }

  const finishAuthentication = async () => {
    if (pendingDemo) {
      await launchDemo()
      return
    }
    setSignInOpen(false)
    setPassword('')
    setRedirecting(false)
    onOpenApp?.()
  }

  const openDemo = () => {
    setMobileOpen(false)
    if (signedIn) {
      void launchDemo()
      return
    }
    setMarketingOptIn(false)
    openAuthentication('signup', 'demo')
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
      await finishAuthentication()
      return
    }

    const { data, error: signUpError } = await authClient.auth.signUp({
      email: cleanEmail,
      password,
      options: { emailRedirectTo: canonicalAppUrl('/auth/callback') },
    })
    if (signUpError) {
      setError(friendlyAuthError(signUpError.message))
      setRedirecting(false)
      return
    }
    if (data.session) {
      await finishAuthentication()
      return
    }
    setPassword('')
    setNotice('Check ' + cleanEmail + ' for your confirmation link.')
    setRedirecting(false)
  }

  const completeGoogleSignIn = async ({ credential }: CredentialResponse) => {
    setRedirecting(true)
    setError('')
    setNotice('')
    try {
      if (!credential) throw new Error('Google did not return a sign-in credential.')
      const { error: signInError } = await authClient.auth.signInWithIdToken({ provider: 'google', token: credential })
      if (signInError) throw signInError
      await finishAuthentication()
    } catch { setError('Google sign-in could not be completed. Please try again.'); setRedirecting(false) }
  }

  const handleGoogleSignInError = () => {
    setError('Google sign-in could not be completed. Please try again.')
    setRedirecting(false)
  }

  const beginAppleSignIn = async () => {
    setRedirecting(true)
    setError('')
    try {
      const response = await fetch(`${config.authUrl}/auth/v1/settings`, { headers: { apikey: config.authKey } })
      const settings = await response.json()
      if (!response.ok || !settings.external?.apple) throw new Error('Apple sign-in is not available yet. Please use Google or email.')
      const { error: signInError } = await authClient.auth.signInWithOAuth({ provider: 'apple', options: { redirectTo: canonicalAppUrl('/auth/callback') } })
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
          <button className="cloud-menu" aria-label="Toggle mobile menu" aria-controls="mobile-navigation" aria-expanded={mobileOpen} onClick={() => setMobileOpen(!mobileOpen)}>
            {mobileOpen ? <X /> : <Menu />}
          </button>
        </div>
        <AnimatePresence initial={false}>
          {mobileOpen && (
            <motion.nav
              className="cloud-mobile-nav"
              id="mobile-navigation"
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

      {page ? <MarketingContent page={page} onStart={() => openAuthentication('signup')} onDemo={openDemo} /> : <main id="top">
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
              {!signedIn && <button className="cloud-button cloud-button-outline-light" onClick={openDemo}>Explore the demo</button>}
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
            <img className="trustpilot-wordmark" src="https://cdn.trustpilot.net/brand-assets/4.1.0/logo-black.svg" alt="Trustpilot" width="130" height="32"/>
            <h2 id="trustpilot-heading">Investor perspectives</h2>
            <p className="review-preview-note">4.7 / 5 rating shown while verified customer feedback is being collected.</p>
            <div className="alpine-trustpilot-rating"><strong>4.7 <small>/ 5</small></strong><img src="https://cdn.trustpilot.net/brand-assets/4.1.0/stars/stars-5.svg" alt="Five-star Trustpilot rating" width="120" height="23"/></div>
          </div>
          <div className="alpine-trustpilot-reviews">
            {investorPerspectives.map((review) => (
              <article key={review.title}>
                <img src="https://cdn.trustpilot.net/brand-assets/4.1.0/stars/stars-5.svg" alt="Five-star Trustpilot rating" width="100" height="19"/>
                <h3>{review.title}</h3>
                <blockquote>{review.quote}</blockquote>
                <cite><strong>{review.reviewer}</strong><span>{review.role}</span></cite>
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
        <Reveal className="alpine-clarity-section cloud-container" aria-labelledby="clarity-heading">
          <div className="alpine-clarity-copy">
            <h2 id="clarity-heading">See the result. Follow the reason.</h2>
            <p>A portfolio number is only useful when you can explain it. Masterdeck keeps holdings, transactions, income and Australian tax records connected across the views you use to understand what changed.</p>
          </div>
          <div className="alpine-clarity-list" aria-label="Questions Masterdeck helps answer">
            <div className="alpine-clarity-list-header">THE VIEWS BEHIND THE NUMBER</div>
            {clarityViews.map(({ title, copy, icon: Icon }, index) => (
              <div className="alpine-clarity-row" key={title}>
                <span className="alpine-clarity-number">{`0${index + 1}`}</span>
                <span className="alpine-clarity-icon"><Icon size={19} /></span>
                <div><strong>{title}</strong><p>{copy}</p></div>
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

            <h2>Understand what is really driving the result.</h2>
            <p>Separate capital growth, income and currency effects, then compare the result with a benchmark without losing the records beneath it.</p>
            <a className="alpine-text-link" href="/features/performance">Explore performance <ArrowRight size={16}/></a>
          </div>
          <figure><img src="/marketing/performance-focus.png" width="2754" height="1400" alt="Masterdeck performance view showing return components and a benchmark" loading="lazy"/></figure>
        </Reveal>

        <Reveal className="alpine-proof-section alpine-proof-section-reverse cloud-container">
          <figure><img src="/marketing/tax-focus.png" width="2754" height="1300" alt="Masterdeck Australian tax view with connected investment records" loading="lazy"/></figure>
          <div className="alpine-proof-copy">

            <h2>Keep the tax detail close to the trades.</h2>
            <p>Review disposals, parcel history and recorded income in the same workspace as the portfolio that produced them.</p>
            <a className="alpine-text-link" href="/features/australian-tax">Explore Australian tax records <ArrowRight size={16}/></a>
          </div>
        </Reveal>

        <section className="alpine-mid-cta"><div className="alpine-cta-inner"><h2>A clearer view starts here.</h2><p>Bring your records. Find your perspective.</p><button className="cloud-button cloud-button-light" onClick={() => openAuthentication('signup')}>{signupLabel}</button></div></section>
        <Reveal className="cloud-principles">
          <div className="cloud-container cloud-principles-layout">
            <div className="cloud-principles-intro">
              <h2>The full picture. Down to the detail.</h2>
              <p>Understand your returns, trace the records and keep your accounts in your control.</p>
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
            <p>From broker records to portfolio insights in three steps.</p>
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
              {integrationBrokers.map((broker) => <div key={broker.id} className="alpine-source-item"><BrokerLogo broker={broker}/><strong>{broker.name}</strong><small>{broker.region}</small></div>)}
            </div>
            <div className="alpine-import-note"><FileSpreadsheet size={18}/><span><strong>Another broker?</strong><small>Any compatible CSV export can get you started.</small></span></div>
          </div>
        </Reveal>

        <Reveal className="alpine-broker-rail" aria-label="Supported broker formats">
          <div className="alpine-broker-rail-intro cloud-container">
            <span className="section-label">SUPPORTED SOURCES</span>
            <h2>Recognise your broker.</h2>
            <p>Bring records from 28 named brokers, or start with a compatible CSV export.</p>
          </div>
          <div className="alpine-broker-marquee" aria-label="Supported brokers">
            <div className="alpine-broker-marquee-track">
              {[supportedBrokers, supportedBrokers].map((brokerList, listIndex) => (
                <div className="alpine-broker-marquee-list" key={listIndex} role="list" aria-hidden={listIndex === 1}>
                  {brokerList.map((broker) => (
                    <div className="alpine-broker-chip" key={`${listIndex}-${broker.id}`} role="listitem">
                      <BrokerLogo broker={broker} size={34}/>
                      <span>{broker.name}</span>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </div>
          <p className="alpine-broker-rail-note">Interactive Brokers supports optional read-only sync. Other listed sources use statement or CSV imports.</p>
        </Reveal>

        <Reveal className="cloud-pricing cloud-container" id="pricing">
          <div className="cloud-pricing-head">
            <div className="cloud-section-intro">
              <h2 aria-label="Clear pricing. Try it before you pay.">Clear pricing.<br /><em>Try it before you pay.</em></h2>
            </div>
            <div className="cloud-pricing-copy">
              <p><strong>Try every plan free for 14 days.</strong><br />No card required. Cancel anytime.</p>
              <SlidingTabs className="cloud-billing-toggle" options={[{ value: 'monthly', label: 'Monthly' }, { value: 'annual', label: <>Annual <span>save 26%</span></> }]} value={annual ? 'annual' : 'monthly'} onChange={(value) => setAnnual(value === 'annual')} ariaLabel="Billing period" />
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

        <Reveal className={`cloud-final${signedIn ? ' is-signed-in' : ''}`}>
          <div className="cloud-container cloud-final-inner">

            <h2>{signedIn ? 'Your portfolio is ready.' : 'Your portfolio should make sense.'}</h2>
            <p>{signedIn ? 'Pick up where you left off.' : 'Give Masterdeck the records. Get back the full picture.'}</p>
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
        <p>{pendingDemo ? 'Create or use your free account to open the demo.' : authMode === 'signin' ? 'Welcome back. Choose how to sign in.' : 'Try Masterdeck free for 14 days. No card or automatic charge.'}</p>
        <div className="masterdeck-auth-tabs" role="tablist" aria-label="Email authentication">
          <button type="button" role="tab" aria-selected={authMode === 'signin'} onClick={() => switchAuthMode('signin')}>Sign in</button>
          <button type="button" role="tab" aria-selected={authMode === 'signup'} onClick={() => switchAuthMode('signup')}>Create account</button>
        </div>
        <div className="masterdeck-auth-methods" aria-label="Choose a sign-in method">
          <NativeGoogleSignIn busy={redirecting} onSuccess={(response) => { void completeGoogleSignIn(response) }} onError={handleGoogleSignInError} />
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
        {pendingDemo && <label className="masterdeck-marketing-consent">
          <input type="checkbox" checked={marketingOptIn} onChange={(event) => { setMarketingOptIn(event.target.checked); savePendingDemoIntent(event.target.checked) }} />
          <span>Send me occasional Masterdeck tips and product updates.</span>
        </label>}
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

function NativeGoogleSignIn({ busy, onSuccess, onError }: {
  busy: boolean
  onSuccess: (response: CredentialResponse) => void
  onError: () => void
}) {
  return <div className="masterdeck-google-native" aria-busy={busy} data-testid="google-signin-control">
    <GoogleLogin
      onSuccess={onSuccess}
      onError={onError}
      text="continue_with"
      theme="outline"
      size="large"
      shape="rectangular"
      logo_alignment="left"
      width="400"
      containerProps={{ className: 'masterdeck-google-gsi' }}
    />
    {busy && <span className="masterdeck-google-status" role="status">Finishing sign-in…</span>}
  </div>
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
