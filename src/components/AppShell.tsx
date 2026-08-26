import { ArrowLeftRight, ArrowUpRight, BarChart3, Bell, BriefcaseBusiness, CalendarDays, ChevronDown, ChevronUp, CircleDollarSign, Command, FileText, History, Inbox, Layers3, LineChart, ListTree, Menu, MessageSquare, Moon, PieChart, RefreshCw, Scale, Search, Settings, Sparkles, Sun, Table2, Target, TrendingUp, WalletCards, X, type LucideIcon } from 'lucide-react'
import { useEffect, useState, type ReactNode } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import { usePortfolio } from '../context/PortfolioContext'
import { Brand, Button, IconButton, Toast } from './ui'

type NavItem = { to: string; label: string; icon: LucideIcon; end?: boolean; subGroup?: string }

const portfolioItems: NavItem[] = [
  { to: '/app', label: 'Portfolio', icon: BriefcaseBusiness, end: true },
  { to: '/app/transactions', label: 'Transactions', icon: ArrowLeftRight },
]

const reportItems: NavItem[] = [
  { to: '/app/reports/benchmark', label: 'Benchmark Analysis', icon: Scale },
  { to: '/app/reports/performance', label: 'Performance Breakdown', icon: ListTree },
  { to: '/app/reports/diversification', label: 'Diversification', icon: PieChart },
  { to: '/app/reports/growth', label: 'Growth & Goals', icon: Target },
  { to: '/app/reports/income', label: 'Income Breakdown', icon: CircleDollarSign, subGroup: 'Income' },
  { to: '/app/reports/income-calendar', label: 'Income Calendar', icon: CalendarDays },
]

const taxItems: NavItem[] = [
  { to: '/app/tax', label: 'Overview', icon: Table2, end: true },
  { to: '/app/tax/mytax', label: 'ATO MyTax', icon: FileText, subGroup: 'Tax Reports' },
  { to: '/app/tax/capital-gains', label: 'Capital Gains Tax', icon: ListTree },
  { to: '/app/tax/taxable-income', label: 'Taxable Income', icon: CircleDollarSign },
  { to: '/app/tax/valuation', label: 'Portfolio Valuation', icon: WalletCards, subGroup: 'Tax Planning' },
  { to: '/app/tax/unrealised', label: 'Unrealized Gains', icon: TrendingUp },
  { to: '/app/tax/historical-cost', label: 'Historical Cost', icon: History },
]

const toolItems: NavItem[] = [
  { to: '/app/tools/assistant', label: 'Masterdeck AI', icon: Sparkles },
  { to: '/app/tools/inbox', label: 'Email Inbox', icon: Inbox },
  { to: '/app/tools/groups', label: 'Custom Groups', icon: Layers3 },
]

const flatNavigation: NavItem[] = [
  ...portfolioItems, ...reportItems, ...taxItems, ...toolItems,
  { to: '/app/settings', label: 'Settings', icon: Settings },
  { to: '/app/holdings', label: 'Holdings', icon: BarChart3 },
  { to: '/app/connections', label: 'Connections', icon: WalletCards },
]

export function AppShell({ children }: { children: ReactNode; onExitDemo: () => void }) {
  const { bundle, demo, action, notice, setNotice, refreshQuotes } = usePortfolio()
  const [mobileOpen, setMobileOpen] = useState(false)
  const [mcpPromoOpen, setMcpPromoOpen] = useState(true)
  const [theme, setTheme] = useState<'light' | 'dark'>(() => window.localStorage.getItem('masterdeck-theme') === 'dark' ? 'dark' : 'light')
  const location = useLocation()
  const current = [...flatNavigation].sort((a, b) => b.to.length - a.to.length).find((item) => item.end ? location.pathname === item.to : location.pathname.startsWith(item.to)) || flatNavigation[0]
  const profile = bundle.profile
  const privacy = Boolean(profile?.settings?.privacyMode)

  useEffect(() => {
    document.documentElement.dataset.theme = theme
    window.localStorage.setItem('masterdeck-theme', theme)
  }, [theme])

  const nav = (
    <>
      <div className="sidebar-brand"><Brand /></div>
      <button className="portfolio-switcher"><span className="portfolio-monogram">MD</span><span><strong>All portfolios</strong><small>{bundle.holdings.length} holdings · AUD</small></span><ChevronDown size={14} /></button>
      <nav className="side-nav" aria-label="Portfolio navigation">
        <div className="nav-section">
          <span className="nav-group-label">Portfolio</span>
          {portfolioItems.map(({ to, label, icon: Icon, end }) => (
            <NavLink key={to} to={to} end={end} onClick={() => setMobileOpen(false)}>
              <Icon size={15} /><span>{label}</span>
            </NavLink>
          ))}
        </div>

        <div className="nav-section nav-expanded-section">
          <span className="nav-group-label">Reports</span>
          <div className="nav-parent"><LineChart size={15}/><span>Performance</span><ChevronUp size={13}/></div>
          {reportItems.map(({ to, label, icon: Icon, subGroup, end }) => <div className="nav-child-wrap" key={to}>
            {subGroup && <span className="nav-subgroup-label">{subGroup}</span>}
            <NavLink className="nav-child" to={to} end={end} onClick={() => setMobileOpen(false)}><Icon size={15}/><span>{label}</span></NavLink>
          </div>)}

          <div className="nav-parent nav-tax-parent"><FileText size={15}/><span>Tax Reporting</span><ChevronUp size={13}/></div>
          {taxItems.map(({ to, label, icon: Icon, subGroup, end }) => <div className="nav-child-wrap" key={to}>
            {subGroup && <span className="nav-subgroup-label">{subGroup}</span>}
            <NavLink className="nav-child" to={to} end={end} onClick={() => setMobileOpen(false)}><Icon size={15}/><span>{label}</span></NavLink>
          </div>)}
        </div>

        <div className="nav-section">
          <span className="nav-group-label">Tools</span>
          {toolItems.map(({ to, label, icon: Icon }) => <NavLink key={to} to={to} onClick={() => setMobileOpen(false)}><Icon size={15}/><span>{label}</span></NavLink>)}
        </div>

        <div className="nav-section nav-settings-section">
          <NavLink to="/app/settings" onClick={() => setMobileOpen(false)}><Settings size={15}/><span>Settings</span></NavLink>
        </div>
      </nav>
      <div className="sidebar-foot">
        {mcpPromoOpen && <aside className="mcp-promo" aria-label="Masterdeck MCP server beta">
          <button type="button" aria-label="Dismiss Masterdeck MCP server card" onClick={() => setMcpPromoOpen(false)}><X size={13}/></button>
          <span>New</span>
          <strong>Masterdeck MCP server (beta)</strong>
          <p>Connect your AI agent (Claude, ChatGPT, etc.) to your portfolio.</p>
          <NavLink to="/app/settings">Connect <ArrowUpRight size={12}/></NavLink>
        </aside>}
        <NavLink className="sidebar-feedback" to="/app/settings"><MessageSquare size={15}/><span>Feedback</span></NavLink>
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
