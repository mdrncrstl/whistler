import {
  ArrowUpRight,
  Calculator,
  Check,
  CreditCard,
  Database,
  Eye,
  EyeOff,
  Gift,
  Link2,
  LockKeyhole,
  LogOut,
  Mail,
  Rows3,
  Save,
  ShieldCheck,
  SlidersHorizontal,
  UserRound,
  WalletCards,
  type LucideIcon,
} from 'lucide-react'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { Link } from 'react-router-dom'
import { useMemo, useState } from 'react'
import { usePortfolio } from '../context/PortfolioContext'
import { useAccountAccess } from '../context/AccountAccessContext'
import { useBillingStatus } from '../hooks/useBillingStatus'
import { planForSubscription } from '../lib/billing'
import { authClient } from '../lib/supabase'
import type { TaxMethod } from '../types'
import { Badge, Button, PageHeader, Select } from '../components/ui'

type SettingsSection = 'account' | 'portfolio' | 'data' | 'security' | 'billing'

const settingsSections: Array<{ id: SettingsSection; label: string; description: string; icon: LucideIcon }> = [
  { id: 'account', label: 'Account', description: 'Identity and profile', icon: UserRound },
  { id: 'portfolio', label: 'Portfolio preferences', description: 'Display and tax defaults', icon: SlidersHorizontal },
  { id: 'data', label: 'Data & connections', description: 'Imports and permissions', icon: Database },
  { id: 'security', label: 'Security', description: 'Session and safeguards', icon: ShieldCheck },
  { id: 'billing', label: 'Plan & billing', description: 'Subscription and referrals', icon: CreditCard },
]

export function Settings({ onExitDemo }: { onExitDemo: () => void }) {
  const { bundle, demo, action, updateProfile, session } = usePortfolio()
  const profile = bundle.profile
  return <SettingsForm key={`${profile?.id}-${profile?.full_name}-${JSON.stringify(profile?.settings || {})}`} profile={profile} demo={demo} action={action} updateProfile={updateProfile} onExitDemo={onExitDemo} session={session} />
}

function SettingsForm({ profile, demo, action, updateProfile, onExitDemo, session }: {
  profile: ReturnType<typeof usePortfolio>['bundle']['profile']
  demo: boolean
  action: string | null
  updateProfile: ReturnType<typeof usePortfolio>['updateProfile']
  session: ReturnType<typeof usePortfolio>['session']
  onExitDemo: () => void
}) {
  const reduceMotion = useReducedMotion()
  const { trialActive, trialExpired, trialDaysRemaining } = useAccountAccess()
  const { subscription, loading: billingLoading } = useBillingStatus(session, demo)
  const billingPlan = planForSubscription(subscription?.plan)
  const paid = subscription?.status === 'active' || subscription?.status === 'trialing'
  const [activeSection, setActiveSection] = useState<SettingsSection>('account')
  const [name, setName] = useState(profile?.full_name || '')
  const [privacyMode, setPrivacyMode] = useState(Boolean(profile?.settings?.privacyMode))
  const [compactTables, setCompactTables] = useState(Boolean(profile?.settings?.compactTables))
  const [method, setMethod] = useState<TaxMethod>(profile?.settings?.defaultTaxMethod || 'fifo')
  const [savedState, setSavedState] = useState({
    name: profile?.full_name || '',
    privacyMode: Boolean(profile?.settings?.privacyMode),
    compactTables: Boolean(profile?.settings?.compactTables),
    method: profile?.settings?.defaultTaxMethod || 'fifo' as TaxMethod,
  })

  const dirty = name.trim() !== savedState.name || privacyMode !== savedState.privacyMode || compactTables !== savedState.compactTables || method !== savedState.method
  const planLabel = billingLoading
    ? 'Checking plan…'
    : demo
      ? 'Demo workspace'
      : paid
        ? billingPlan?.name || 'Paid plan'
        : trialActive
          ? 'Full-access trial'
          : trialExpired
            ? 'Trial ended'
            : 'Free'
  const planDetail = demo
    ? 'Local sample data'
    : paid
      ? `${subscription?.billing_interval === 'annual' ? 'Annual' : 'Monthly'} subscription`
      : trialActive
        ? `${trialDaysRemaining} ${trialDaysRemaining === 1 ? 'day' : 'days'} remaining`
        : trialExpired
          ? 'Choose a plan to restore access'
          : 'No paid subscription'

  const accountName = name.trim() || profile?.email?.split('@')[0] || 'Masterdeck investor'
  const sectionMeta = useMemo(() => settingsSections.find((section) => section.id === activeSection)!, [activeSection])

  const save = async (event: React.FormEvent) => {
    event.preventDefault()
    const nextName = name.trim()
    await updateProfile({
      full_name: nextName,
      avatar_url: profile?.avatar_url || null,
      settings: { ...profile?.settings, privacyMode, compactTables, defaultTaxMethod: method },
    })
    setName(nextName)
    setSavedState({ name: nextName, privacyMode, compactTables, method })
  }

  const signOut = async () => {
    if (demo) onExitDemo()
    else await authClient.auth.signOut({ scope: 'local' })
  }

  return (
    <div className="settings-page">
      <PageHeader
        title="Settings"
        description="Manage your account, portfolio defaults and security."
        actions={<div className="settings-save-actions"><span className={dirty ? 'is-dirty' : ''} aria-live="polite"><Check size={13}/>{dirty ? 'Unsaved changes' : 'Changes saved'}</span><Button type="submit" form="settings-form" variant="primary" icon={Save} busy={action === 'save-profile'} disabled={!dirty}>Save changes</Button></div>}
      />

      <form id="settings-form" className="settings-workspace" onSubmit={save}>
        <aside className="settings-section-rail" aria-label="Settings sections">
          <div className="settings-account-rail-summary">
            <span className="settings-avatar settings-avatar-small">{profile?.avatar_url ? <img src={profile.avatar_url} alt=""/> : <UserRound size={17}/>}</span>
            <span><strong>{accountName}</strong><small>{planLabel}</small></span>
          </div>
          <nav>
            {settingsSections.map(({ id, label, description, icon: Icon }) => (
              <button key={id} type="button" className={activeSection === id ? 'active' : ''} aria-current={activeSection === id ? 'page' : undefined} onClick={() => setActiveSection(id)}>
                <Icon size={16}/><span><strong>{label}</strong><small>{description}</small></span>
              </button>
            ))}
          </nav>
          <div className="settings-rail-foot"><ShieldCheck size={15}/><span><strong>Private by design</strong><small>Connections remain read-only.</small></span></div>
        </aside>

        <section className="settings-panel" aria-labelledby="settings-panel-title">
          <header className="settings-panel-head">
            <span>{sectionMeta && <sectionMeta.icon size={18}/>}</span>
            <div><h2 id="settings-panel-title">{sectionMeta.label}</h2><p>{sectionMeta.description}</p></div>
          </header>

          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={activeSection}
              className="settings-panel-body"
              initial={{ opacity: 0, y: reduceMotion ? 0 : 5 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: reduceMotion ? 0 : -3 }}
              transition={{ duration: reduceMotion ? 0.08 : 0.16, ease: [0.23, 1, 0.32, 1] }}
            >
              {activeSection === 'account' && <AccountSettings profile={profile} name={name} accountName={accountName} planLabel={planLabel} planDetail={planDetail} onNameChange={setName}/>}
              {activeSection === 'portfolio' && <PortfolioSettings privacyMode={privacyMode} compactTables={compactTables} method={method} onPrivacyMode={setPrivacyMode} onCompactTables={setCompactTables} onMethod={setMethod}/>}
              {activeSection === 'data' && <DataSettings demo={demo}/>}
              {activeSection === 'security' && <SecuritySettings demo={demo} onSignOut={signOut}/>}
              {activeSection === 'billing' && <BillingSettings planLabel={planLabel} planDetail={planDetail} paid={paid || trialActive}/>}
            </motion.div>
          </AnimatePresence>
        </section>
      </form>
    </div>
  )
}

function AccountSettings({ profile, name, accountName, planLabel, planDetail, onNameChange }: {
  profile: ReturnType<typeof usePortfolio>['bundle']['profile']
  name: string
  accountName: string
  planLabel: string
  planDetail: string
  onNameChange: (value: string) => void
}) {
  return <>
    <div className="settings-identity">
      <span className="settings-avatar">{profile?.avatar_url ? <img src={profile.avatar_url} alt=""/> : <UserRound size={24}/>}</span>
      <div><h3>{accountName}</h3><p>{profile?.email || 'No email address available'}</p></div>
      <Badge tone="success">{planLabel}</Badge>
    </div>
    <div className="settings-group">
      <div className="settings-group-heading"><h3>Profile details</h3><p>Your private workspace identity.</p></div>
      <label className="settings-field"><span><strong>Display name</strong><small>Used throughout your workspace and reports.</small></span><input aria-label="Display name" value={name} onChange={(event) => onNameChange(event.target.value)} maxLength={160}/></label>
      <div className="settings-field"><span><strong>Email address</strong><small>Used for your email or Google sign-in.</small></span><span className="settings-static-value"><Mail size={14}/>{profile?.email || 'Not available'}</span></div>
      <div className="settings-field"><span><strong>Base currency</strong><small>Portfolio values and tax reports use this currency.</small></span><span className="settings-static-value"><WalletCards size={14}/>AUD — Australian dollar</span></div>
    </div>
    <div className="settings-group settings-group-compact">
      <div className="settings-group-heading"><h3>Account access</h3><p>Your current Masterdeck workspace status.</p></div>
      <div className="settings-status-row"><span><strong>{planLabel}</strong><small>{planDetail}</small></span><Link to="/app/billing">Manage plan <ArrowUpRight size={14}/></Link></div>
    </div>
  </>
}

function PortfolioSettings({ privacyMode, compactTables, method, onPrivacyMode, onCompactTables, onMethod }: {
  privacyMode: boolean
  compactTables: boolean
  method: TaxMethod
  onPrivacyMode: (value: boolean) => void
  onCompactTables: (value: boolean) => void
  onMethod: (value: TaxMethod) => void
}) {
  return <div className="settings-group settings-group-first">
    <div className="settings-group-heading"><h3>Portfolio display</h3><p>Set the defaults used across every portfolio.</p></div>
    <label className="settings-control-row">
      <span className="settings-row-icon">{privacyMode ? <EyeOff size={17}/> : <Eye size={17}/>}</span>
      <span><strong>Privacy mode</strong><small>Blur financial values when working in shared spaces.</small></span>
      <input aria-label="Privacy mode" type="checkbox" checked={privacyMode} onChange={(event) => onPrivacyMode(event.target.checked)}/><i aria-hidden="true"/>
    </label>
    <label className="settings-control-row">
      <span className="settings-row-icon"><Rows3 size={17}/></span>
      <span><strong>Compact tables</strong><small>Fit more holdings and transactions on screen.</small></span>
      <input aria-label="Compact tables" type="checkbox" checked={compactTables} onChange={(event) => onCompactTables(event.target.checked)}/><i aria-hidden="true"/>
    </label>
    <label className="settings-control-row settings-select-row">
      <span className="settings-row-icon"><Calculator size={17}/></span>
      <span><strong>Default tax-lot method</strong><small>Applied by default in Australian CGT calculations.</small></span>
      <Select aria-label="Default tax-lot method" value={method} onChange={(event) => onMethod(event.target.value as TaxMethod)}><option value="fifo">FIFO</option><option value="lifo">LIFO</option><option value="hifo">Highest cost first</option></Select>
    </label>
    <div className="settings-note"><ShieldCheck size={15}/><span>This changes your default view only. You can still choose a different parcel method inside Tax reporting.</span></div>
  </div>
}

function DataSettings({ demo }: { demo: boolean }) {
  return <>
    <div className="settings-group settings-group-first">
      <div className="settings-group-heading"><h3>Portfolio data</h3><p>Control where your records come from.</p></div>
      <SettingsLinkRow icon={Link2} title="Broker connections" detail="Connect, sync and monitor read-only broker feeds." to="/app/connections" action="Manage connections"/>
      <SettingsLinkRow icon={Database} title="Imported records" detail={demo ? 'This demo uses local sample data only.' : 'Holdings and transactions remain isolated to your account.'} to="/app/transactions" action="View transactions"/>
      <SettingsLinkRow icon={Calculator} title="Tax records" detail="Review the source transactions behind CGT calculations." to="/app/tax" action="Open Tax reporting"/>
    </div>
    <div className="settings-note settings-note-strong"><LockKeyhole size={15}/><span><strong>Read-only by default.</strong> Masterdeck can read supported portfolio records, but cannot place, change or cancel trades.</span></div>
  </>
}

function SecuritySettings({ demo, onSignOut }: { demo: boolean; onSignOut: () => Promise<void> }) {
  return <>
    <div className="settings-group settings-group-first">
      <div className="settings-group-heading"><h3>Account safeguards</h3><p>How your account and connected data are protected.</p></div>
      <SecurityRow title="Read-only broker access" detail="Broker imports cannot place or modify trades."/>
      <SecurityRow title="Separate Gmail permission" detail="Google sign-in never grants mailbox access by itself."/>
      <SecurityRow title="User-isolated records" detail="Authenticated requests and database policies keep records scoped to your account."/>
    </div>
    <div className="settings-session">
      <span className="settings-row-icon"><LockKeyhole size={17}/></span>
      <span><strong>Current session</strong><small>{demo ? 'Local demo workspace' : 'Authenticated with Masterdeck via Supabase'}</small></span>
      <Badge tone={demo ? 'warning' : 'success'}>{demo ? 'Demo' : 'Active'}</Badge>
    </div>
    <div className="settings-danger-row"><span><strong>{demo ? 'Leave demo workspace' : 'Sign out on this device'}</strong><small>{demo ? 'Return to the Masterdeck homepage.' : 'Other signed-in devices will stay active.'}</small></span><Button type="button" variant="danger" icon={LogOut} onClick={() => void onSignOut()}>{demo ? 'Exit demo' : 'Sign out'}</Button></div>
  </>
}

function BillingSettings({ planLabel, planDetail, paid }: { planLabel: string; planDetail: string; paid: boolean }) {
  return <>
    <div className="settings-plan-summary">
      <span><CreditCard size={21}/></span>
      <div><small>Current plan</small><h3>{planLabel}</h3><p>{planDetail}</p></div>
      <Badge tone={paid ? 'success' : 'neutral'}>{paid ? 'Active' : 'No charge'}</Badge>
    </div>
    <div className="settings-group settings-group-compact">
      <SettingsLinkRow icon={CreditCard} title="Plans & billing" detail="Compare plans or manage your subscription securely." to="/app/billing" action="Open billing"/>
      <SettingsLinkRow icon={Gift} title="Referral programme" detail="Share Masterdeck and track earned account credit." to="/app/referrals" action="View referrals"/>
    </div>
  </>
}

function SettingsLinkRow({ icon: Icon, title, detail, to, action }: { icon: LucideIcon; title: string; detail: string; to: string; action: string }) {
  return <div className="settings-link-row"><span className="settings-row-icon"><Icon size={17}/></span><span><strong>{title}</strong><small>{detail}</small></span><Link to={to}>{action}<ArrowUpRight size={14}/></Link></div>
}

function SecurityRow({ title, detail }: { title: string; detail: string }) {
  return <div className="settings-security-row"><span><ShieldCheck size={16}/></span><span><strong>{title}</strong><small>{detail}</small></span><Check size={15}/></div>
}
