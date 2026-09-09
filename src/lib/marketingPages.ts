export type MarketingPage = { path: string; label: string; group: string; title: string; description: string; sections: { title: string; text: string }[] }
const page = (path: string, label: string, group: string, title: string, description: string, sections: [string,string][]): MarketingPage => ({path,label,group,title,description,sections:sections.map(([title,text])=>({title,text}))})
export const marketingPages = [
  page('/features/portfolio-tracking','Portfolio tracking','Features','Your investments, in one working view.','Bring holdings, cash and transaction records together so you can see where your portfolio stands.',[
    ['Start with the whole portfolio','Review portfolio value, open-position gains and recorded income together. Use the holdings table to move from the overall picture into an individual investment.'],
    ['Keep the history behind the number','Transactions, purchase costs and income records help explain the current position. Review imported records before relying on the resulting reports.'],
    ['Separate accounts when you need to','Use separate portfolios for different accounts or strategies, within your plan allowance. Switch between a portfolio and the combined view.']]),
  page('/features/performance','Performance & benchmarks','Features','Understand what contributed to your return.','Explore your holdings, reporting periods and benchmarks without losing the underlying records.',[
    ['Look beyond the account balance','A balance can grow because you invested more money. Review capital gains and recorded income alongside portfolio value to understand the components of your result.'],
    ['Choose the comparison','Benchmark analysis puts your portfolio beside a reference series. Check the selected period and data coverage before interpreting the difference.'],
    ['Find the contributors','Open performance breakdowns to inspect individual holdings, then follow a holding into its detail page. Missing history is identified rather than filled with invented returns.']]),
  page('/features/income','Dividends & income','Features','Keep your investment income in view.','Follow recorded dividends and distributions alongside the holdings that generated them.',[
    ['Review income in one place','Income reports bring recorded payments together. Filter the reporting period and inspect the transaction history when a payment needs checking.'],
    ['See the pattern','Use income breakdowns and the income calendar to review the timing and sources of your payments. Recorded income is distinct from a promise of future distributions.'],
    ['Prepare the records for tax time','Keep amounts, dates and currencies attached to income transactions. Where tax details are missing from the source, review them before completing a tax return.']]),
  page('/features/australian-tax','Australian tax records','Features','Keep tax time connected to your trades.','Review disposal records, income and parcel history in the same workspace as your investments.',[
    ['Review disposals and parcels','Inspect capital-gains reports and parcel matching against your recorded transactions. Accurate purchase dates, costs and sale records are essential to useful results.'],
    ['Bring income into the picture','The taxable-income and MyTax views help organise recorded amounts. Check source statements for any tax components that have not been supplied.'],
    ['Plan with the right context','Review unrealised gains, valuations and historical costs. These reports support record preparation; your circumstances and final tax treatment should be checked with your tax adviser.']]),
  page('/features/integrations','Connections & imports','Features','Bring in your records. Keep your broker.','Import records from the sources you already use and keep each portfolio in one working history.',[
    ['Choose the right path','Use a supported direct read-only feed where available, or bring in a CSV export or PDF statement. No connection can place trades or move your money.'],
    ['Import a statement','Upload supported CSV or PDF reports, including supported Superhero statements. Compatibility depends on the report format, so inspect the preview and resolve any flagged records.'],
    ['Check before you continue','Compare holdings, cash and transactions with your broker statement. A supported exchange is not the same as an automatic connection to every broker on that exchange.']]),
  page('/features/portfolio-assistant','Portfolio assistant','Features','Ask a question. Follow the numbers.','Get focused summaries calculated from the portfolio records loaded in your workspace.',[
    ['Start with useful questions','Ask about portfolio value, recorded income, concentration or a holding. Suggested questions help you get to the reports that answer each topic.'],
    ['Go from summary to detail','Answers link to relevant portfolio, diversification, income and tax pages so you can inspect the records behind the result.'],
    ['Know what powers the answer','The assistant uses a rules-based portfolio engine, not a language model. It summarises available records and does not predict prices or recommend investments.']]),
  page('/for/share-investors','Share investors','Who it’s for','A clearer record of the shares you own.','Keep your holdings and transaction history organised across supported markets.',[
    ['Follow each position','See the value and recorded gains of your holdings, then open a company for more detail. Keep fees and transaction records close to the numbers.'],
    ['Compare the portfolio','Use performance and diversification reports to review how individual positions contribute to the whole. Separate portfolios can keep different accounts or strategies organised.'],
    ['Make reviews repeatable','Import new records, check the totals against your broker, then review the same reports over a consistent period.']]),
  page('/for/etf-investors','ETF investors','Who it’s for','Keep your ETF portfolio easy to follow.','Review fund positions, portfolio performance and recorded distributions together.',[
    ['See the funds you hold','Track ETF positions alongside cash and other supported investments. Open a fund holding to inspect its price history and your recorded position.'],
    ['Keep distributions organised','Bring distribution transactions into your income records. Fund tax components may need additional information from your annual statement.'],
    ['Review allocation carefully','Portfolio diversification describes the available holding data. Do not assume a fund position includes complete look-through exposure to every underlying security.']]),
  page('/for/multiple-portfolios','Multiple portfolios','Who it’s for','Separate accounts. One place to review them.','Organise investment records by account or strategy while keeping a combined view within reach.',[
    ['Choose the right allowance','Essential includes one portfolio, Investor includes three and Private Wealth includes ten. Each plan’s current pricing is listed on the pricing page.'],
    ['Keep records in their place','Import transactions into the intended portfolio and reconcile each account with its source statement. This helps prevent duplicate records across accounts.'],
    ['Switch your perspective','Use the portfolio selector to move between individual portfolios and All Portfolios. Check the selected scope before exporting or interpreting a report.']]),
  page('/company/about','About Masterdeck','Company','A portfolio should be easier to understand.','Masterdeck brings investment records, performance reports and Australian tax preparation into one workspace.',[
    ['Built around your records','The aim is straightforward: make it easier to move from a headline number to the holdings and transactions behind it.'],
    ['Your investments stay with you','Masterdeck is portfolio tracking software. It does not act as a broker, hold assets, move money or place trades.'],
    ['See it before you connect','Explore the demo to inspect the interface with sample data. Start a free trial when you are ready to add your own records.']]),
  page('/company/contact','Contact','Company','Talk to the people who build it.','Questions about your records, a plan or a broker import go straight to the Masterdeck team.',[
    ['Email us','Write to support@masterdeck.app with your account email and, where it helps, the report or holding you are asking about. Including the broker and date range gets to an answer faster.'],
    ['Before you write in about an import','Check the import preview for flagged records and compare the totals against your broker statement. Most import questions come down to a column mapping or a missing foreign-exchange rate, and the preview names both.'],
    ['What we cannot answer','Masterdeck organises your records and prepares reports. We cannot advise on which investments to hold or how your personal tax position should be treated; those belong with a licensed adviser.']]),
  page('/company/help','Help centre','Company','Get your first portfolio into shape.','Start with these practical steps, then use your workspace to check the details.',[
    ['1. Create your workspace','Choose Try Masterdeck free and create an account. Complete onboarding, then open Connections to choose a supported connection or import.'],
    ['2. Add and review records','Choose a supported direct feed, CSV export or PDF statement, then inspect the preview before confirming the records.'],
    ['3. Reconcile and explore','Compare cash, quantities and transaction dates with your broker. Start with Portfolio, then explore performance, income and tax reports. If something is wrong, include the affected page and a clear description when contacting support.']]),
]
export const marketingGroups = ['Features','Who it’s for','Company'] as const
