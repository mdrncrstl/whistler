import { useState } from 'react'
import { Check, ChevronDown, Minus } from 'lucide-react'
import { billingPlans } from '../lib/billing'
import { planMatrix, pricingFaqs, type MatrixCell } from '../lib/planMatrix'

function Cell({ value, plan }: { value: MatrixCell; plan: string }) {
  if (value === true) return <td className="md-matrix-yes"><Check size={16} aria-hidden="true" /><span className="visually-hidden">Included in {plan}</span></td>
  if (value === false) return <td className="md-matrix-no"><Minus size={14} aria-hidden="true" /><span className="visually-hidden">Not included in {plan}</span></td>
  return <td>{value}</td>
}

export function PricingComparison() {
  const [openFaq, setOpenFaq] = useState(0)
  return (
    <>
      <section className="cloud-container md-matrix-section" aria-labelledby="plan-comparison-title">
        <div className="md-matrix-head">
          <span className="section-label">COMPARE PLANS</span>
          <h2 id="plan-comparison-title">What each plan includes.</h2>
          <p>Every plan carries the full performance and Australian tax reporting. The differences are portfolio count and the deeper analysis views.</p>
        </div>
        <div className="md-matrix-scroll">
          <table className="md-matrix">
            <thead>
              <tr>
                <th scope="col">Feature</th>
                {billingPlans.map((plan) => <th scope="col" key={plan.id} className={plan.featured ? 'is-featured' : ''}>{plan.name}</th>)}
              </tr>
            </thead>
            {planMatrix.map((group) => (
              <tbody key={group.title}>
                <tr className="md-matrix-group"><th scope="colgroup" colSpan={4}>{group.title}</th></tr>
                {group.rows.map((row) => (
                  <tr key={row.label}>
                    <th scope="row"><span>{row.label}</span>{row.note && <small>{row.note}</small>}</th>
                    {row.cells.map((cell, index) => <Cell key={billingPlans[index].id} value={cell} plan={billingPlans[index].name} />)}
                  </tr>
                ))}
              </tbody>
            ))}
          </table>
        </div>
      </section>

      <section className="cloud-container md-price-faq" aria-labelledby="pricing-faq-title">
        <div className="md-matrix-head">
          <span className="section-label">QUESTIONS</span>
          <h2 id="pricing-faq-title">Before you pick a plan.</h2>
        </div>
        <div className="md-price-faq-list">
          {pricingFaqs.map(([question, answer], index) => (
            <div key={question} className={openFaq === index ? 'is-open' : ''}>
              <button type="button" aria-expanded={openFaq === index} aria-controls={`pricing-faq-${index}`} onClick={() => setOpenFaq(openFaq === index ? -1 : index)}>
                <span>{question}</span><ChevronDown size={17} aria-hidden="true" />
              </button>
              <div id={`pricing-faq-${index}`} hidden={openFaq !== index}><p>{answer}</p></div>
            </div>
          ))}
        </div>
      </section>
    </>
  )
}
