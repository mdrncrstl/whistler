import { chromium } from '@playwright/test'
import { mkdir } from 'node:fs/promises'
import { resolve } from 'node:path'

const baseUrl = process.env.MASTERDECK_QA_URL || 'http://127.0.0.1:4173'
const outputDir = resolve('qa')
await mkdir(outputDir, { recursive: true })

const browser = await chromium.launch({ headless: true })
const checks = []
const issues = []

function check(name, condition, detail = '') {
  if (!condition) throw new Error(`${name} failed${detail ? `: ${detail}` : ''}`)
  checks.push({ name, detail })
}

function watch(page, label) {
  page.on('console', (message) => {
    if (['error', 'warning'].includes(message.type())) issues.push({ label, type: message.type(), text: message.text() })
  })
  page.on('pageerror', (error) => issues.push({ label, type: 'pageerror', text: error.message }))
}

try {
  const desktop = await browser.newContext({ viewport: { width: 1440, height: 1000 }, colorScheme: 'light', permissions: ['clipboard-read', 'clipboard-write'] })
  const page = await desktop.newPage()
  watch(page, 'desktop')
  await page.goto(baseUrl, { waitUntil: 'networkidle' })
  check('landing title', (await page.title()).includes('MASTERDECK'))
  await page.getByRole('button', { name: 'Explore demo' }).first().click()
  await page.waitForURL('**/app')
  await page.getByRole('button', { name: 'Open account menu' }).click()
  await page.getByRole('menuitem', { name: 'Refer a Friend' }).click()
  await page.waitForURL('**/app/referrals')
  await page.getByRole('heading', { name: 'Refer & earn' }).waitFor()
  check('account menu referral navigation', page.url().endsWith('/app/referrals'))
  check('reward proposition', await page.getByRole('heading', { name: /Give A\$20/ }).isVisible())
  check('activity ledger', await page.getByRole('heading', { name: 'Referral activity' }).isVisible())
  check('rules and fair use', await page.getByText('Fair-use terms').isVisible())
  check('desktop overflow', await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth))
  await page.getByRole('button', { name: 'Copy link' }).click()
  await page.getByText('Your personal referral link is copied.').waitFor()
  const copied = await page.evaluate(() => navigator.clipboard.readText())
  check('copy interaction', copied.endsWith('/?ref=MD-DEMO2026'), copied)
  await page.screenshot({ path: resolve(outputDir, 'referrals-desktop.png'), fullPage: true, animations: 'disabled' })
  await desktop.close()

  const mobile = await browser.newContext({ viewport: { width: 390, height: 844 }, colorScheme: 'dark' })
  await mobile.addInitScript(() => window.sessionStorage.setItem('masterdeck-demo', 'true'))
  const mobilePage = await mobile.newPage()
  watch(mobilePage, 'mobile')
  await mobilePage.goto(`${baseUrl}/app/referrals`, { waitUntil: 'networkidle' })
  await mobilePage.getByRole('heading', { name: 'Refer & earn' }).waitFor()
  check('mobile route', mobilePage.url().endsWith('/app/referrals'))
  check('mobile overflow', await mobilePage.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth))
  check('mobile share actions', await mobilePage.getByRole('button', { name: 'Share' }).isVisible() && await mobilePage.getByRole('button', { name: 'Email invite' }).isVisible())
  check('mobile reward rows', await mobilePage.getByText('Amelia').isVisible())
  await mobilePage.screenshot({ path: resolve(outputDir, 'referrals-mobile.png'), fullPage: true, animations: 'disabled' })
  await mobile.close()

  check('console health', issues.length === 0, JSON.stringify(issues))
  console.log(JSON.stringify({ ok: true, baseUrl, checks, issues }, null, 2))
} finally {
  await browser.close()
}
