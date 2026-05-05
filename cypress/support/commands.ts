// ── Constants ────────────────────────────────────────────────────────────────

export const TEST_USER = {
  id:                 'test-user-abc123',
  firstName:          'Jane',
  lastName:           'Doe',
  email:              'jane.doe@test.com',
  zipCode:            '90210',
  city:               'Beverly Hills',
  state:              'California',
  country:            'US',
  grassType:          'bermuda',
  lawnSizeSqFt:       2500,
  onboardingComplete: true,
  createdAt:          '2024-01-01T00:00:00.000Z',
}

const DB_PROFILE = {
  id:                  TEST_USER.id,
  first_name:          TEST_USER.firstName,
  last_name:           TEST_USER.lastName,
  zip_code:            TEST_USER.zipCode,
  city:                TEST_USER.city,
  state:               TEST_USER.state,
  country:             TEST_USER.country,
  grass_type:          TEST_USER.grassType,
  lawn_size_sq_ft:     TEST_USER.lawnSizeSqFt,
  onboarding_complete: true,
  avatar_url:          null,
  created_at:          TEST_USER.createdAt,
}

const DB_PROFILE_NEW_USER = {
  ...DB_PROFILE,
  onboarding_complete: false,
  zip_code:            '',
  city:                '',
  state:               '',
}

const AUTH_USER = {
  id:            TEST_USER.id,
  email:         TEST_USER.email,
  role:          'authenticated',
  aud:           'authenticated',
  user_metadata: {},
  app_metadata:  { provider: 'email' },
}

const DEFAULT_LAWN = {
  watering:    { logs: [], nextRecommended: null, intervalDays: 3  },
  mowing:      { logs: [], nextRecommended: null, intervalDays: 10 },
  fertilizing: { logs: [], nextRecommended: null, intervalDays: 60 },
}

// ── Session helpers ───────────────────────────────────────────────────────────

function getSessionKey(): string {
  const url: string = Cypress.env('supabaseUrl') ?? ''
  const ref = url.match(/\/\/([^.]+)\./)?.[1] ?? 'local'
  return `sb-${ref}-auth-token`
}

function buildSession() {
  return {
    access_token:  'fake.jwt.token',
    refresh_token: 'fake-refresh-token',
    expires_at:    Math.floor(Date.now() / 1000) + 86400 * 365,
    expires_in:    86400 * 365,
    token_type:    'bearer',
    user:          AUTH_USER,
  }
}

// ── Intercept helpers ─────────────────────────────────────────────────────────

function stubSupabaseAuth() {
  cy.intercept('GET',  '**/auth/v1/user',    { statusCode: 200, body: AUTH_USER       }).as('authUser')
  cy.intercept('POST', '**/auth/v1/token*',  { statusCode: 200, body: buildSession()  }).as('refreshToken')
  cy.intercept('POST', '**/auth/v1/logout*', { statusCode: 204, body: {}              }).as('supabaseLogout')
  cy.intercept('POST', '**/auth/v1/otp*',    { statusCode: 200, body: {}              }).as('sendOtp')
  cy.intercept('POST', '**/auth/v1/verify*', {
    statusCode: 200,
    body: { access_token: 'fake.jwt.token', user: AUTH_USER, session: buildSession() },
  }).as('verifyOtp')
}

function stubSupabaseDb(profile: typeof DB_PROFILE) {
  cy.intercept('GET',   '**/rest/v1/users*', { statusCode: 200, body: profile }).as('getProfile')
  cy.intercept('POST',  '**/rest/v1/users*', { statusCode: 201, body: {}      }).as('createProfile')
  cy.intercept('PATCH', '**/rest/v1/users*', { statusCode: 200, body: {}      }).as('patchProfile')
}

function stubWeatherApis() {
  cy.intercept('GET', '**/geocoding-api.open-meteo.com/**', {
    statusCode: 200,
    body: { results: [{ name: 'Beverly Hills', admin1: 'California', latitude: 34.07, longitude: -118.4 }] },
  }).as('geocode')
  cy.intercept('GET', '**/api.open-meteo.com/v1/forecast*', {
    statusCode: 200,
    body: {
      current: { temperature_2m: 72, weathercode: 0, windspeed_10m: 5 },
      daily: {
        time: ['2026-05-05','2026-05-06','2026-05-07','2026-05-08','2026-05-09','2026-05-10','2026-05-11'],
        weathercode: [0, 1, 2, 61, 0, 1, 2],
        temperature_2m_max: [75, 72, 68, 65, 70, 73, 76],
        temperature_2m_min: [58, 55, 52, 50, 54, 57, 60],
        precipitation_probability_max: [5, 10, 20, 80, 15, 5, 10],
      },
    },
  }).as('weather')
  cy.intercept('GET', '**/nominatim.openstreetmap.org/**', { statusCode: 200, body: [] }).as('nominatim')
}

// ── localStorage seeder ───────────────────────────────────────────────────────

function seedLocalStorage(
  win: Window,
  lawn: unknown,
  equipment: unknown,
  schedule: unknown = [],
  photos: unknown = [],
) {
  const id = TEST_USER.id
  win.localStorage.setItem(getSessionKey(), JSON.stringify(buildSession()))
  win.localStorage.setItem(`lawncare-lawn-v2-${id}`,      JSON.stringify(lawn))
  win.localStorage.setItem(`lawncare-equipment-v2-${id}`, JSON.stringify(equipment))
  win.localStorage.setItem(`lawncare-schedule-v1-${id}`,  JSON.stringify(schedule))
  win.localStorage.setItem(`lawncare-photos-v1-${id}`,    JSON.stringify(photos))
}

// ── Type declarations ─────────────────────────────────────────────────────────

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Cypress {
    interface Chainable {
      loginAsTestUser(): Chainable<void>
      loginAsNewUser(): Chainable<void>
      visitWithFixtures(path: string, lawnFixture: string, equipmentFixture?: string): Chainable<void>
    }
  }
}

// ── Commands ──────────────────────────────────────────────────────────────────

Cypress.Commands.add('loginAsTestUser', () => {
  stubSupabaseAuth()
  stubSupabaseDb(DB_PROFILE)
  stubWeatherApis()

  cy.visit('/', {
    onBeforeLoad(win) {
      seedLocalStorage(win, DEFAULT_LAWN, [])
    },
  })

  cy.contains('Your Lawn Dashboard', { timeout: 10000 })
})

Cypress.Commands.add('loginAsNewUser', () => {
  stubSupabaseAuth()
  stubSupabaseDb(DB_PROFILE_NEW_USER)
  stubWeatherApis()

  cy.visit('/onboarding', {
    onBeforeLoad(win) {
      win.localStorage.setItem(getSessionKey(), JSON.stringify(buildSession()))
    },
  })
})

Cypress.Commands.add('visitWithFixtures', (path: string, lawnFixture: string, equipmentFixture?: string) => {
  stubSupabaseAuth()
  stubSupabaseDb(DB_PROFILE)
  stubWeatherApis()

  cy.fixture(lawnFixture).then((lawnData: unknown) => {
    if (equipmentFixture) {
      cy.fixture(equipmentFixture).then((equipData: unknown) => {
        cy.visit(path, {
          onBeforeLoad(win) {
            seedLocalStorage(win, lawnData, equipData)
          },
        })
      })
    } else {
      cy.visit(path, {
        onBeforeLoad(win) {
          seedLocalStorage(win, lawnData, [])
        },
      })
    }
  })
})
