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
  await page.goto(`${baseUrl}/app`, { waitUntil: 'networkidle' })
  await page.getByRole('heading', { name: 'Portfolio overview' }).waitFor()

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

  await page.goto(`${baseUrl}/app/holdings/AAPL`, { waitUntil: 'networkidle' })
  await page.getByRole('heading', { name: 'Apple Inc.', exact: true }).waitFor()
  const holdingPro = page.getByRole('button', { name: 'Pro graph', exact: true }).first()
  await holdingPro.click()
  await openAndClose(page.locator('.finance-pro-menu-trigger').first())

  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto(`${baseUrl}/app`, { waitUntil: 'networkidle' })
  await page.getByRole('button', { name: 'Open navigation' }).click()
  const drawer = page.locator('.drawer-panel')
  await drawer.waitFor({ state: 'visible' })
  const drawerPortfolio = drawer.locator('.portfolio-switcher-wrap')
  await drawer.locator('.portfolio-switcher').click()
  await page.waitForTimeout(20)
  assert.equal(await drawerPortfolio.evaluate(element => element.classList.contains('is-open')), true, 'mobile portfolio menu opens')
  assert.equal(await drawerPortfolio.evaluate(element => getComputedStyle(element, '::after').display), 'none', 'mobile drawer does not reserve a hover triangle')
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1), true, 'mobile app has no horizontal overflow')
  await page.screenshot({ path: join(tmpdir(), 'masterdeck-transition-mobile.png') })

  assert.deepEqual(errors, [], `no page errors: ${errors.join('; ')}`)
  console.log('App popovers, pointer triangles, Escape dismissal and pro chart menus passed')
} finally {
  await browser.close()
}
