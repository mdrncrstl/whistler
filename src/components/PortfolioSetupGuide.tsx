import { ArrowRight, FileSpreadsheet, KeyRound, ShieldCheck } from 'lucide-react'
import { Link } from 'react-router-dom'

export function PortfolioSetupGuide({ compact = false }: { compact?: boolean }) {
  const Heading = compact ? 'h2' : 'h1'
  return (
    <section className={`portfolio-setup-guide ${compact ? 'compact' : ''}`} aria-labelledby="portfolio-setup-title">
      <div className="portfolio-setup-copy">
        <span className="portfolio-setup-icon"><ShieldCheck size={22} /></span>
        <div>
          <Heading id="portfolio-setup-title">Add your first investments</Heading>
          <p>Masterdeck creates holdings from your broker records so quantities, purchase costs and returns stay accurate.</p>
        </div>
      </div>
      <div className="portfolio-setup-options" aria-label="Ways to add investments">
        <Link className="portfolio-setup-option primary" to="/app/connections?setup=ibkr">
          <span><KeyRound size={19} /></span><div><strong>Connect Interactive Brokers</strong><small>Automatic, read-only Activity Flex sync</small></div><ArrowRight size={17} />
        </Link>
        <Link className="portfolio-setup-option" to="/app/connections?setup=import">
          <span><FileSpreadsheet size={19} /></span><div><strong>Import a Superhero report</strong><small>Upload a portfolio or transaction report</small></div><ArrowRight size={17} />
        </Link>
      </div>
      <div className="portfolio-setup-steps" aria-label="What happens next">
        <span><i>1</i><strong>Choose a method</strong><small>Connect IBKR or select a broker report.</small></span>
        <span><i>2</i><strong>Review your data</strong><small>Check what Masterdeck found before importing.</small></span>
        <span><i>3</i><strong>See your portfolio</strong><small>Holdings, performance and reports populate automatically.</small></span>
      </div>
      <p className="portfolio-setup-note"><ShieldCheck size={13} /> Broker access is read-only. Masterdeck cannot place or modify trades.</p>
    </section>
  )
}
