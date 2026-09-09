import { ArrowRight, FileSpreadsheet, Globe2, ShieldCheck } from 'lucide-react'
import { Link } from 'react-router-dom'

export function PortfolioSetupGuide({ compact = false }: { compact?: boolean }) {
  const Heading = compact ? 'h2' : 'h1'
  return (
    <section className={`portfolio-setup-guide ${compact ? 'compact' : ''}`} aria-labelledby="portfolio-setup-title">
      <div className="portfolio-setup-copy">
        <span className="portfolio-setup-icon"><ShieldCheck size={22} /></span>
        <div>
          <Heading id="portfolio-setup-title">Build your portfolio</Heading>
          <p>Start with a broker connection or a CSV export. Review your records before adding them.</p>
        </div>
      </div>
      <div className="portfolio-setup-options" aria-label="Ways to add investments">
        <Link className="portfolio-setup-option primary" to="/app/connections?setup=import">
          <span><FileSpreadsheet size={19} /></span><div><strong>Import portfolio records</strong><small>CSV exports or supported PDF statements from any broker</small></div><ArrowRight size={17} />
        </Link>
        <Link className="portfolio-setup-option" to="/app/connections">
          <span><Globe2 size={19} /></span><div><strong>Browse broker guides</strong><small>Use a named guide, direct sync, or the universal CSV mapper</small></div><ArrowRight size={17} />
        </Link>
      </div>
      <div className="portfolio-setup-steps" aria-label="What happens next">
        <span><i>1</i><strong>Choose a method</strong><small>Connect an account or choose a CSV file.</small></span>
        <span><i>2</i><strong>Review your data</strong><small>Check what Masterdeck found before importing.</small></span>
        <span><i>3</i><strong>See your portfolio</strong><small>Holdings, performance and reports populate automatically.</small></span>
      </div>
      <p className="portfolio-setup-note"><ShieldCheck size={13} /> Broker access is read-only. Masterdeck cannot place or modify trades.</p>
    </section>
  )
}
