#!/usr/bin/env node
/**
 * Simple CLI helper for running tests
 * Usage: node test-cli.js [local|prod|security]
 */

const { execSync } = require('child_process')

const args = process.argv.slice(2)
const command = args[0] || 'help'

function run(cmd) {
  console.log(`\n🚀 Running: ${cmd}\n`)
  try {
    execSync(cmd, { stdio: 'inherit', cwd: __dirname })
  } catch (error) {
    process.exit(1)
  }
}

function printHelp() {
  console.log(`
╔═══════════════════════════════════════════════════════════════╗
║              Oncore Test Suite - Quick CLI                    ║
╚═══════════════════════════════════════════════════════════════╝

SAFE COMMANDS (Local Database):
  node test-cli.js local          - Run all tests locally
  node test-cli.js security       - Run security tests locally
  node test-cli.js performance    - Run performance tests locally

PRODUCTION COMMANDS (⚠️  Use with caution):
  node test-cli.js security-prod  - Run security tests on production
  node test-cli.js prod          - Run all tests on production

OTHER:
  node test-cli.js help          - Show this help

EXAMPLES:
  # Test everything locally (safe)
  node test-cli.js local

  # Check production security (recommended before deployment)
  node test-cli.js security-prod

  # Full production test (careful!)
  node test-cli.js prod

CONFIGURATION:
  Edit .env.test to change default behavior:
    TEST_DB_ENV=local              # or 'production'
    ALLOW_DESTRUCTIVE_TESTS_ON_PROD=false

TIPS:
  ✅ Always test locally first
  ✅ Run security tests before every deployment
  ⚠️  Be careful with production tests
  ⚠️  Review test-results.md after running

`)
}

switch (command) {
  case 'local':
    run('npm run test:local')
    break

  case 'prod':
  case 'production':
    console.log('⚠️  WARNING: Running tests against PRODUCTION database!')
    console.log('⚠️  Press Ctrl+C now to cancel, or wait 3 seconds...')
    setTimeout(() => {
      run('npm run test:prod')
    }, 3000)
    break

  case 'security':
    run('npm run security:local')
    break

  case 'security-prod':
    console.log('🔒 Running security tests against PRODUCTION database')
    console.log('   (This is safe - read-only checks)')
    run('npm run security:prod')
    break

  case 'performance':
  case 'perf':
    run('npm run test:performance')
    break

  case 'stress':
    run('npm run test:perf:stress')
    break

  case 'help':
  case '-h':
  case '--help':
  default:
    printHelp()
    break
}
