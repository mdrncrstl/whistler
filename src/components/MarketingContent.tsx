import { useState } from 'react'
import { ArrowRight, Check } from 'lucide-react'
import { billingPlans, formatAud } from '../lib/billing'
import { marketingPages, type MarketingPage } from '../lib/marketingPages'
import { PricingComparison } from './PricingComparison'
import { BrokerDirectory } from './BrokerDirectory'

export function MarketingContent({ page, onStart, onDemo }: { page: MarketingPage | 'pricing'; onStart: () => void; onDemo: () => void }) {
  const [annual, setAnnual] = useState(true)
  if (page === 'pricing') return <main className="md-public-content" id="top"><section className="cloud-container md-public-hero"><span className="section-label">PRICING</span><h1>Choose room for<br/><em>your portfolio.</em></h1><p>A 14-day free trial. No credit card. No automatic charge.</p><div className="md-price-toggle" role="group" aria-label="Billing period"><button aria-pressed={!annual} onClick={()=>setAnnual(false)}>Monthly</button><button aria-pressed={annual} onClick={()=>setAnnual(true)}>Annual</button></div><div className="md-public-plans">{billingPlans.map(plan=><article key={plan.id} className={plan.featured ? 'is-featured' : ''}><span>{plan.featured ? 'RECOMMENDED' : `${plan.portfolios} PORTFOLIO${plan.portfolios === 1 ? '' : 'S'}`}</span><h2>{plan.name}</h2><strong>${formatAud(annual ? plan.annual : plan.monthly)}<small> AUD / month</small></strong><p>{annual ? `$${formatAud(plan.annualTotal)} billed annually` : 'Billed monthly'} · Up to {plan.portfolios} portfolio{plan.portfolios === 1 ? '' : 's'}</p><button className="cloud-button" onClick={onStart}>Try Masterdeck free<ArrowRight/></button><ul>{plan.features.map(feature=><li key={feature}><Check size={16}/>{feature}</li>)}</ul></article>)}</div><p className="md-price-note">Prices are in Australian dollars. Choose a paid plan when you are ready; starting the trial does not create an automatic charge.</p></section><PricingComparison /></main>
  const related = marketingPages.filter(item=>item.group === page.group && item.path !== page.path).slice(0,3)
  return <main className="md-public-content" id="top"><section className="cloud-container md-public-hero"><a className="md-breadcrumb" href="/">Masterdeck / {page.group}</a><h1>{page.title}</h1><p>{page.description}</p><div className="cloud-actions"><button className="cloud-button" onClick={onStart}>Try Masterdeck free<ArrowRight/></button><button className="cloud-button md-demo-button" onClick={onDemo}>Explore the demo</button></div></section>
    <section className="cloud-container md-public-body" aria-label={page.label}><aside><span className="section-label">{page.label}</span><p>Keep the detail behind every number within reach.</p><a href="/pricing">Compare plans<ArrowRight size={15}/></a></aside><div>{page.sections.map((section,index)=><article key={section.title}><span>0{index+1}</span><div><h2>{section.title}</h2><p>{section.text}</p></div></article>)}</div></section>
    {page.path === '/features/integrations' && <BrokerDirectory />}
    {page.group !== 'Company' && <figure className="cloud-container md-public-image"><img src="/marketing/masterdeck-portfolio-hero.png" width="1366" height="768" alt="Masterdeck portfolio workspace with demo holdings" loading="lazy"/><figcaption>Actual Masterdeck app · Demo portfolio</figcaption></figure>}
    <section className="cloud-container md-related"><h2>Keep exploring</h2><div>{related.map(item=><a href={item.path} key={item.path}><strong>{item.label}</strong><p>{item.description}</p><ArrowRight size={18}/></a>)}</div></section>
  </main>
}
