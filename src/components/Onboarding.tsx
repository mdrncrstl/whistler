import { useMemo, useState } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { ArrowLeft, ArrowRight, BarChart3, Bitcoin, BriefcaseBusiness, Building2, Check, Landmark, Layers3, ShieldCheck, Sparkles, Users } from 'lucide-react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useAccountAccess, type AssetType, type OnboardingUpdate, type PortfolioStructure, type PrimaryGoal } from '../context/AccountAccessContext'
import { Brand } from './ui'

const goals: { value: PrimaryGoal; title: string; copy: string; icon: typeof BarChart3 }[] = [
  { value: 'performance', title: 'Performance', copy: 'Returns, income and allocation.', icon: BarChart3 },
  { value: 'tax', title: 'Australian tax', copy: 'CGT, income and ATO reports.', icon: Landmark },
  { value: 'both', title: 'Both', copy: 'Performance and tax in one view.', icon: Layers3 },
]

const structures: { value: PortfolioStructure; title: string; copy: string; icon: typeof BriefcaseBusiness }[] = [
  { value: 'single', title: 'One portfolio', copy: 'Personal, trust or SMSF.', icon: BriefcaseBusiness },
  { value: 'multiple', title: 'Multiple portfolios', copy: 'Separate entities in one account.', icon: Users },
]

const assets: { value: AssetType; title: string; icon: typeof BarChart3 }[] = [
  { value: 'stocks_etfs', title: 'Stocks and ETFs', icon: BarChart3 },
  { value: 'crypto', title: 'Crypto', icon: Bitcoin },
  { value: 'managed_funds', title: 'Managed funds', icon: Landmark },
  { value: 'property', title: 'Property', icon: Building2 },
  { value: 'other', title: 'Other assets', icon: Sparkles },
]

const stepMeta = [
  { label: 'Your focus', detail: 'Choose what matters first.' },
  { label: 'Your structure', detail: 'Set up the right view.' },
  { label: 'Your assets', detail: 'Pick what you hold.' },
]

export function Onboarding() {
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const preview = params.get('preview') === '1'
  const reduceMotion = useReducedMotion()
  const { access, saveOnboarding } = useAccountAccess()
  const [step, setStep] = useState(1)
  const [goal, setGoal] = useState<PrimaryGoal | null>(access?.primary_goal || null)
  const [structure, setStructure] = useState<PortfolioStructure | null>(access?.portfolio_structure || null)
  const [selectedAssets, setSelectedAssets] = useState<AssetType[]>(access?.asset_types || [])
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const selection = useMemo<OnboardingUpdate>(() => ({ primary_goal: goal, portfolio_structure: structure, asset_types: selectedAssets }), [goal, selectedAssets, structure])
  const canContinue = step === 1 ? Boolean(goal) : step === 2 ? Boolean(structure) : selectedAssets.length > 0
  const meta = stepMeta[step - 1]

  const persist = async (complete = false) => {
    if (preview) return
    await saveOnboarding({ ...selection, ...(complete ? { onboarding_completed_at: new Date().toISOString() } : {}) })
  }

  const next = async () => {
    if (!canContinue || busy) return
    setBusy(true)
    setError('')
    try {
      const complete = step === 3
      await persist(complete)
      if (complete) navigate('/app/connections?welcome=1', { replace: true })
      else setStep((current) => Math.min(3, current + 1))
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : 'Your setup could not be saved.')
    } finally { setBusy(false) }
  }

  const skip = async () => {
    setBusy(true)
    setError('')
    try {
      await persist(true)
      navigate('/app/connections?welcome=1', { replace: true })
    } catch (skipError) {
      setError(skipError instanceof Error ? skipError.message : 'Your setup could not be saved.')
    } finally { setBusy(false) }
  }

  const toggleAsset = (value: AssetType) => setSelectedAssets((current) => current.includes(value) ? current.filter((item) => item !== value) : [...current, value])

  return <main className="onboarding-page">
    <header className="onboarding-header">
      <Brand />
      <span className="onboarding-header-meta">Setup <i aria-hidden="true">·</i> 3 quick choices</span>
    </header>

    <div className="onboarding-layout">
      <aside className="onboarding-rail" aria-label="Setup overview">
        <div>
          <p className="onboarding-eyebrow">Workspace setup</p>
          <h1>Start with a clear view of your portfolio.</h1>
          <p className="onboarding-rail-copy">A few choices now help us put performance, global holdings and Australian tax records in the right order.</p>
        </div>
        <div className="onboarding-rail-steps">
          <RailStep icon={BarChart3} title="See performance" copy="Returns, income and allocation." active={step >= 1} />
          <RailStep icon={BriefcaseBusiness} title="Organise portfolios" copy="Keep personal and entity views clear." active={step >= 2} />
          <RailStep icon={Landmark} title="Stay tax-ready" copy="Keep CGT detail close to the source." active={step >= 3} />
        </div>
        <div className="onboarding-rail-note"><ShieldCheck size={16} /><span><strong>Read-only by design.</strong> Your broker stays in control.</span></div>
      </aside>

      <section className="onboarding-card" aria-labelledby="onboarding-title">
        <div className="onboarding-panel-header">
          <div>
            <span className="onboarding-panel-kicker">Setup</span>
            <strong>{meta.label}</strong>
          </div>
          <span className="onboarding-step-count">0{step} / 03</span>
        </div>

        <div className="onboarding-progress" role="progressbar" aria-label={`Step ${step} of 3`} aria-valuemin={1} aria-valuemax={3} aria-valuenow={step}>
          {[1, 2, 3].map((item) => <span key={item} className={item <= step ? 'complete' : ''} />)}
        </div>

        <div className="onboarding-progress-row">
          <button type="button" className="onboarding-back" disabled={step === 1 || busy} onClick={() => setStep((current) => Math.max(1, current - 1))}><ArrowLeft size={14} />Back</button>
          <span>{meta.detail}</span>
        </div>

        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={step}
            className="onboarding-step"
            initial={reduceMotion ? false : { opacity: 0, x: 14 }}
            animate={{ opacity: 1, x: 0 }}
            exit={reduceMotion ? undefined : { opacity: 0, x: -10 }}
            transition={{ duration: reduceMotion ? 0.01 : 0.24, ease: [0.23, 1, 0.32, 1] }}
          >
            {step === 1 && <><h2 id="onboarding-title">What do you want to see first?</h2><p>Pick a starting point. You can use everything later.</p><div className="onboarding-options onboarding-options-goals">{goals.map((item) => <Choice key={item.value} selected={goal === item.value} title={item.title} copy={item.copy} icon={item.icon} onClick={() => setGoal(item.value)} />)}</div></>}
            {step === 2 && <><h2 id="onboarding-title">How many portfolios?</h2><p>Choose the view that matches your setup.</p><div className="onboarding-options onboarding-options-structures">{structures.map((item) => <Choice key={item.value} selected={structure === item.value} title={item.title} copy={item.copy} icon={item.icon} onClick={() => setStructure(item.value)} />)}</div></>}
            {step === 3 && <><h2 id="onboarding-title">What do you hold?</h2><p>Pick all that apply.</p><div className="onboarding-options onboarding-options-assets">{assets.map((item) => <Choice key={item.value} selected={selectedAssets.includes(item.value)} title={item.title} icon={item.icon} multi onClick={() => toggleAsset(item.value)} />)}</div><p className="onboarding-selection-note" aria-live="polite">{selectedAssets.length ? `${selectedAssets.length} selected` : 'Select at least one asset type'}</p></>}
          </motion.div>
        </AnimatePresence>

        {error && <p className="onboarding-error" role="alert">{error}</p>}
        <button type="button" className="onboarding-continue" disabled={!canContinue || busy} onClick={next}><span>{busy ? 'Saving...' : step === 3 ? 'Add my holdings' : 'Continue'}</span>{!busy && <ArrowRight size={16} />}</button>
        {step === 3 && <div className="trial-assurance"><ShieldCheck size={15} /><span>14 days free <i aria-hidden="true">·</i> No card <i aria-hidden="true">·</i> No auto-renew</span></div>}
        <button type="button" className="onboarding-skip" disabled={busy} onClick={skip}>Skip setup and add holdings</button>
      </section>
    </div>
  </main>
}

function RailStep({ icon: Icon, title, copy, active }: { icon: typeof BarChart3; title: string; copy: string; active: boolean }) {
  return <div className={`onboarding-rail-step ${active ? 'active' : ''}`}><span className="onboarding-rail-icon"><Icon size={16} /></span><span><strong>{title}</strong><small>{copy}</small></span></div>
}

function Choice({ selected, title, copy, icon: Icon, multi, onClick }: { selected: boolean; title: string; copy?: string; icon: typeof BarChart3; multi?: boolean; onClick: () => void }) {
  const reduceMotion = useReducedMotion()
  return <button type="button" className={`onboarding-choice ${selected ? 'selected' : ''}`} aria-pressed={selected} onClick={onClick}>
    <motion.span className="onboarding-choice-icon" animate={{ scale: selected ? 1.05 : 1 }} transition={{ duration: reduceMotion ? 0.01 : 0.18 }}><Icon size={17} /></motion.span>
    <span className="onboarding-choice-copy"><strong>{title}</strong>{copy && <small>{copy}</small>}</span>
    <span className={`onboarding-check ${multi ? 'multi' : ''}`}>{selected && <Check size={14} />}</span>
  </button>
}
