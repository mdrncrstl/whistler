import { chromium } from '@playwright/test'

const baseUrl = process.env.MASTERDECK_QA_URL || 'http://127.0.0.1:4173'
const browser = await chromium.launch({ headless: true })
const consoleIssues = []
const checks = []

function check(name, condition, detail = '') {
  if (!condition) throw new Error(`${name} failed${detail ? `: ${detail}` : ''}`)
  checks.push({ name, status: 'pass', detail })
}

function watchConsole(page, label) {
  page.on('console', (message) => {
    if (['error', 'warning'].includes(message.type())) consoleIssues.push({ page: label, type: message.type(), text: message.text() })
  })
  page.on('pageerror', (error) => consoleIssues.push({ page: label, type: 'pageerror', text: error.message }))
}

async function enterDemo(page) {
  page.setDefaultTimeout(5_000)
  await page.goto(baseUrl, { waitUntil: 'networkidle' })
  const demoButton = page.getByRole('button', { name: 'Explore demo' }).first()
  if (await demoButton.isVisible()) {
    await demoButton.click()
    await page.waitForURL('**/app')
  } else if (!await page.getByRole('textbox', { name: 'Filter holdings' }).isVisible()) {
    throw new Error(`App did not render at ${page.url()}: ${(await page.locator('body').innerText()).slice(0, 500)}`)
  }
  await page.getByRole('textbox', { name: 'Filter holdings' }).waitFor()
  await page.waitForTimeout(1_000)
}

try {
  const desktop = await browser.newContext({ viewport: { width: 1440, height: 900 }, reducedMotion: 'no-preference' })
  const page = await desktop.newPage()
  watchConsole(page, 'desktop')
  await enterDemo(page)

  await page.getByRole('button', { name: /All portfolios/ }).click()
  const portfolioMenu = page.getByRole('menu').filter({ hasText: 'Manage portfolios' })
  await portfolioMenu.waitFor()
  check('portfolio popover opens', await portfolioMenu.isVisible())
  check('portfolio popover uses trigger-edge origin', (await portfolioMenu.evaluate((element) => getComputedStyle(element).transformOrigin)).split(' ')[0] === '0px')
  await page.getByRole('button', { name: /All portfolios/ }).click()
  await portfolioMenu.waitFor({ state: 'detached' })
  check('portfolio popover exits cleanly', true)

  await page.getByRole('button', { name: 'Filter', exact: true }).click()
  const filter = page.getByRole('region', { name: 'Portfolio filters' })
  await filter.waitFor()
  check('filter popover remains clickable', await filter.getByRole('button', { name: 'Add filter' }).isEnabled())
  check('filter popover uses trigger-edge origin', (await filter.evaluate((element) => getComputedStyle(element).transformOrigin)).split(' ')[0] === '0px')
  await page.getByRole('button', { name: 'Filter', exact: true }).click()
  await filter.waitFor({ state: 'detached' })

  await page.getByRole('button', { name: 'Columns' }).click()
  const dialog = page.getByRole('dialog', { name: 'Column Settings' })
  await dialog.waitFor()
  check('animated dialog remains interactive', await dialog.getByRole('checkbox', { name: 'Avg Buy Price' }).isEnabled())
  await page.waitForTimeout(300)
  const dialogStyle = await dialog.evaluate((element) => ({ inline: element.getAttribute('style'), opacity: getComputedStyle(element).opacity, transform: getComputedStyle(element).transform, display: getComputedStyle(element).display, visibility: getComputedStyle(element).visibility }))
  check('dialog settles without disappearing', await dialog.isVisible(), `columns expanded=${await page.getByRole('button', { name: 'Columns' }).getAttribute('aria-expanded')}, dialogs=${await page.getByRole('dialog').count()}, style=${JSON.stringify(dialogStyle)}`)
  await dialog.getByRole('button', { name: 'Close column settings' }).click()
  await dialog.waitFor({ state: 'detached' })
  check('dialog exits cleanly', true)

  await page.getByRole('button', { name: 'Open account menu' }).click()
  check('account menu remains interactive', await page.getByRole('menuitem', { name: /Billing & Subscription/ }).isEnabled())
  await page.getByRole('button', { name: 'Open account menu' }).click()
  await page.getByRole('menuitem', { name: /Billing & Subscription/ }).waitFor({ state: 'detached' })

  const pressButton = page.getByRole('button', { name: 'Refresh' })
  await pressButton.hover()
  const hoverTransform = await pressButton.evaluate((element) => getComputedStyle(element).transform)
  check('hover avoids distracting movement', hoverTransform === 'none')

  const mobile = await browser.newContext({ viewport: { width: 760, height: 900 }, reducedMotion: 'no-preference' })
  const mobilePage = await mobile.newPage()
  watchConsole(mobilePage, 'mobile')
  await enterDemo(mobilePage)
  await mobilePage.getByRole('button', { name: 'Open navigation' }).click()
  const drawer = mobilePage.locator('.mobile-drawer')
  await drawer.waitFor()
  check('mobile drawer opens', await drawer.isVisible())
  await mobilePage.getByRole('button', { name: 'Close menu' }).click()
  await drawer.waitFor({ state: 'detached' })
  check('mobile drawer exits cleanly', true)

  const reduced = await browser.newContext({ viewport: { width: 1440, height: 900 }, reducedMotion: 'reduce' })
  const reducedPage = await reduced.newPage()
  watchConsole(reducedPage, 'reduced-motion')
  await enterDemo(reducedPage)
  await reducedPage.getByRole('button', { name: /All portfolios/ }).click()
  const reducedMenu = reducedPage.getByRole('menu').filter({ hasText: 'Manage portfolios' })
  await reducedMenu.waitFor()
  check('reduced motion removes spatial popover movement', await reducedMenu.evaluate((element) => ['none', 'matrix(1, 0, 0, 1, 0, 0)'].includes(getComputedStyle(element).transform)))

  check('application console health', consoleIssues.length === 0, JSON.stringify(consoleIssues))
  console.log(JSON.stringify({ ok: true, baseUrl, checks, consoleIssues }, null, 2))
} finally {
  await browser.close()
}
