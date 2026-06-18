#!/usr/bin/env node
const fs = require('fs')
const path = require('path')

function parseArgs() {
  const args = process.argv.slice(2)
  const out = {}
  args.forEach((a) => {
    const m = a.match(/^--([^=]+)=(.*)$/)
    if (m) out[m[1]] = m[2]
  })
  return out
}

const opts = parseArgs()
const domain = opts.domain || process.env.DOMAIN
const packageName = opts.package || process.env.PACKAGE_NAME || 'com.handiwave.app'
const sha256 = opts.sha256 || process.env.APK_SHA256 || 'REPLACE_WITH_YOUR_APP_SHA256_FINGERPRINT'
const team = opts.team || process.env.APPLE_TEAM_ID || 'TEAMID'

if (!domain) {
  console.error('Error: provide --domain=your-domain.com or set DOMAIN env var')
  process.exit(1)
}

const outDir = path.join(process.cwd(), 'well-known')
fs.mkdirSync(outDir, { recursive: true })

const assetlinks = [
  {
    relation: ['delegate_permission/common.handle_all_urls'],
    target: {
      namespace: 'android_app',
      package_name: packageName,
      sha256_cert_fingerprints: [sha256],
    },
  },
]

fs.writeFileSync(path.join(outDir, 'assetlinks.json'), JSON.stringify(assetlinks, null, 2))

const apple = {
  applinks: {
    apps: [],
    details: [
      {
        appID: `${team}.${packageName}`,
        paths: ['/payment/callback', '/payments/*'],
      },
    ],
  },
}

fs.writeFileSync(path.join(outDir, 'apple-app-site-association'), JSON.stringify(apple, null, 2))

console.log('Generated:')
console.log(' -', path.join(outDir, 'assetlinks.json'))
console.log(' -', path.join(outDir, 'apple-app-site-association'))
console.log('\nUpload these files to your HTTPS host:')
console.log(` - https://${domain}/.well-known/assetlinks.json`)
console.log(` - https://${domain}/.well-known/apple-app-site-association`)
