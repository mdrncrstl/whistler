import { chromium } from 'playwright'
import assert from 'node:assert/strict'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const browser = await chromium.launch()
try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 }, reducedMotion: 'reduce' })
  await page.goto(process.env.MENU_QA_URL || 'http://127.0.0.1:4184')
  await page.evaluate(() => document.fonts.ready)
  for (const width of [2560, 1440, 1024, 900, 861]) {
    await page.setViewportSize({ width, height: 1000 })
    for (const name of ['Features', 'Who it’s for', 'Company']) {
      await page.mouse.move(20, 600)
      await page.waitForTimeout(400)
      const trigger = page.getByRole('button', { name, exact: true })
      await trigger.hover()
      const a = await trigger.boundingBox()
      const d = await page.locator('.md-menu-panel').boundingBox()
      assert(d, `${name} opens at ${width}`)
      assert(Math.abs(a.x - d.x) < 1, `${name} anchored at ${width}`)
      assert(d.x >= 0 && d.x + d.width <= width, `${name} fits at ${width}`)
      assert(Math.abs(d.y - a.y - a.height) < 1, 'No pointer gap')
    }
    console.log(`Desktop ${width}: all panels anchored and within viewport`)
  }
  await page.setViewportSize({ width: 1440, height: 1000 })
  await page.getByRole('button', { name: 'Company', exact: true }).hover()
  await page.screenshot({ path: join(tmpdir(), 'menu-desktop.png') })
  const t = await page.getByRole('button', { name: 'Company', exact: true }).boundingBox()
  const d = await page.locator('.md-menu-panel').boundingBox()
  for (let i = 1; i <= 25; i++) {
    await page.mouse.move(t.x + t.width / 2 + (d.x + d.width - 25 - t.x - t.width / 2) * i / 25,
      t.y + t.height / 2 + (d.y + 20 - t.y - t.height / 2) * i / 25)
    await page.waitForTimeout(35)
    assert.equal(await page.locator('.md-menu-panel').count(), 1, 'Slow diagonal keeps menu open')
    assert.equal(await page.locator('.md-menu-panel').getAttribute('id'), 'desktop-Company')
  }
  await page.waitForTimeout(450)
  assert.equal(await page.locator('.md-menu-panel').count(), 1)
  await page.mouse.move(50, 500)
  await page.waitForTimeout(450)
  assert.equal(await page.locator('.md-menu-panel').count(), 0, 'Pointer leaving closes menu')
  const company = page.getByRole('button', { name: 'Company', exact: true })
  await company.focus()
  await page.keyboard.press('ArrowDown')
  await page.waitForTimeout(100)
  assert(await page.locator('.md-menu-panel a').first().evaluate(e => e === document.activeElement))
  await page.keyboard.press('Escape')
  assert.equal(await page.locator('.md-menu-panel').count(), 0)
  assert(await company.evaluate(e => e === document.activeElement))
  await company.click()
  assert.equal(await page.locator('.md-menu-panel').count(), 1, 'Mouse click retains hovered panel')
  await page.mouse.click(50, 500)
  assert.equal(await page.locator('.md-menu-panel').count(), 0, 'Outside click closes')
  console.log('Slow diagonal, hover leave, click, outside click, keyboard and Escape passed')

  for (const width of [320, 390, 768, 860]) {
    await page.setViewportSize({ width, height: 844 })
    await page.getByRole('button', { name: 'Toggle mobile menu' }).click()
    const nav = page.getByRole('navigation', { name: 'Mobile navigation' })
    await nav.getByRole('button', { name: 'Features', exact: true }).click()
    assert.equal(await nav.locator('.md-menu-panel a').count(), 6)
    assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth))
    if (width === 390) await page.screenshot({ path: join(tmpdir(), 'menu-mobile.png') })
    await nav.getByRole('button', { name: 'Company', exact: true }).click()
    assert.equal(await nav.locator('.md-menu-panel a').count(), 3)
    await page.getByRole('button', { name: 'Toggle mobile menu' }).click()
    await page.waitForTimeout(200)
    assert.equal(await nav.count(), 0)
    console.log(`Mobile ${width}: accordion, close and no overflow passed`)
  }
} finally { await browser.close() }
