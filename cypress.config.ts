import { defineConfig } from 'cypress'
import { readFileSync } from 'fs'

function readEnvLocal(): Record<string, string> {
  try {
    return Object.fromEntries(
      readFileSync('.env.local', 'utf8')
        .split('\n')
        .filter((l) => l && !l.startsWith('#') && l.includes('='))
        .map((l) => {
          const idx = l.indexOf('=')
          return [l.slice(0, idx).trim(), l.slice(idx + 1).trim()]
        })
    )
  } catch {
    return {}
  }
}

const localEnv = readEnvLocal()

export default defineConfig({
  e2e: {
    baseUrl: 'http://localhost:3000',
    viewportWidth: 1280,
    viewportHeight: 800,
    video: false,
    screenshotOnRunFailure: true,
    defaultCommandTimeout: 8000,
    env: {
      supabaseUrl: process.env.CYPRESS_SUPABASE_URL ?? localEnv['NEXT_PUBLIC_SUPABASE_URL'] ?? '',
    },
    setupNodeEvents(_on, config) {
      return config
    },
  },
})
