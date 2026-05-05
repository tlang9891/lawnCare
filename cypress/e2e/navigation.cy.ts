describe('Navigation and routing', () => {
  describe('unauthenticated routes', () => {
    beforeEach(() => {
      cy.intercept('GET', '**/auth/v1/user', { statusCode: 401, body: {} })
      cy.intercept('GET', '**/rest/v1/users*', { statusCode: 401, body: {} })
      cy.intercept('GET', '**/geocoding-api.open-meteo.com/**', { body: {} })
      cy.intercept('GET', '**/api.open-meteo.com/**', { body: {} })
      cy.intercept('GET', '**/nominatim.openstreetmap.org/**', { body: [] })
    })

    it('visiting / without auth redirects to /login', () => {
      cy.visit('/')
      cy.url().should('include', '/login')
    })

    it('visiting /profile without auth redirects to /login', () => {
      cy.visit('/profile')
      cy.url().should('include', '/login')
    })

    it('visiting /onboarding without auth redirects to /login', () => {
      cy.visit('/onboarding')
      cy.url().should('include', '/login')
    })

    it('navbar shows Sign In and Sign Up links on login page', () => {
      cy.visit('/login')
      cy.contains('a', 'Sign In').should('be.visible')
      cy.contains('a', 'Sign Up').should('be.visible')
    })

    it('navbar Sign Up link goes to /signup', () => {
      cy.visit('/login')
      cy.contains('a', 'Sign Up').should('have.attr', 'href', '/signup')
    })

    it('navbar Sign In link goes to /login', () => {
      cy.visit('/signup')
      cy.contains('a', 'Sign In').should('have.attr', 'href', '/login')
    })

    it('LawnCare logo links to /', () => {
      cy.visit('/login')
      cy.get('nav').find('a').first().should('have.attr', 'href', '/')
    })
  })

  describe('authenticated navbar', () => {
    beforeEach(() => {
      cy.loginAsTestUser()
    })

    it('shows user name in navbar', () => {
      cy.get('nav').contains('Jane Doe').should('be.visible')
    })

    it('user name is a link to /profile', () => {
      cy.get('nav').contains('Jane Doe').should('have.attr', 'href', '/profile')
    })

    it('shows Sign Out button', () => {
      cy.get('nav').contains('Sign Out').should('be.visible')
    })

    it('does not show Sign In or Sign Up links', () => {
      cy.get('nav').contains('Sign In').should('not.exist')
      cy.get('nav').contains('Sign Up').should('not.exist')
    })

    it('logo links to / when logged in', () => {
      cy.get('nav').find('a[href="/"]').should('exist')
    })

    it('clicking user name navigates to profile', () => {
      cy.get('nav').contains('Jane Doe').click()
      cy.url().should('include', '/profile')
      cy.contains('Personal Information')
    })
  })

  describe('sign out flow', () => {
    beforeEach(() => {
      cy.loginAsTestUser()
    })

    it('Sign Out button redirects to /login', () => {
      cy.intercept('POST', '**/auth/v1/logout*', { statusCode: 204, body: {} }).as('logout')
      cy.get('nav').contains('Sign Out').click()
      cy.url().should('include', '/login')
    })

    it('after sign out, dashboard redirects to /login', () => {
      cy.intercept('POST', '**/auth/v1/logout*', { statusCode: 204, body: {} }).as('logout')
      cy.intercept('GET', '**/auth/v1/user', { statusCode: 401, body: {} })
      cy.intercept('GET', '**/rest/v1/users*', { statusCode: 401, body: {} })
      cy.get('nav').contains('Sign Out').click()
      cy.url().should('include', '/login')
    })
  })

  describe('onboarding redirect for new users', () => {
    it('authenticated user with incomplete onboarding is redirected to /onboarding', () => {
      cy.intercept('GET', '**/auth/v1/user', { statusCode: 200, body: { id: 'test-user-abc123', email: 'jane.doe@test.com', role: 'authenticated', aud: 'authenticated', user_metadata: {} } })
      cy.intercept('GET', '**/rest/v1/users*', {
        statusCode: 200,
        body: {
          id: 'test-user-abc123',
          first_name: 'Jane',
          last_name: 'Doe',
          zip_code: '',
          city: '',
          state: '',
          country: '',
          grass_type: 'other',
          lawn_size_sq_ft: 0,
          onboarding_complete: false,
          avatar_url: null,
          created_at: '2024-01-01T00:00:00Z',
        },
      })
      cy.intercept('GET', '**/geocoding-api.open-meteo.com/**', { body: {} })
      cy.intercept('GET', '**/api.open-meteo.com/**', { body: {} })
      cy.intercept('GET', '**/nominatim.openstreetmap.org/**', { body: [] })

      const url: string = Cypress.env('supabaseUrl') ?? ''
      const ref = url.match(/\/\/([^.]+)\./)?.[1] ?? 'local'
      const sessionKey = `sb-${ref}-auth-token`
      const session = {
        access_token: 'fake.jwt.token',
        refresh_token: 'fake-refresh-token',
        expires_at: Math.floor(Date.now() / 1000) + 86400 * 365,
        expires_in: 86400 * 365,
        token_type: 'bearer',
        user: { id: 'test-user-abc123', email: 'jane.doe@test.com', role: 'authenticated', aud: 'authenticated' },
      }

      cy.visit('/', {
        onBeforeLoad(win) {
          win.localStorage.setItem(sessionKey, JSON.stringify(session))
        },
      })
      cy.url().should('include', '/onboarding')
    })
  })

  describe('page titles and content landmarks', () => {
    it('login page has LawnCare branding', () => {
      cy.intercept('GET', '**/auth/v1/user', { statusCode: 401, body: {} })
      cy.intercept('GET', '**/rest/v1/users*', { statusCode: 401, body: {} })
      cy.visit('/login')
      cy.contains('LawnCare').should('be.visible')
    })

    it('signup page has LawnCare branding', () => {
      cy.intercept('GET', '**/auth/v1/user', { statusCode: 401, body: {} })
      cy.intercept('GET', '**/rest/v1/users*', { statusCode: 401, body: {} })
      cy.visit('/signup')
      cy.contains('LawnCare').should('be.visible')
    })

    it('dashboard has LawnCare branding in navbar', () => {
      cy.loginAsTestUser()
      cy.get('nav').contains('LawnCare').should('be.visible')
    })
  })
})
