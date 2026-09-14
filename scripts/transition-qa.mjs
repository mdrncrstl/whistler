import { chromium } from 'playwright'
import assert from 'node:assert/strict'
import { join } from 'node:path'
import { tmpdir } from 'node:os'

const baseUrl = process.env.TRANSITION_QA_URL || 'http://127.0.0.1:4173'
const browser = await chromium.launch()

try {
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, reducedMotion: 'reduce' })
  await context.addInitScript(() => window.sessionStorage.setItem('masterdeck-demo', 'true'))
  const page = await context.newPage()
  const errors = []
  page.on('pageerror', error => errors.push(error.message))
  for (const legacyBasePath of ['/workspace', '/app']) {
    await page.goto(`${baseUrl}${legacyBasePath}/tax/mytax?from=2025-07-01&to=2026-06-30#summary`, { waitUntil: 'networkidle' })
    const legacyLocation = new URL(page.url())
    assert.equal(legacyLocation.pathname, '/deck/tax/mytax', `${legacyBasePath} redirects to the canonical deck path`)
    assert.equal(legacyLocation.search, '?from=2025-07-01&to=2026-06-30', `${legacyBasePath} keeps its query string`)
    assert.equal(legacyLocation.hash, '#summary', `${legacyBasePath} keeps its hash`)
  }
  await page.goto(`${baseUrl}/deck`, { waitUntil: 'networkidle' })
  await page.getByRole('heading', { name: 'Portfolio overview' }).waitFor()

  const incomeTab = page.getByRole('tab', { name: /Income Return/ })
  await page.getByRole('button', { name: 'About Income Return' }).click()
  const incomeDefinition = page.getByRole('tooltip', { name: 'Income Return definition' })
  await incomeDefinition.waitFor({ state: 'visible' })
  assert.match(await incomeDefinition.innerText(), /Recorded dividends, distributions and interest/, 'income return info explains the metric')
  assert.equal(await incomeTab.getAttribute('aria-selected'), 'false', 'info control does not switch the chart metric')
  await page.screenshot({ path: join(tmpdir(), 'masterdeck-income-return-info.png') })
  await page.keyboard.press('Escape')
  await incomeDefinition.waitFor({ state: 'hidden' })

  const openAndClose = async (trigger, panel = page.locator('.t-dropdown.is-open').last()) => {
    await trigger.click()
    await page.waitForTimeout(20)
    await panel.waitFor({ state: 'visible' })
    assert.equal(await trigger.locator('xpath=..').evaluate(element => element.classList.contains('is-open')), true, 'menu anchor opens with its popover')
    assert.equal(await trigger.locator('xpath=..').evaluate(element => getComputedStyle(element, '::after').pointerEvents), 'auto', 'open menu has a pointer triangle')
    assert.equal(await panel.evaluate(element => element.classList.contains('t-dropdown')), true, 'popover uses transitions.dev dropdown')
    await page.keyboard.press('Escape')
    await page.waitForTimeout(10)
    assert.equal(await page.locator('.t-dropdown.is-open').count(), 0, 'Escape closes the popover')
  }

  const toolbarMenuTrigger = (index) => page.locator('.portfolio-toolbar .menu-anchor').nth(index).locator(':scope > button')
  await openAndClose(toolbarMenuTrigger(0))
  await openAndClose(toolbarMenuTrigger(1))
  await openAndClose(toolbarMenuTrigger(2))
  await openAndClose(page.locator('.holdings-head .menu-anchor').first().locator(':scope > button'))
  await openAndClose(page.locator('.holdings-head .menu-anchor').last().locator(':scope > button'))

  const rowAction = page.locator('button[aria-label^="Actions for "]').first()
  await rowAction.scrollIntoViewIfNeeded()
  await openAndClose(rowAction)

  await page.getByRole('button', { name: 'Pro graph', exact: true }).click()
  const proTrigger = page.locator('.finance-pro-menu-trigger').first()
  await proTrigger.click()
  await page.waitForTimeout(20)
  await page.screenshot({ path: join(tmpdir(), 'masterdeck-transition-app-menu.png') })
  assert.equal(await page.locator('.t-dropdown.is-open').count(), 1, 'pro chart menu opens')
  await page.keyboard.press('Escape')
  await page.waitForTimeout(10)
  assert.equal(await page.locator('.t-dropdown.is-open').count(), 0, 'Escape closes the pro chart menu')

  const motionContext = await browser.newContext({ viewport: { width: 1440, height: 1000 }, reducedMotion: 'no-preference' })
  const motionPage = await motionContext.newPage()
  const motionErrors = []
  motionPage.on('pageerror', error => motionErrors.push(error.message))
  await motionContext.addInitScript(() => window.sessionStorage.setItem('masterdeck-demo', 'true'))
  await motionPage.goto(`${baseUrl}/deck`, { waitUntil: 'networkidle' })
  const motionProButton = motionPage.getByRole('button', { name: 'Pro graph', exact: true }).first()
  if (await motionProButton.getAttribute('aria-pressed') !== 'true') await motionProButton.click()
  const proReveal = motionPage.locator('.finance-pro-reveal').first()
  await proReveal.waitFor({ state: 'visible' })
  await motionPage.waitForTimeout(420)
  assert.ok(await proReveal.evaluate(element => element.getBoundingClientRect().height > 0), 'pro graph reveal settles at its content height')
  assert.equal(await proReveal.evaluate(element => getComputedStyle(element).overflow), 'visible', 'pro graph reveal keeps anchored menus reachable')

  const periodBar = motionPage.locator('.finance-periods.t-tabs').first()
  const periodPill = periodBar.locator('.t-tabs-pill')
  const oneYear = periodBar.getByRole('button', { name: '1Y', exact: true })
  const max = periodBar.getByRole('button', { name: 'MAX', exact: true })
  if (await oneYear.getAttribute('aria-pressed') === 'true') await max.click()
  const beforePeriodTransform = await periodPill.evaluate(element => getComputedStyle(element).transform)
  await oneYear.click()
  await motionPage.waitForTimeout(30)
  const duringPeriodTransform = await periodPill.evaluate(element => getComputedStyle(element).transform)
  const periodTransition = await periodPill.evaluate(element => getComputedStyle(element).transitionProperty)
  assert.notEqual(beforePeriodTransform, duringPeriodTransform, 'period selection moves the shared tab pill')
  assert.match(periodTransition, /transform/, 'period selection uses the tab transition token')
  assert.ok(await periodPill.evaluate(element => element.getBoundingClientRect().width > 0), 'active period pill is measured')
  assert.deepEqual(motionErrors, [], `no motion page errors: ${motionErrors.join('; ')}`)
  await motionContext.close()

  await page.goto(`${baseUrl}/deck/holdings/AAPL`, { waitUntil: 'networkidle' })
  await page.getByRole('heading', { name: 'Apple Inc.', exact: true, level: 1 }).waitFor()
  const holdingPro = page.getByRole('button', { name: 'Pro graph', exact: true }).first()
  await holdingPro.click()
  await openAndClose(page.locator('.finance-pro-menu-trigger').first())

  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto(`${baseUrl}/deck`, { waitUntil: 'networkidle' })
  await page.getByRole('button', { name: 'Open navigation' }).click()
  const drawer = page.locator('.drawer-panel')
  await drawer.waitFor({ state: 'visible' })
  const drawerPortfolio = drawer.locator('.portfolio-switcher-wrap')
  await drawer.locator('.portfolio-switcher').click()
  await page.waitForTimeout(20)
  assert.equal(await drawerPortfolio.evaluate(element => element.classList.contains('is-open')), true, 'mobile portfolio menu opens')
  assert.equal(await drawerPortfolio.evaluate(element => getComputedStyle(element, '::after').display), 'none', 'mobile drawer does not reserve a hover triangle')
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1), true, 'mobile app has no horizontal overflow')
  await page.keyboard.press('Escape')
  await drawer.waitFor({ state: 'hidden' })
  await page.getByRole('button', { name: 'About Income Return' }).click()
  const mobileIncomeDefinition = page.getByRole('tooltip', { name: 'Income Return definition' })
  await mobileIncomeDefinition.waitFor({ state: 'visible' })
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1), true, 'mobile income definition has no horizontal overflow')
  await page.screenshot({ path: join(tmpdir(), 'masterdeck-income-return-info-mobile.png') })
  await page.keyboard.press('Escape')
  await mobileIncomeDefinition.waitFor({ state: 'hidden' })
  await page.screenshot({ path: join(tmpdir(), 'masterdeck-transition-mobile.png') })

  assert.deepEqual(errors, [], `no page errors: ${errors.join('; ')}`)
  console.log('Canonical deck route, legacy redirects, app popovers, pointer triangles, Escape dismissal and pro chart menus passed')
} finally {
  await browser.close()
}
