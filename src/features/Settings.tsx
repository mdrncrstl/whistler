import { Eye, EyeOff, LogOut, Save, ShieldCheck, SlidersHorizontal, UserRound } from 'lucide-react'
import { useState } from 'react'
import { usePortfolio } from '../context/PortfolioContext'
import { authClient } from '../lib/supabase'
import type { TaxMethod } from '../types'
import { Badge, Button, Card, PageHeader, Select } from '../components/ui'

export function Settings({ onExitDemo }: { onExitDemo: () => void }) {
  const { bundle, demo, action, updateProfile } = usePortfolio()
  const profile = bundle.profile
  return <SettingsForm key={`${profile?.id}-${JSON.stringify(profile?.settings || {})}`} profile={profile} demo={demo} action={action} updateProfile={updateProfile} onExitDemo={onExitDemo} />
}

function SettingsForm({ profile, demo, action, updateProfile, onExitDemo }: {
  profile: ReturnType<typeof usePortfolio>['bundle']['profile']
  demo: boolean
  action: string | null
  updateProfile: ReturnType<typeof usePortfolio>['updateProfile']
  onExitDemo: () => void
}) {
  const [name, setName] = useState(profile?.full_name || '')
  const [privacyMode, setPrivacyMode] = useState(Boolean(profile?.settings?.privacyMode))
  const [compactTables, setCompactTables] = useState(Boolean(profile?.settings?.compactTables))
  const [method, setMethod] = useState<TaxMethod>(profile?.settings?.defaultTaxMethod || 'fifo')

  const save = async (event: React.FormEvent) => {
    event.preventDefault()
    await updateProfile({ full_name: name, avatar_url: profile?.avatar_url || null, settings: { ...profile?.settings, privacyMode, compactTables, defaultTaxMethod: method } })
  }
  const signOut = async () => { if (demo) onExitDemo(); else await authClient.auth.signOut({ scope: 'local' }) }

  return (
    <>
      <PageHeader title="Settings" description="Profile, privacy and portfolio calculation preferences." />
      <div className="settings-grid">
        <Card className="settings-card">
          <div className="settings-title"><UserRound /><div><h2>Profile</h2><p>The identity shown inside your private workspace.</p></div></div>
          <form className="form-stack" onSubmit={save}>
            <label><span>Display name</span><input value={name} onChange={(event) => setName(event.target.value)} maxLength={160} /></label>
            <label><span>Email</span><input value={profile?.email || ''} disabled /></label>
            <label><span>Base currency</span><input value="AUD — Australian dollar" disabled /></label>
            <Button type="submit" variant="primary" icon={Save} busy={action === 'save-profile'}>Save preferences</Button>
          </form>
        </Card>
        <Card className="settings-card">
          <div className="settings-title"><SlidersHorizontal /><div><h2>Workspace preferences</h2><p>Control how portfolio values and tax estimates are displayed.</p></div></div>
          <div className="settings-controls">
            <label className="toggle-row"><span>{privacyMode ? <EyeOff /> : <Eye />}<span><strong>Privacy mode</strong><small>Blur financial values throughout the app.</small></span></span><input type="checkbox" checked={privacyMode} onChange={(event) => setPrivacyMode(event.target.checked)} /><i /></label>
            <label className="toggle-row"><span><SlidersHorizontal /><span><strong>Compact tables</strong><small>Reduce row height on large ledgers.</small></span></span><input type="checkbox" checked={compactTables} onChange={(event) => setCompactTables(event.target.checked)} /><i /></label>
            <label className="setting-select"><span><strong>Default tax-lot method</strong><small>You can still change this inside Tax centre.</small></span><Select value={method} onChange={(event) => setMethod(event.target.value as TaxMethod)}><option value="fifo">FIFO</option><option value="lifo">LIFO</option><option value="hifo">Highest cost first</option></Select></label>
          </div>
        </Card>
        <Card className="settings-card security-card">
          <div className="settings-title"><ShieldCheck /><div><h2>Security model</h2><p>What MASTERDECK can and cannot do.</p></div></div>
          <ul className="security-list">
            <li><ShieldCheck /><span><strong>Read-only broker access</strong>IBKR Activity Flex cannot place or modify trades.</span></li>
            <li><ShieldCheck /><span><strong>Separate Gmail permission</strong>Ordinary Google sign-in never grants mailbox access.</span></li>
            <li><ShieldCheck /><span><strong>User-isolated records</strong>Portfolio data is handled by authenticated Edge Functions and protected database policies.</span></li>
          </ul>
          <div className="session-row"><span><strong>Current session</strong><small>{demo ? 'Local demo only' : 'Google identity via Supabase'}</small></span><Badge tone={demo ? 'warning' : 'success'}>{demo ? 'Demo' : 'Authenticated'}</Badge></div>
          <Button variant="danger" icon={LogOut} onClick={signOut}>{demo ? 'Exit demo' : 'Sign out on this device'}</Button>
        </Card>
      </div>
    </>
  )
}
