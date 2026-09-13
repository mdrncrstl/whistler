/**
 * Hover parity check against values measured off Navexa's own UI.
 *
 * Navexa (app.navexa.com styles.css + reference captures in qa/):
 *   --color-row-hover: color-mix(in srgb, var(--color-text) 4.5%, transparent)
 *   hovered row      rgb(240,241,243) on rgb(250,251,253)  -> 10/255 darker
 *   hovered metric   rgb(243,245,247) on rgb(250,251,252)  -> 7/255 darker
 *   transition       .15s ease
 */
import { chromium } from '@playwright/test'
const base = 'http://127.0.0.1:4173'
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' })
const results = []
const fail = []

function check(name, ok, detail) {
  results.push(`${ok ? 'PASS' : 'FAIL'}  ${name.padEnd(46)} ${detail}`)
  if (!ok) fail.push(name)
}

const rgb = (s) => (s.match(/\d+/g) || []).slice(0, 3).map(Number)
const luma = ([r, g, b]) => 0.299 * r + 0.587 * g + 0.114 * b

async function open(theme) {
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 })
  const page = await ctx.newPage()
  await page.goto(base, { waitUntil: 'domcontentloaded' })
  await page.evaluate((t) => { sessionStorage.setItem('masterdeck-demo', 'true'); if (t === 'dark') document.documentElement.setAttribute('data-theme', 'dark') }, theme)
  await page.goto(base + '/app', { waitUntil: 'networkidle' })
  await page.evaluate((t) => { if (t === 'dark') document.documentElement.setAttribute('data-theme', 'dark') }, theme)
  await page.waitForSelector('.portfolio-metrics .metric-tab')
  await page.waitForTimeout(900)
  return page
}

for (const theme of ['light', 'dark']) {
  const page = await open(theme)

  // --- metric cell -----------------------------------------------------------
  const tab = page.locator('.portfolio-metrics .metric-tab').nth(2)
  const idleTab = await tab.evaluate(el => getComputedStyle(el).backgroundColor)
  const stripBg = await page.locator('.portfolio-page').evaluate(el => getComputedStyle(el).backgroundColor)
  await tab.hover()
  await page.waitForTimeout(400)
  const hotTab = await tab.evaluate(el => getComputedStyle(el).backgroundColor)
  check(`[${theme}] metric hover changes background`, idleTab !== hotTab, `${idleTab} -> ${hotTab}`)

  const box = await tab.boundingBox()
  const shot = await page.screenshot({ clip: { x: box.x + 4, y: box.y + 60, width: 40, height: 12 } })
  const neighbour = page.locator('.portfolio-metrics .metric-tab').nth(4)
  const nbox = await neighbour.boundingBox()
  const shotIdle = await page.screenshot({ clip: { x: nbox.x + 4, y: nbox.y + 60, width: 40, height: 12 } })
  const { createCanvas, loadImage } = { createCanvas: null, loadImage: null }
  void shot; void shotIdle; void createCanvas; void loadImage

  // measure through the DOM rather than pixels: resolve the mix against the page
  const delta = await page.evaluate(() => {
    const probe = document.createElement('div')
    probe.style.cssText = 'position:fixed;left:-9999px;width:10px;height:10px;background:var(--hover-soft)'
    document.body.appendChild(probe)
    const soft = getComputedStyle(probe).backgroundColor
    probe.style.background = 'var(--hover)'
    const strong = getComputedStyle(probe).backgroundColor
    probe.remove()
    return { soft, strong, text: getComputedStyle(document.documentElement).getPropertyValue('--text').trim() }
  })
  const softAlpha = Number((delta.soft.match(/[\d.]+\)$/) || ['1)'])[0].replace(')', '')) || 1
  const strongAlpha = Number((delta.strong.match(/[\d.]+\)$/) || ['1)'])[0].replace(')', '')) || 1
  check(`[${theme}] metric hover weight ~3% ink`, Math.abs(softAlpha - 0.03) < 0.006, `alpha ${softAlpha}`)
  check(`[${theme}] row hover weight ~4.5% ink`, Math.abs(strongAlpha - 0.045) < 0.006, `alpha ${strongAlpha}`)

  const tabTransition = await tab.evaluate(el => getComputedStyle(el).transitionDuration)
  check(`[${theme}] metric transition is .15s`, tabTransition.startsWith('0.15s'), tabTransition)

  // The metric already displays the full value and exposes it through aria-label. A second
  // popup above the strip is redundant and gets clipped when the page is near its top edge.
  const metricPopupCount = await page.locator('.metric-hover-value').count()
  check(`[${theme}] metric has no duplicate value popup`, metricPopupCount === 0, `count ${metricPopupCount}`)

  // --- table row -------------------------------------------------------------
  const row = page.locator('.portfolio-holdings tbody tr').filter({ hasNot: page.locator('td[colspan]') }).nth(1)
  await row.scrollIntoViewIfNeeded()
  const cell = row.locator('td').first()
  const idleRow = await cell.evaluate(el => getComputedStyle(el).backgroundColor)
  await row.hover(); await page.waitForTimeout(350)
  const hotRow = await cell.evaluate(el => getComputedStyle(el).backgroundColor)
  check(`[${theme}] row hover changes background`, idleRow !== hotRow, `${idleRow} -> ${hotRow}`)

  // --- chart colour ----------------------------------------------------------
  await page.goto(base + '/app', { waitUntil: 'networkidle' })
  await page.evaluate((t) => { if (t === 'dark') document.documentElement.setAttribute('data-theme', 'dark') }, theme)
  await page.waitForSelector('.portfolio-main-chart path.recharts-area-curve', { timeout: 15000 })
  const stroke = await page.evaluate(() => {
    const path = document.querySelector('.portfolio-main-chart path.recharts-area-curve')
    return getComputedStyle(path).stroke
  })
  const [r, g, b] = rgb(stroke)
  check(`[${theme}] portfolio line is green not blue`, g > r + 30 && g > b + 20, `${stroke}`)
  void stripBg; void luma
  await page.close()
}

console.log(results.join('\n'))
console.log(fail.length ? `\n${fail.length} FAILED` : '\nALL PASS')
await browser.close()
process.exit(fail.length ? 1 : 0)
