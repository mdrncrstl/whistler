import { useMemo, useState } from 'react'
import { KeyRound, Building2, FileSpreadsheet, Search } from 'lucide-react'
import { brokers, methodDetail, methodLabel, type BrokerMethod } from '../lib/brokers'

const icons: Record<BrokerMethod, typeof KeyRound> = { sync: KeyRound, parser: Building2, csv: FileSpreadsheet }
const order: BrokerMethod[] = ['sync', 'parser', 'csv']

/**
 * The same broker list the Connections page uses, so the marketing claim and the product
 * cannot drift apart. The method is shown on every row: only 'sync' is a live connection.
 */
export function BrokerDirectory() {
  const [query, setQuery] = useState('')
  const groups = useMemo(() => {
    const text = query.trim().toLowerCase()
    const matching = text
      ? brokers.filter(broker => `${broker.name} ${broker.region} ${broker.market} ${methodLabel[broker.method]}`.toLowerCase().includes(text))
      : brokers
    return order
      .map(method => ({ method, rows: matching.filter(broker => broker.method === method && broker.id !== 'other') }))
      .filter(group => group.rows.length)
  }, [query])

  return (
    <section className="cloud-container md-brokers" aria-labelledby="broker-directory-title">
      <div className="md-matrix-head">
        <span className="section-label">SUPPORTED BROKERS</span>
        <h2 id="broker-directory-title">Bring in records from any broker.</h2>
        <p>
          Interactive Brokers connects and syncs itself. Superhero statements are read directly.
          Every other broker imports from a CSV export you map once — so a broker missing from this
          list is still supported, it just is not pre-labelled.
        </p>
      </div>
      <label className="md-broker-search">
        <Search size={16} aria-hidden="true" />
        <input value={query} onChange={event => setQuery(event.target.value)} placeholder="Find your broker…" aria-label="Find your broker" />
      </label>
      {groups.map(({ method, rows }) => {
        const Icon = icons[method]
        return (
          <div className="md-broker-group" key={method}>
            <div className="md-broker-group-head">
              <h3><Icon size={15} aria-hidden="true" />{methodLabel[method]}</h3>
              <p>{methodDetail[method]}</p>
            </div>
            <ul className="md-broker-list">
              {rows.map(broker => (
                <li key={broker.id}>
                  <strong>{broker.name}</strong>
                  <small>{broker.region} · {broker.market}</small>
                </li>
              ))}
            </ul>
          </div>
        )
      })}
      {!groups.length && <p className="md-broker-empty">No match in the list — which does not mean it is unsupported. Any CSV export with a header row imports.</p>}
    </section>
  )
}
