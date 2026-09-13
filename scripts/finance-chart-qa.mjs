import { chromium } from 'playwright'
import assert from 'node:assert/strict'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { researchStock } from '../api/stock-research.mjs'

const stock = await researchStock('GOOGL')
const browser = await chromium.launch()
const base = process.env.CHART_QA_URL || 'http://127.0.0.1:4184'
try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 }, reducedMotion: 'reduce' })
  await page.addInitScript(() => sessionStorage.setItem('masterdeck-demo', 'true'))
  const errors = []
  page.on('pageerror', error => errors.push(error.message))
  async function compare(plot, name) {
    await plot.scrollIntoViewIfNeeded()
    const box = await plot.boundingBox()
    const from = box.x + box.width * .3, to = box.x + box.width * .7, y = box.y + 150
    await page.mouse.move(from, y)
    await plot.screenshot({ path: join(tmpdir(), `finance-${name}-hover.png`) })
    await page.mouse.down(); await page.mouse.move(to, y, { steps: 30 }); await page.mouse.up()
    assert.equal(await plot.locator('.finance-marker').count(), 2)
    assert.equal(await plot.locator('.finance-selection-band').count(), name === 'bar' ? 0 : 1)
    if (name !== 'bar') assert.equal(await plot.locator('.finance-pointer-tooltip').count(), 1)
    const forward = await plot.locator('.finance-readout').innerText()
    await plot.screenshot({ path: join(tmpdir(), `finance-${name}-drag.png`) })
    await page.mouse.move(to, y); await page.mouse.down(); await page.mouse.move(from, y, { steps: 30 }); await page.mouse.up()
    assert.equal(await plot.locator('.finance-readout').innerText(), forward, 'Reverse drag preserves chronological result')
    await plot.locator('svg').focus(); await page.keyboard.press('Escape')
    assert.equal(await plot.locator('.finance-readout').count(), 0)
    await page.mouse.move(5, 5)
    await plot.screenshot({ path: join(tmpdir(), `finance-${name}-default.png`) })
    console.log(name, forward)
  }
  await page.goto(`${base}/app`)
  await page.locator('.finance-plot').waitFor()
  await page.evaluate(() => document.fonts.ready)
  await compare(page.locator('.finance-plot').first(), 'portfolio')
  await page.getByRole('button', { name: 'Percent', exact: true }).click()
  await compare(page.locator('.finance-plot').first(), 'percent')
  await page.getByRole('button', { name: 'Amount', exact: true }).click()
  await page.getByRole('button', { name: 'Bar', exact: true }).click()
  await compare(page.locator('.finance-plot').first(), 'bar')
  await page.goto(`${base}/app/holdings/AAPL`)
  await page.locator('.finance-plot').first().waitFor()
  await compare(page.locator('.finance-plot').first(), 'holding')
  await page.route('**/api/stock-research?*', route => route.fulfill({ json: stock }))
  await page.goto(`${base}/app/tools/assistant`)
  await page.getByRole('textbox', { name: 'Ask Masterdeck AI' }).fill('GOOGL')
  await page.getByRole('button', { name: 'Send question' }).click()
  await page.locator('.finance-plot').waitFor()
  await compare(page.locator('.finance-plot'), 'stock')
  const plot = page.locator('.finance-plot'), box = await plot.boundingBox()
  assert.equal(await plot.getAttribute('data-resolution'), 'daily')
  assert(Number(await plot.getAttribute('data-points')) > 200)
  const start = Date.parse(stock.points[0].date), end = Date.parse(stock.points.at(-1).date)
  const px = date => box.x + 70 + (Date.parse(date) - start) / (end - start) * (box.width - 94)
  const a = stock.points.find(p => p.date.startsWith('2026-02-26')), b = stock.points.find(p => p.date.startsWith('2026-05-21'))
  if (a && b) {
    await page.mouse.move(px(a.date), box.y + 160); await page.mouse.down(); await page.mouse.move(px(b.date), box.y + 160, { steps: 30 }); await page.mouse.up()
    const text = await plot.locator('.finance-readout').innerText()
    assert(text.includes(((b.price / a.price - 1) * 100).toFixed(2) + '%'))
    console.log('Google reference dates:', text)
    await plot.screenshot({ path: join(tmpdir(), 'finance-google-reference-drag.png') })
  }
  await page.setViewportSize({ width: 390, height: 844 })
  await plot.scrollIntoViewIfNeeded()
  assert(await plot.evaluate(e => e.scrollWidth <= e.clientWidth))
  await plot.screenshot({ path: join(tmpdir(), 'finance-stock-mobile.png') })
  assert.deepEqual(errors, [])
  console.log('All chart checks passed; screenshots in', tmpdir())
} finally { await browser.close() }
