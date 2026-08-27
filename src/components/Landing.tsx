import {
  ArrowRight, BarChart3, Check, ChevronDown, FileCheck2, FileSpreadsheet, Gauge, Landmark,
  Layers3, LockKeyhole, Mail, Menu, ShieldCheck, Sparkles, X,
} from 'lucide-react'
import { useState, type ReactNode } from 'react'
import { billingPlans } from '../lib/billing'
import { authClient } from '../lib/supabase'
import { Brand, MotionPopover } from './ui'

const benefits = ['Track every holding in one view', 'Measure your real returns', 'Prepare Australian tax reports', 'Keep broker access read-only']
const featureGroups = [
  { title: 'Portfolio intelligence', detail: 'Tracking · performance · benchmarks' },
  { title: 'Tax reporting', detail: 'Capital gains · MyTax · valuations' },
  { title: 'Income & tools', detail: 'Income calendar · Deck AI · inbox' },
]
const faqs = [
  ['Is Masterdeck a broker?', 'No. Masterdeck is portfolio tracking and reporting software. It cannot hold your assets, move money or place trades.'],
  ['Which accounts can I connect?', 'Masterdeck currently supports Interactive Brokers Flex data and Superhero reports, including an optional read-only Gmail import. Manual file import is also available.'],
  ['Does Masterdeck provide tax advice?', 'No. Tax screens are record-keeping estimates designed to help you and your tax professional. They are not personal tax advice.'],
  ['How does Google access work?', 'Google sign-in creates your Masterdeck account. Gmail import is a separate, optional consent flow and is never granted by signing in.'],
  ['Are my broker passwords stored?', 'No. Masterdeck does not scrape or store broker passwords. Connected workflows use reports or read-only data access.'],
  ['Can I try it before paying?', 'Yes. Open the populated demo without an account, or create your own workspace and review the available plan before checkout.'],
]

type LandingProps = { onDemo: () => void; signedIn?: boolean; onOpenApp?: () => void }

export function Landing({ onDemo, signedIn = false, onOpenApp }: LandingProps) {
  const [error, setError] = useState('')
  const [redirecting, setRedirecting] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [menu, setMenu] = useState(false)
  const [annual, setAnnual] = useState(true)
  const [openFaq, setOpenFaq] = useState(0)

  const beginGoogleSignIn = async () => {
    if (signedIn) { onOpenApp?.(); return }
    setRedirecting(true); setError('')
    const { error: signInError } = await authClient.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: `${window.location.origin}/auth/callback`, queryParams: { prompt: 'select_account' } } })
    if (signInError) { setError(signInError.message); setRedirecting(false) }
  }
  const enterDemo = () => { onDemo(); window.location.assign('/app') }
  const primaryLabel = signedIn ? 'Open Masterdeck' : redirecting ? 'Opening sign-in…' : 'Start free'

  return <div className="marketing-page">
    <header className="marketing-header">
      <div className="marketing-nav-wrap">
        <a href="#top" aria-label="Masterdeck home"><Brand /></a>
        <nav className="marketing-desktop-nav" aria-label="Main navigation">
          <div className="marketing-menu-wrap"><button aria-expanded={menu} onClick={() => setMenu(!menu)}>Features <ChevronDown /></button><MotionPopover open={menu} className="marketing-dropdown" origin="top left"><strong>Explore Masterdeck</strong>{featureGroups.map(group => <a key={group.title} href="#features" onClick={() => setMenu(false)}><span>{group.title}</span><small>{group.detail}</small></a>)}</MotionPopover></div>
          <a href="#how-it-works">How it works</a><a href="#integrations">Connections</a><a href="#pricing">Pricing</a><a href="#faq">FAQ</a>
        </nav>
        <div className="marketing-nav-actions"><button className="marketing-login" onClick={beginGoogleSignIn}>{signedIn ? 'Open app' : 'Log in'}</button><button className="marketing-button small" onClick={beginGoogleSignIn} disabled={redirecting}>{primaryLabel} <ArrowRight /></button></div>
        <button className="marketing-menu-button" aria-label="Toggle mobile menu" aria-expanded={mobileOpen} onClick={() => setMobileOpen(!mobileOpen)}>{mobileOpen ? <X /> : <Menu />}</button>
      </div>
      {mobileOpen && <nav className="marketing-mobile-nav" aria-label="Mobile navigation"><a href="#features" onClick={() => setMobileOpen(false)}>Features</a><a href="#how-it-works" onClick={() => setMobileOpen(false)}>How it works</a><a href="#integrations" onClick={() => setMobileOpen(false)}>Connections</a><a href="#pricing" onClick={() => setMobileOpen(false)}>Pricing</a><a href="#faq" onClick={() => setMobileOpen(false)}>FAQ</a><button className="marketing-button" onClick={beginGoogleSignIn}>{primaryLabel} <ArrowRight /></button><button className="marketing-login" onClick={beginGoogleSignIn}>{signedIn ? 'Open app' : 'Log in'}</button></nav>}
    </header>

    <main id="top">
      <section className="marketing-hero marketing-container">
        <p className="marketing-eyebrow"><span /> Built for Australian investors</p>
        <h1>Know what your portfolio is <em>really</em> doing.</h1>
        <p className="marketing-lead">Masterdeck turns scattered broker activity into one clear view of performance, income and Australian tax records.</p>
        <div className="marketing-checks">{benefits.map(item => <span key={item}><Check />{item}</span>)}</div>
        <div className="marketing-hero-actions"><button className="marketing-button" onClick={beginGoogleSignIn} disabled={redirecting}>{primaryLabel} <ArrowRight /></button><button className="marketing-button secondary" onClick={enterDemo}>Explore the demo</button></div>
        {error && <p className="marketing-error" role="alert">{error}</p>}
        <p className="marketing-trust"><ShieldCheck /> Independent Masterdeck account · No card required to explore</p>
        <ProductShot src="/marketing/portfolio.png" alt="Masterdeck portfolio overview with performance chart and holdings table" hero />
      </section>

      <section className="marketing-proof"><div className="marketing-container marketing-proof-grid"><div><strong>21</strong><span>deep portfolio and report views</span></div><div><strong>2</strong><span>supported broker workflows</span></div><div><strong>4</strong><span>tax-lot strategies to compare</span></div><div><strong>100%</strong><span>read-only portfolio tracking</span></div></div><p>Illustrative product capabilities. Market values and tax estimates depend on imported data.</p></section>

      <section className="marketing-section marketing-container"><SectionIntro eyebrow="A focused job" title="Portfolio clarity without becoming your broker." copy="Masterdeck is designed to organise, analyse and explain your investment history—not to take custody of it." /><div className="marketing-do-grid"><article className="marketing-do"><h3>What Masterdeck does</h3>{['Unifies supported broker activity','Analyses performance and benchmarks','Builds Australian tax-reporting views','Tracks income, allocation and goals','Lets you explore parcel strategies'].map(x => <p key={x}><Check />{x}</p>)}</article><article className="marketing-dont"><h3>What Masterdeck does not do</h3>{['Hold your investments or cash','Place or recommend trades','Store broker passwords','Provide personal financial advice','Replace a registered tax professional'].map(x => <p key={x}><X />{x}</p>)}</article></div></section>

      <section id="how-it-works" className="marketing-section marketing-tint"><div className="marketing-container"><SectionIntro eyebrow="How it works" title="From broker files to a useful answer in three steps." copy="Start in the demo, then connect your own supported data when you are ready." /><div className="marketing-steps"><article><span>01</span><FileSpreadsheet /><h3>Connect or import</h3><p>Add an Interactive Brokers Flex connection or import Superhero activity.</p></article><article><span>02</span><Layers3 /><h3>Masterdeck organises it</h3><p>Trades, income, cash and FX are normalised into a single portfolio history.</p></article><article><span>03</span><Gauge /><h3>See the full picture</h3><p>Inspect returns, tax parcels, income, allocation and detailed ledgers.</p></article></div></div></section>

      <section id="features" className="marketing-section marketing-container marketing-features">
        <Feature icon={<BarChart3 />} eyebrow="Portfolio tracking" title="Holdings and returns in one working view." copy="Follow portfolio value, capital gains, income and currency effects from a dense dashboard built for actual analysis." shot="/marketing/portfolio.png" alt="Masterdeck holdings and portfolio performance screen" />
        <Feature reverse icon={<Gauge />} eyebrow="Performance reporting" title="Interrogate performance instead of accepting one number." copy="Compare periods, benchmarks, contribution and return drivers across a complete report suite." shot="/marketing/performance.png" alt="Masterdeck performance breakdown report" />
        <Feature icon={<FileCheck2 />} eyebrow="Australian tax records" title="Move from trade history to tax-time detail." copy="Review matched disposals, taxable income, MyTax fields, valuations, unrealised gains and historical cost—with assumptions made explicit." shot="/marketing/benchmark.png" alt="Masterdeck detailed report with chart and ledgers" />
      </section>

      <section className="marketing-dark-cta"><div className="marketing-container"><div><p className="marketing-eyebrow">Your data, made legible</p><h2>Ready to see the whole portfolio?</h2></div><div><button className="marketing-button light" onClick={beginGoogleSignIn}>{primaryLabel} <ArrowRight /></button><button className="marketing-button dark-secondary" onClick={enterDemo}>Explore demo</button></div></div></section>

      <section id="pricing" className="marketing-section marketing-container"><SectionIntro eyebrow="Straightforward pricing" title="Full portfolio intelligence, priced lower." copy="Annual plan prices are 30% below comparable Navexa annual tiers. All prices are AUD." /><div className="marketing-billing-toggle" aria-label="Billing period"><button aria-pressed={!annual} className={!annual ? 'active' : ''} onClick={() => setAnnual(false)}>Monthly</button><button aria-pressed={annual} className={annual ? 'active' : ''} onClick={() => setAnnual(true)}>Annual <span>save up to 23%</span></button></div><div className="marketing-pricing-grid">{billingPlans.map(plan => <article key={plan.id} className={plan.featured ? 'featured' : ''}>{plan.featured && <span className="marketing-plan-badge">Most popular</span>}<h3>{plan.name}</h3><p>Up to {plan.portfolios} {plan.portfolios === 1 ? 'portfolio' : 'portfolios'}</p><div className="marketing-price"><strong>${annual ? plan.annual : plan.monthly}</strong><span>AUD / month</span></div><small>{annual ? `$${plan.annual * 12} billed annually` : 'Billed monthly'}</small><button className="marketing-button" onClick={beginGoogleSignIn}>Choose {plan.name}</button><ul>{plan.features.map(item => <li key={item}><Check />{item}</li>)}</ul></article>)}</div></section>

      <section id="integrations" className="marketing-section marketing-tint"><div className="marketing-container"><SectionIntro eyebrow="Connections" title="Start with the broker workflows Masterdeck supports today." copy="No inflated logo wall. Each option below maps to a real import path in the product." /><div className="marketing-integrations"><article><Landmark /><div><h3>Interactive Brokers</h3><p>Read-only Flex data workflow</p></div><span>Direct</span></article><article><FileSpreadsheet /><div><h3>Superhero</h3><p>Transaction and activity reports</p></div><span>Import</span></article><article><Mail /><div><h3>Superhero Gmail</h3><p>Separate optional read-only consent</p></div><span>Optional</span></article><article><Layers3 /><div><h3>Manual records</h3><p>Guided file imports and review</p></div><span>Available</span></article></div></div></section>

      <section className="marketing-section marketing-container"><SectionIntro eyebrow="Built around the work" title="The depth spreadsheets struggle to maintain." copy="Masterdeck combines repeatable calculations with the interface needed to inspect them." /><div className="marketing-compare" role="table" aria-label="Portfolio tool comparison"><div role="row"><strong role="columnheader">Capability</strong><strong role="columnheader">Spreadsheet</strong><strong role="columnheader">Typical tracker</strong><strong role="columnheader">Masterdeck</strong></div>{[['Australian CGT parcel methods','Manual','Limited','Included'],['Performance and benchmark reports','Manual','Varies','Included'],['Income and tax schedules','Manual','Varies','Included'],['Explainable source ledgers','You build it','Limited','Included'],['Broker password custody','None','Varies','None']].map(row => <div role="row" key={row[0]}>{row.map((cell, i) => <span role="cell" key={`${cell}-${i}`} className={i === 3 ? 'masterdeck-cell' : ''}>{i === 3 && <Check />}{cell}</span>)}</div>)}</div></section>

      <section id="faq" className="marketing-section marketing-tint"><div className="marketing-container marketing-faq-wrap"><SectionIntro eyebrow="FAQ" title="Questions worth answering before you connect anything." /><div className="marketing-faq">{faqs.map(([question, answer], index) => <article key={question}><button aria-expanded={openFaq === index} aria-controls={`faq-${index}`} onClick={() => setOpenFaq(openFaq === index ? -1 : index)}><span>{question}</span><ChevronDown /></button>{openFaq === index && <p id={`faq-${index}`}>{answer}</p>}</article>)}</div></div></section>

      <section className="marketing-final"><div className="marketing-container"><Sparkles /><h2>Stop piecing it together.<br />Start knowing.</h2><p>Open the full demo now, or sign in to create your own independent Masterdeck workspace.</p><div><button className="marketing-button light" onClick={beginGoogleSignIn}>{primaryLabel} <ArrowRight /></button><button className="marketing-button dark-secondary" onClick={enterDemo}>Explore demo</button></div></div></section>
    </main>

    <footer className="marketing-footer"><div className="marketing-container marketing-footer-grid"><div><Brand /><p>Portfolio tracking, performance analysis and Australian investment record keeping.</p><span><LockKeyhole /> Read-only by design</span></div><div><strong>Product</strong><a href="#features">Features</a><a href="#integrations">Connections</a><a href="#pricing">Pricing</a></div><div><strong>Learn</strong><a href="#how-it-works">How it works</a><a href="#faq">FAQ</a><button onClick={enterDemo}>Product demo</button></div><div><strong>Account</strong><button onClick={beginGoogleSignIn}>{signedIn ? 'Open app' : 'Log in'}</button><button onClick={beginGoogleSignIn}>Start free</button></div></div><div className="marketing-container marketing-legal"><p>Masterdeck provides software for portfolio record keeping and analysis. It does not provide financial, legal or tax advice. Verify outputs with source records and a qualified professional.</p><span>© 2026 Masterdeck</span></div></footer>
  </div>
}

function SectionIntro({ eyebrow, title, copy }: { eyebrow: string; title: string; copy?: string }) { return <div className="marketing-section-intro"><p className="marketing-eyebrow">{eyebrow}</p><h2>{title}</h2>{copy && <p>{copy}</p>}</div> }
function ProductShot({ src, alt, hero = false }: { src: string; alt: string; hero?: boolean }) { return <figure className={`marketing-product-shot ${hero ? 'hero' : ''}`}><div><i /><i /><i /><span>masterdeck.app</span></div><img src={src} alt={alt} /></figure> }
function Feature({ icon, eyebrow, title, copy, shot, alt, reverse = false }: { icon: ReactNode; eyebrow: string; title: string; copy: string; shot: string; alt: string; reverse?: boolean }) { return <article className={`marketing-feature ${reverse ? 'reverse' : ''}`}><div className="marketing-feature-copy"><span className="marketing-feature-icon">{icon}</span><p className="marketing-eyebrow">{eyebrow}</p><h2>{title}</h2><p>{copy}</p><a href="#pricing">See plans <ArrowRight /></a></div><ProductShot src={shot} alt={alt} /></article> }
