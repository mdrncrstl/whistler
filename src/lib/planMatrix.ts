/**
 * Plan comparison, written from what the product actually does today.
 * A cell is `true` when the plan includes it, `false` when it does not, or a string
 * when the answer is a value rather than a yes/no.
 */
export type MatrixCell = boolean | string
export interface MatrixRow { label: string; note?: string; cells: [MatrixCell, MatrixCell, MatrixCell] }
export interface MatrixGroup { title: string; rows: MatrixRow[] }

export const planMatrix: MatrixGroup[] = [
  {
    title: 'Plans and portfolios',
    rows: [
      { label: 'Portfolios included', cells: ['1', '3', '10'] },
      { label: 'Holdings per portfolio', cells: ['Unlimited', 'Unlimited', 'Unlimited'] },
      { label: 'Free trial', cells: ['14 days', '14 days', '14 days'] },
      { label: 'Credit card to start', cells: ['Not required', 'Not required', 'Not required'] },
      { label: 'Combined All Portfolios view', cells: [true, true, true] },
    ],
  },
  {
    title: 'Reporting and insights',
    rows: [
      { label: 'Portfolio and holdings reports', cells: [true, true, true] },
      { label: 'Performance breakdown', cells: [true, true, true] },
      { label: 'Benchmark analysis', cells: [true, true, true] },
      { label: 'Capital, income and currency split', cells: [true, true, true] },
      { label: 'Diversification report', cells: [false, true, true] },
      { label: 'Income breakdown and calendar', cells: [false, true, true] },
      { label: 'Custom holding groups', cells: [false, true, true] },
      { label: 'Portfolio summaries', cells: [false, false, true] },
    ],
  },
  {
    title: 'Australian tax',
    rows: [
      { label: 'Capital gains report', cells: [true, true, true] },
      { label: 'Parcel matching', note: 'FIFO, LIFO and manual selection', cells: [true, true, true] },
      { label: 'ATO MyTax view', cells: [true, true, true] },
      { label: 'Taxable income report', cells: [true, true, true] },
      { label: 'Portfolio valuation and historical cost', cells: [true, true, true] },
      { label: 'Unrealised CGT planning', cells: [false, true, true] },
    ],
  },
  {
    title: 'Connections and data',
    rows: [
      { label: 'Optional direct read-only sync', note: 'Available on supported feeds', cells: [true, true, true] },
      { label: 'CSV and statement import', cells: [true, true, true] },
      { label: 'Read-only access to your broker', cells: [true, true, true] },
      { label: 'CSV and PDF export', cells: [true, true, true] },
      { label: 'Priority data support', cells: [false, false, true] },
    ],
  },
]

export const pricingFaqs: [string, string][] = [
  ['Do I need a credit card to start?',
   'No. The 14-day trial starts without a card and does not create an automatic charge. You choose a plan when you are ready to continue.'],
  ['What happens when the trial ends?',
   'Your records stay in your workspace. Choosing a plan re-opens the reports; nothing you imported is deleted.'],
  ['Can I change plans later?',
   'Yes. Plan changes and cancellations are handled in the billing portal from your account settings, and take effect from your next billing period.'],
  ['Which currency am I charged in?',
   'Australian dollars. Prices shown on this page are the amounts you are charged.'],
  ['Is my broker connection read-only?',
   'Yes. Any direct connection is reporting-only. It imports records; it cannot place trades or move money.'],
  ['What counts as a portfolio?',
   'A portfolio is one set of holdings and transactions, usually one account or one strategy. You can view any single portfolio or the combined All Portfolios view.'],
]
