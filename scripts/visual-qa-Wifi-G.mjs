import { chromium } from '@playwright/test'
import { mkdir } from 'node:fs/promises'
import { join, resolve } from 'node:path'
import { tmpdir } from 'node:os'

const baseUrl = process.env.MASTERDECK_QA_URL || 'http://127.0.0.1:4173'
const outputDir = process.env.MASTERDECK_QA_OUTPUT || join(tmpdir(), `masterdeck-qa-${Date.now()}`)
const executablePath = process.env.MASTERDECK_BROWSER_PATH || undefined
const fixturePath = resolve('tests/fixtures/superhero-sample.csv')
await mkdir(outputDir, { recursive: true })

const browser = await chromium.launch({ headless: true, executablePath })
const evidence = []
const consoleIssues = []
const checks = []

function check(name, condition, detail = '') {
  if (!condition) throw new Error(`${name} failed${detail ? `: ${detail}` : ''}`)
  checks.push({ name, status: 'pass', detail })
}

async function screenshot(page, name, fullPage = false) {
  const path = join(outputDir, `${name}.png`)
  await page.screenshot({ path, fullPage, animations: 'disabled' })
  evidence.push(path)
}

async function watchConsole(page, label) {
  page.on('console', (message) => {
    if (['error', 'warning'].includes(message.type())) consoleIssues.push({ page: label, type: message.type(), text: message.text() })
  })
  page.on('pageerror', (error) => consoleIssues.push({ page: label, type: 'pageerror', text: error.message }))
}

try {
  const desktop = await browser.newContext({ viewport: { width: 1440, height: 900 }, colorScheme: 'dark' })
  const page = await desktop.newPage()
  await watchConsole(page, 'desktop')
  await page.goto(baseUrl, { waitUntil: 'networkidle' })
  check('landing title', (await page.title()).includes('MASTERDECK'))
  check('landing identity', await page.getByRole('heading', { name: 'Know what your portfolio is really doing.' }).isVisible())
  check('landing signup control', await page.getByRole('banner').getByRole('button', { name: 'Try Masterdeck free' }).isVisible())
  check('landing pricing control', await page.getByRole('link', { name: 'See pricing' }).first().isVisible())

  const authPage = await desktop.newPage()
  await authPage.goto(baseUrl, { waitUntil: 'domcontentloaded' })
  await authPage.getByRole('banner').getByRole('button', { name: 'Try Masterdeck free' }).click()
  check('email sign-in control', await authPage.getByRole('textbox', { name: 'Email' }).isVisible())
  check('password sign-in control', await authPage.getByRole('textbox', { name: 'Password' }).isVisible())
  await authPage.close()
  await screenshot(page, 'desktop-landing')

  await page.evaluate(() => sessionStorage.setItem('masterdeck-demo', 'true'))
  await page.goto(`${baseUrl}/app`, { waitUntil: 'domcontentloaded' })
  await page.locator('h1').filter({ hasText: 'Portfolio overview' }).waitFor({ state: 'attached' })
  check('demo route', page.url().endsWith('/app'))
  check('desktop overflow', await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth))
  await screenshot(page, 'desktop-overview')

  await page.goto(`${baseUrl}/app/holdings`)
  await page.getByRole('heading', { name: 'Holdings', exact: true }).waitFor()
  await page.getByRole('searchbox', { name: 'Search holdings' }).fill('VGS')
  check('holdings search result', await page.getByText('VGS', { exact: true }).isVisible())
  check('holdings search excludes other rows', await page.getByText('AAPL', { exact: true }).count() === 0)

  await page.goto(`${baseUrl}/app/transactions`)
  await page.getByRole('heading', { name: 'Transactions', exact: true }).waitFor()
  await page.getByRole('combobox', { name: 'Filter transaction type' }).selectOption('DIVIDEND')
  await page.getByRole('searchbox', { name: 'Search transactions' }).fill('VGS')
  check('transaction filters', (await page.getByText('Showing 1–2 of 2').count()) + (await page.getByText('Showing 1–1 of 1').count()) > 0)

  await page.goto(`${baseUrl}/app/income`)
  await page.getByRole('heading', { name: 'Income', exact: true }).waitFor()
  check('current FY income', await page.getByText('VGS quarterly distribution').isVisible())

  await page.goto(`${baseUrl}/app/tax`)
  await page.getByRole('heading', { name: 'Tax overview', exact: true }).waitFor()
  await page.getByRole('combobox', { name: 'Sale allocation method' }).selectOption('hifo')
  check('tax method state', await page.getByRole('combobox', { name: 'Sale allocation method' }).inputValue() === 'hifo')
  check('tax method reflected in summary', await page.getByText(/Calculated using HIFO/).isVisible())

  await page.goto(`${baseUrl}/app/connections`)
  await page.getByRole('heading', { name: 'Connections', exact: true }).waitFor()
  await page.setInputFiles('input[type="file"]', fixturePath)
  await page.getByText('superhero-sample.csv', { exact: true }).waitFor()
  await page.locator('.import-counts').waitFor()
  const importCounts = await page.locator('.import-counts').innerText()
  check('Superhero holdings parsed', importCounts.includes('1 holdings'), importCounts)
  check('Superhero transactions parsed', importCounts.includes('2 transactions'), importCounts)
  check('Superhero raw file policy', await page.getByText(/raw file is not retained/i).isVisible())
  await screenshot(page, 'desktop-connections-import')

  await page.goto(`${baseUrl}/app/settings`)
  await page.getByRole('heading', { name: 'Settings', exact: true }).waitFor()
  await page.getByRole('button', { name: /Portfolio preferences/ }).click()
  await page.getByRole('checkbox', { name: /Privacy mode/ }).check()
  await page.getByRole('button', { name: 'Save changes' }).click()
  await page.getByText('Demo preferences updated for this session.').waitFor()
  check('privacy mode state', await page.locator('.app-shell.privacy-on').count() === 1)
  await desktop.close()

  const mobile = await browser.newContext({ viewport: { width: 390, height: 844 }, colorScheme: 'dark' })
  await mobile.addInitScript(() => sessionStorage.setItem('masterdeck-demo', 'true'))
  const mobilePage = await mobile.newPage()
  await watchConsole(mobilePage, 'mobile')
  await mobilePage.goto(baseUrl, { waitUntil: 'networkidle' })
  await mobilePage.goto(`${baseUrl}/app`, { waitUntil: 'domcontentloaded' })
  await mobilePage.locator('h1').filter({ hasText: 'Portfolio overview' }).waitFor({ state: 'attached' })
  check('mobile overflow', await mobilePage.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth))
  check('mobile navigation', await mobilePage.getByRole('navigation', { name: 'Mobile portfolio navigation' }).isVisible())
  check('desktop sidebar hidden on mobile', await mobilePage.locator('.sidebar').evaluate((element) => getComputedStyle(element).display === 'none'))
  await screenshot(mobilePage, 'mobile-overview', true)
  await mobilePage.getByRole('navigation', { name: 'Mobile portfolio navigation' }).getByRole('link', { name: 'Activity' }).click()
  await mobilePage.getByRole('heading', { name: 'Transactions', exact: true }).waitFor()
  check('mobile activity route', mobilePage.url().endsWith('/app/transactions'))
  check('mobile holdings overflow', await mobilePage.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth))
  await screenshot(mobilePage, 'mobile-holdings')
  await mobile.close()

  check('application console health', consoleIssues.length === 0, JSON.stringify(consoleIssues))
  console.log(JSON.stringify({ ok: true, baseUrl, checks, evidence, consoleIssues }, null, 2))
} finally {
  await browser.close()
}
