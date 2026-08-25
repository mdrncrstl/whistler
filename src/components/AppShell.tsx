import { BarChart3, Bell, Bot, BriefcaseBusiness, ChevronDown, CircleDollarSign, Command, FileText, Landmark, LogOut, Mail, Menu, Moon, RefreshCw, Search, Settings, ShieldCheck, Sun, TableProperties, Tags, WalletCards, X } from 'lucide-react'
import { useEffect, useState, type ReactNode } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import { authClient } from '../lib/supabase'
import { usePortfolio } from '../context/PortfolioContext'
import { Brand, Button, IconButton, Toast } from './ui'

const navigation = [
  { group: 'Portfolio', items: [
    { to: '/app', label: 'Portfolio', icon: BarChart3, end: true },
    { to: '/app/holdings', label: 'Holdings', icon: BriefcaseBusiness },
    { to: '/app/transactions', label: 'Transactions', icon: TableProperties },
  ]},
  { group: 'Reports', items: [
    { to: '/app/reports/benchmark', label: 'Benchmark analysis', icon: FileText },
    { to: '/app/reports/performance', label: 'Performance breakdown', icon: BarChart3 },
    { to: '/app/reports/diversification', label: 'Diversification', icon: Tags },
    { to: '/app/reports/growth', label: 'Growth & goals', icon: BarChart3 },
    { to: '/app/reports/income', label: 'Income breakdown', icon: CircleDollarSign },
    { to: '/app/reports/income-calendar', label: 'Income calendar', icon: FileText },
  ]},
  { group: 'Tax reporting', items: [
    { to: '/app/tax', label: 'Overview', icon: Landmark, end: true },
    { to: '/app/tax/mytax', label: 'ATO myTax', icon: FileText },
    { to: '/app/tax/capital-gains', label: 'Capital gains tax', icon: FileText },
    { to: '/app/tax/taxable-income', label: 'Taxable income', icon: FileText },
    { to: '/app/tax/valuation', label: 'Portfolio valuation', icon: FileText },
    { to: '/app/tax/unrealised', label: 'Unrealised gains', icon: FileText },
    { to: '/app/tax/historical-cost', label: 'Historical cost', icon: FileText },
  ]},
  { group: 'Tools', items: [
    { to: '/app/tools/assistant', label: 'Deck AI', icon: Bot },
    { to: '/app/tools/inbox', label: 'Document inbox', icon: Mail },
    { to: '/app/tools/groups', label: 'Custom groups', icon: Tags },
    { to: '/app/connections', label: 'Connections', icon: WalletCards },
  ]},
  { group: '', items: [
    { to: '/app/settings', label: 'Settings', icon: Settings },
  ]},
]

export function AppShell({ children, onExitDemo }: { children: ReactNode; onExitDemo: () => void }) {
  const { bundle, demo, action, notice, setNotice, refreshQuotes } = usePortfolio()
  const [mobileOpen, setMobileOpen] = useState(false)
  const [theme, setTheme] = useState<'light' | 'dark'>(() => window.localStorage.getItem('masterdeck-theme') === 'dark' ? 'dark' : 'light')
  const location = useLocation()
  const flatNavigation = navigation.flatMap((section) => section.items)
  const current = [...flatNavigation].sort((a, b) => b.to.length - a.to.length).find((item) => item.end ? location.pathname === item.to : location.pathname.startsWith(item.to)) || flatNavigation[0]
  const profile = bundle.profile
  const privacy = Boolean(profile?.settings?.privacyMode)

  useEffect(() => {
    document.documentElement.dataset.theme = theme
    window.localStorage.setItem('masterdeck-theme', theme)
  }, [theme])

  const signOut = async () => {
    if (demo) return onExitDemo()
    await authClient.auth.signOut({ scope: 'local' })
  }

  const nav = (
    <>
      <div className="sidebar-brand"><Brand /></div>
      <button className="portfolio-switcher"><span className="portfolio-monogram">MD</span><span><strong>All portfolios</strong><small>{bundle.holdings.length} holdings · AUD</small></span><ChevronDown size={14} /></button>
      <nav className="side-nav" aria-label="Portfolio navigation">
        {navigation.map((section) => <div className="nav-section" key={section.group || 'settings'}>
          {section.group && <span className="nav-group-label">{section.group}</span>}
          {section.items.map(({ to, label, icon: Icon, end }) => (
            <NavLink key={to} to={to} end={end} onClick={() => setMobileOpen(false)}>
              <Icon size={15} /><span>{label}</span>
            </NavLink>
          ))}
        </div>)}
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
            <label className="global-search"><Search size={15}/><input placeholder="Search holdings, reports…" aria-label="Search workspace"/><kbd><Command size={10}/>K</kbd></label>
            <Button variant="ghost" icon={RefreshCw} busy={action === 'refresh-quotes'} onClick={() => refreshQuotes()}>Refresh prices</Button>
            <IconButton label="Notifications"><Bell size={17}/></IconButton>
            <IconButton label={`Use ${theme === 'light' ? 'dark' : 'light'} theme`} onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}>{theme === 'light' ? <Moon size={17}/> : <Sun size={17}/>}</IconButton>
            <div className="topbar-avatar" title={profile?.email || undefined}>{(profile?.full_name || profile?.email || 'M').slice(0, 1).toUpperCase()}</div>
          </div>
        </header>
        <div className="app-content">{children}</div>
      </main>
      <nav className="mobile-nav" aria-label="Mobile portfolio navigation">
        {flatNavigation.slice(0, 5).map(({ to, label, icon: Icon, end }) => (
          <NavLink key={to} to={to} end={end}><Icon size={19} /><span>{label === 'Transactions' ? 'Activity' : label.replace(' centre', '')}</span></NavLink>
        ))}
      </nav>
      {notice && <Toast tone={notice.tone} message={notice.message} onClose={() => setNotice(null)} />}
    </div>
  )
}
