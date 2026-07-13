#!/usr/bin/env node

const fs = require('fs')
const path = require('path')

const root = process.cwd()
const checks = []

function addCheck(label, ok, detail) {
  checks.push({ detail, label, ok })
}

function exists(relativePath) {
  return fs.existsSync(path.join(root, relativePath))
}

function readEnvFile() {
  const envPath = path.join(root, '.env')

  if (!fs.existsSync(envPath)) {
    return {}
  }

  return fs.readFileSync(envPath, 'utf8')
    .split(/\r?\n/)
    .reduce((env, line) => {
      const trimmed = line.trim()

      if (!trimmed || trimmed.startsWith('#') || !trimmed.includes('=')) {
        return env
      }

      const [key, ...valueParts] = trimmed.split('=')
      env[key.trim()] = valueParts.join('=').trim()
      return env
    }, {})
}

function isValidPublicCallback(value) {
  if (!value) {
    return true
  }

  try {
    const parsed = new URL(value)

    return parsed.protocol === 'https:' && parsed.pathname === '/payment/callback'
  } catch {
    return false
  }
}

const env = readEnvFile()
const projectRefPath = path.join(root, 'supabase/.temp/project-ref')
const projectRef = fs.existsSync(projectRefPath)
  ? fs.readFileSync(projectRefPath, 'utf8').trim()
  : ''

addCheck('.env exists', exists('.env'), 'Copy .env.example to .env and fill Vite Supabase values.')
addCheck('VITE_SUPABASE_URL is set', Boolean(env.VITE_SUPABASE_URL), 'Required for browser calls to Supabase.')
addCheck('VITE_SUPABASE_ANON_KEY is set', Boolean(env.VITE_SUPABASE_ANON_KEY), 'Required for browser auth and edge function calls.')
addCheck(
  'Optional VITE_PAYMENT_CALLBACK_URL is valid',
  isValidPublicCallback(env.VITE_PAYMENT_CALLBACK_URL),
  'If set, it must be https://your-domain.com/payment/callback.',
)
addCheck('Supabase project is linked', Boolean(projectRef), 'Run `supabase link --project-ref YOUR_PROJECT_REF` if missing.')
addCheck('initialize-payment function exists', exists('supabase/functions/initialize-payment/index.ts'), 'Required Paystack initialization function.')
addCheck('verify-payment function exists', exists('supabase/functions/verify-payment/index.ts'), 'Required Paystack verification function.')
addCheck('paystack-webhook function exists', exists('supabase/functions/paystack-webhook/index.ts'), 'Required Paystack webhook function.')
addCheck('Paystack escrow RPC SQL exists', exists('supabase/fix_paystack_escrow_commission_rpc.sql'), 'Run this SQL before live payment testing.')

console.log('\nHandiwave payment preflight\n')

for (const check of checks) {
  console.log(`${check.ok ? 'OK ' : 'NO '} ${check.label}`)
  if (!check.ok) {
    console.log(`   ${check.detail}`)
  }
}

if (projectRef) {
  console.log(`\nLinked Supabase project ref: ${projectRef}`)
}

console.log('\nBefore real payments, set these Supabase Edge Function secrets:')
console.log('  supabase secrets set PAYSTACK_SECRET_KEY=sk_test_xxx')
console.log('  supabase secrets set PAYSTACK_CALLBACK_URL=https://your-domain.com/payment/callback')
console.log('  supabase secrets set SUPABASE_URL=https://your-project.supabase.co')
console.log('  supabase secrets set SUPABASE_SERVICE_ROLE_KEY=your-service-role-key')

console.log('\nThen deploy:')
console.log('  supabase functions deploy initialize-payment')
console.log('  supabase functions deploy verify-payment')
console.log('  supabase functions deploy paystack-webhook')

const failed = checks.filter((check) => !check.ok)

if (failed.length > 0) {
  console.log(`\n${failed.length} preflight check(s) need attention.\n`)
  process.exit(1)
}

console.log('\nPreflight checks passed. You still need to confirm Supabase secrets and Paystack dashboard settings.\n')
