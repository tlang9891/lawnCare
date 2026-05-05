describe('Onboarding wizard', () => {
  it('redirects unauthenticated users to /login', () => {
    cy.intercept('GET', '**/auth/v1/user', { statusCode: 401, body: {} })
    cy.intercept('GET', '**/rest/v1/users*', { statusCode: 401, body: {} })
    cy.intercept('GET', '**/geocoding-api.open-meteo.com/**', { body: {} })
    cy.visit('/onboarding')
    cy.url().should('include', '/login')
  })

  describe('when logged in as new user', () => {
    beforeEach(() => {
      cy.loginAsNewUser()
      cy.url().should('include', '/onboarding')
    })

    it('shows progress indicator starting at step 1', () => {
      cy.contains('Step 1 of 3')
      cy.contains('Where do you live?')
    })

    it('shows welcome greeting with user name', () => {
      cy.contains('Welcome, Jane!')
    })

    it('shows step labels', () => {
      cy.contains('Location')
      cy.contains('Mower')
      cy.contains('Lawn')
    })

    describe('Step 1 — Location', () => {
      it('validates all required fields', () => {
        cy.contains('button', 'Continue').click()
        cy.contains('City is required.')
        cy.contains('State / province is required.')
        cy.contains('Country is required.')
        cy.contains('ZIP or postal code is required.')
      })

      it('validates US ZIP format', () => {
        cy.get('input[placeholder="e.g. Austin"]').type('Austin')
        cy.get('input[placeholder="e.g. Texas"]').type('Texas')
        cy.get('input[placeholder="e.g. USA"]').type('USA')
        cy.get('input[placeholder*="90210"]').type('ABCDE')
        cy.contains('button', 'Continue').click()
        cy.contains('valid US ZIP')
      })

      it('accepts valid US ZIP and advances to step 2', () => {
        cy.get('input[placeholder="e.g. Austin"]').type('Austin')
        cy.get('input[placeholder="e.g. Texas"]').type('Texas')
        cy.get('input[placeholder="e.g. USA"]').type('USA')
        cy.get('input[placeholder*="90210"]').type('78701')
        cy.contains('button', 'Continue').click()
        cy.contains('Step 2 of 3')
        cy.contains('Tell us about your mower')
      })

      it('accepts valid Canadian postal code and advances', () => {
        cy.get('input[placeholder="e.g. Austin"]').type('Ottawa')
        cy.get('input[placeholder="e.g. Texas"]').type('Ontario')
        cy.get('input[placeholder="e.g. USA"]').type('Canada')
        cy.get('input[placeholder*="90210"]').type('K1A 0A9')
        cy.contains('button', 'Continue').click()
        cy.contains('Tell us about your mower')
      })
    })

    describe('Step 2 — Mower', () => {
      beforeEach(() => {
        cy.get('input[placeholder="e.g. Austin"]').type('Austin')
        cy.get('input[placeholder="e.g. Texas"]').type('Texas')
        cy.get('input[placeholder="e.g. USA"]').type('USA')
        cy.get('input[placeholder*="90210"]').type('78701')
        cy.contains('button', 'Continue').click()
        cy.contains('Tell us about your mower')
      })

      it('shows make/model pickers and mower type by default', () => {
        cy.contains('label', 'Make')
        cy.contains('label', 'Mower Type')
        cy.contains('button', 'Riding Mower')
        cy.contains('button', 'Push Mower')
      })

      it('shows skip toggle', () => {
        cy.contains("I don't have a mower yet")
      })

      it('skip toggle hides make/model and allows continuing', () => {
        cy.contains("I don't have a mower yet").click()
        cy.contains('label', 'Make').should('not.exist')
        cy.contains("I have a mower to add")
        cy.contains('button', 'Continue').click()
        cy.contains('About your lawn')
      })

      it('validates make and model required when not skipping', () => {
        cy.contains('button', 'Continue').click()
        cy.contains('Make is required.')
        cy.contains('Model is required.')
      })

      it('selects mower sub-type and allows continuing', () => {
        cy.contains('button', 'Push Mower').click()
        cy.contains('button', 'Push Mower').should('have.class', 'bg-green-600')
        cy.get('select').first().select('Honda')
        cy.get('select').last().select(1)
        cy.contains('button', 'Continue').click()
        cy.contains('About your lawn')
      })

      it('back button returns to step 1', () => {
        cy.contains('button', 'Back').click()
        cy.contains('Where do you live?')
      })
    })

    describe('Step 3 — Lawn', () => {
      beforeEach(() => {
        cy.get('input[placeholder="e.g. Austin"]').type('Austin')
        cy.get('input[placeholder="e.g. Texas"]').type('Texas')
        cy.get('input[placeholder="e.g. USA"]').type('USA')
        cy.get('input[placeholder*="90210"]').type('78701')
        cy.contains('button', 'Continue').click()
        cy.contains("I don't have a mower yet").click()
        cy.contains('button', 'Continue').click()
        cy.contains('About your lawn')
      })

      it('shows lawn size and grass type inputs', () => {
        cy.contains('label', 'Lawn Size')
        cy.contains('label', 'Grass Type')
        cy.get('select').should('be.visible')
        cy.contains('Go to Dashboard')
      })

      it('validates lawn size is required', () => {
        cy.contains('button', 'Go to Dashboard').click()
        cy.contains('Enter a valid lawn size.')
      })

      it('grass type selector has expected options', () => {
        cy.get('select').should('contain', 'Bermuda Grass')
        cy.get('select').should('contain', 'Kentucky Bluegrass')
        cy.get('select').should('contain', 'Tall Fescue')
        cy.get('select').should('contain', 'Zoysia Grass')
        cy.get('select').should('contain', 'St. Augustine')
      })

      it('back button returns to step 2', () => {
        cy.contains('button', 'Back').click()
        cy.contains('Tell us about your mower')
      })

      it('completes onboarding and redirects to dashboard', () => {
        cy.intercept('PATCH', '**/rest/v1/users*', { statusCode: 200, body: {} }).as('updateProfile')
        cy.get('input[placeholder="e.g. 2500"]').type('3000')
        cy.get('select').select('fescue')
        cy.contains('button', 'Go to Dashboard').click()
        cy.wait('@updateProfile')
        cy.url().should('eq', Cypress.config('baseUrl') + '/')
      })

      it('"Almost done!" tip is visible', () => {
        cy.contains('Almost done!')
        cy.contains('drop you straight onto your dashboard')
      })
    })
  })
})
