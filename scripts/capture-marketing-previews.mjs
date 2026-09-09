import { chromium } from '@playwright/test'
import { resolve } from 'node:path'

const baseUrl = process.env.MASTERDECK_PREVIEW_URL || 'http://127.0.0.1:4173'
const browser = await chromium.launch({ headless: true })
const context = await browser.newContext({
  viewport: { width: 1440, height: 900 },
  deviceScaleFactor: 2,
  colorScheme: 'light',
})

await context.addInitScript(() => {
  window.sessionStorage.setItem('masterdeck-demo', 'true')
})

const page = await context.newPage()
const consoleIssues = []
page.on('console', (message) => {
  if (['error', 'warning'].includes(message.type()) && !message.text().includes('Reduced Motion enabled')) {
    consoleIssues.push(`${message.type()}: ${message.text()}`)
  }
})
page.on('pageerror', (error) => consoleIssues.push(`pageerror: ${error.message}`))

const captures = [
  { route: '/app', ready: '.portfolio-page', file: 'portfolio-focus.png', clipY: 110 },
  { route: '/app/reports/performance', ready: 'h1', file: 'performance-focus.png', clipY: 32 },
  { route: '/app/tax/capital-gains', ready: 'h1', file: 'tax-focus.png', clipY: 32 },
]

for (const capture of captures) {
  await page.goto(`${baseUrl}${capture.route}`, { waitUntil: 'networkidle' })
  await page.locator(capture.ready).first().waitFor()
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.screenshot({
    path: resolve('public', 'marketing', capture.file),
    animations: 'disabled',
    clip: { x: 240, y: capture.clipY, width: 1180, height: 648 },
  })
}

await browser.close()

if (consoleIssues.length) {
  throw new Error(`Preview capture produced console issues:\n${consoleIssues.join('\n')}`)
}

console.log(`Captured ${captures.length} focused product previews at 2x resolution.`)
