import { createRequire } from 'node:module'
import { pathToFileURL } from 'node:url'
import path from 'node:path'

const require = createRequire(import.meta.url)
const { chromium } = require('/Users/macbookpro2015/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright')
const root = path.resolve(import.meta.dirname, '..')
const source = path.join(root, 'marketing', 'professionals-social-flyer.html')
const output = path.join(root, 'marketing', 'handiwave-professionals-early-access-social.png')
const pdfOutput = path.join(root, 'marketing', 'handiwave-professionals-early-access-print.pdf')

const browser = await chromium.launch({
  executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  headless: true,
})
const page = await browser.newPage({ viewport: { width: 1080, height: 1350 }, deviceScaleFactor: 1 })
await page.goto(pathToFileURL(source).href, { waitUntil: 'networkidle' })
await page.screenshot({ path: output, fullPage: true })
await page.pdf({
  path: pdfOutput,
  printBackground: true,
  width: '1080px',
  height: '1350px',
  margin: { top: 0, right: 0, bottom: 0, left: 0 },
})
await browser.close()

console.log(output)
console.log(pdfOutput)
