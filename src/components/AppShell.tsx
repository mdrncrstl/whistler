import { BarChart3, BriefcaseBusiness, CircleDollarSign, Landmark, LogOut, Menu, RefreshCw, Settings, ShieldCheck, TableProperties, WalletCards, X } from 'lucide-react'
import { useState, type ReactNode } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import { authClient } from '../lib/supabase'
import { usePortfolio } from '../context/PortfolioContext'
import { Brand, Button, IconButton, Toast } from './ui'

const navigation = [
  { to: '/app', label: 'Overview', icon: BarChart3, end: true },
  { to: '/app/holdings', label: 'Holdings', icon: BriefcaseBusiness },
  { to: '/app/transactions', label: 'Transactions', icon: TableProperties },
  { to: '/app/income', label: 'Income', icon: CircleDollarSign },
  { to: '/app/tax', label: 'Tax centre', icon: Landmark },
  { to: '/app/connections', label: 'Connections', icon: WalletCards },
  { to: '/app/settings', label: 'Settings', icon: Settings },
]

export function AppShell({ children, onExitDemo }: { children: ReactNode; onExitDemo: () => void }) {
  const { bundle, demo, action, notice, setNotice, refreshQuotes } = usePortfolio()
  const [mobileOpen, setMobileOpen] = useState(false)
  const location = useLocation()
  const current = navigation.find((item) => item.end ? location.pathname === item.to : location.pathname.startsWith(item.to)) || navigation[0]
  const profile = bundle.profile
  const privacy = Boolean(profile?.settings?.privacyMode)

  const signOut = async () => {
    if (demo) return onExitDemo()
    await authClient.auth.signOut({ scope: 'local' })
  }

  const nav = (
    <>
      <div className="sidebar-brand"><Brand /></div>
      <nav className="side-nav" aria-label="Portfolio navigation">
        {navigation.map(({ to, label, icon: Icon, end }) => (
          <NavLink key={to} to={to} end={end} onClick={() => setMobileOpen(false)}>
            <Icon size={18} /><span>{label}</span>
          </NavLink>
        ))}
      </nav>
      <div className="sidebar-foot">
        <div className="security-note"><ShieldCheck size={16} /><span>Read-only connections<br /><small>Trades cannot be placed</small></span></div>
        <button className="identity" onClick={signOut}>
          {profile?.avatar_url ? <img src={profile.avatar_url} alt="" referrerPolicy="no-referrer" /> : <span>{(profile?.full_name || profile?.email || 'M').slice(0, 1).toUpperCase()}</span>}
          <span><strong>{profile?.full_name || (demo ? 'Demo Investor' : 'Investor')}</strong><small>{demo ? 'Demo workspace' : profile?.email}</small></span>
          <LogOut size={16} />
        </button>
      </div>
    </>
  )

  const compact = Boolean(profile?.settings?.compactTables)
  return (
    <div className={`app-shell ${privacy ? 'privacy-on' : ''} ${compact ? 'compact-tables' : ''}`}>
      <aside className="sidebar">{nav}</aside>
      {mobileOpen && <div className="mobile-drawer"><div className="drawer-panel">{nav}</div><button className="drawer-dismiss" aria-label="Close menu" onClick={() => setMobileOpen(false)}><X /></button></div>}
      <main className="app-main">
        <header className="topbar">
          <div className="topbar-title">
            <IconButton label="Open navigation" onClick={() => setMobileOpen(true)}><Menu size={20} /></IconButton>
            <div><strong>{current.label}</strong><span>{demo ? 'Illustrative demo data' : 'Live private workspace'}</span></div>
          </div>
          <div className="topbar-actions">
            <Button variant="ghost" icon={RefreshCw} busy={action === 'refresh-quotes'} onClick={() => refreshQuotes()}>Refresh prices</Button>
            <div className="topbar-avatar" title={profile?.email || undefined}>{(profile?.full_name || profile?.email || 'M').slice(0, 1).toUpperCase()}</div>
          </div>
        </header>
        <div className="app-content">{children}</div>
      </main>
      <nav className="mobile-nav" aria-label="Mobile portfolio navigation">
        {navigation.slice(0, 5).map(({ to, label, icon: Icon, end }) => (
          <NavLink key={to} to={to} end={end}><Icon size={19} /><span>{label === 'Transactions' ? 'Activity' : label.replace(' centre', '')}</span></NavLink>
        ))}
      </nav>
      {notice && <Toast tone={notice.tone} message={notice.message} onClose={() => setNotice(null)} />}
    </div>
  )
}
