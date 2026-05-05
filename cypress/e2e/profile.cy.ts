describe('Profile page', () => {
  it('redirects unauthenticated users to /login', () => {
    cy.intercept('GET', '**/auth/v1/user', { statusCode: 401, body: {} })
    cy.intercept('GET', '**/rest/v1/users*', { statusCode: 401, body: {} })
    cy.intercept('GET', '**/geocoding-api.open-meteo.com/**', { body: {} })
    cy.intercept('GET', '**/nominatim.openstreetmap.org/**', { body: [] })
    cy.visit('/profile')
    cy.url().should('include', '/login')
  })

  describe('when logged in', () => {
    beforeEach(() => {
      cy.loginAsTestUser()
      cy.visit('/profile')
      cy.contains('Jane Doe', { timeout: 10000 })
    })

    it('shows user name and email', () => {
      cy.contains('Jane Doe')
      cy.contains('jane.doe@test.com')
    })

    it('shows member since date', () => {
      cy.contains('Member since')
      cy.contains('January 2024')
    })

    it('shows avatar initials when no photo', () => {
      cy.contains('JD')
    })

    it('shows Personal Information section', () => {
      cy.contains('Personal Information')
      cy.contains('label', 'First Name')
      cy.contains('label', 'Last Name')
    })

    it('email field is read-only', () => {
      cy.get('input[type="email"][readonly]').should('have.value', 'jane.doe@test.com')
    })

    it('shows Location section with ZIP input', () => {
      cy.contains('Location')
      cy.contains('label', 'ZIP / Postal Code')
      cy.get('input[placeholder*="90210"]').should('have.value', '90210')
    })

    it('shows Lawn Settings section', () => {
      cy.contains('Lawn Settings')
      cy.contains('label', 'Grass Type')
      cy.contains('label', 'Lawn Size')
      cy.get('select').should('have.value', 'bermuda')
    })

    it('shows Plant Hardiness Zone section', () => {
      cy.contains('Plant Hardiness Zone')
    })

    it('shows Save Changes button', () => {
      cy.contains('button', 'Save Changes').should('be.visible')
    })

    it('updates first name', () => {
      cy.contains('label', 'First Name').siblings('input').clear().type('Jennifer')
      cy.contains('label', 'Last Name').siblings('input').should('have.value', 'Doe')
    })

    it('shows Save success message after saving', () => {
      cy.intercept('PATCH', '**/rest/v1/users*', { statusCode: 200, body: {} }).as('save')
      cy.contains('button', 'Save Changes').click()
      cy.wait('@save')
      cy.contains('Saved').should('be.visible')
    })

    it('success message disappears after a few seconds', () => {
      cy.intercept('PATCH', '**/rest/v1/users*', { statusCode: 200, body: {} }).as('save')
      cy.contains('button', 'Save Changes').click()
      cy.wait('@save')
      cy.contains('Saved').should('be.visible')
      cy.contains('Saved', { timeout: 4000 }).should('not.exist')
    })

    it('validates first name cannot be empty', () => {
      cy.contains('label', 'First Name').siblings('input').clear()
      cy.contains('button', 'Save Changes').click()
      cy.contains('First name is required.')
    })

    it('validates last name cannot be empty', () => {
      cy.contains('label', 'Last Name').siblings('input').clear()
      cy.contains('button', 'Save Changes').click()
      cy.contains('Last name is required.')
    })

    it('camera icon opens file input for avatar', () => {
      cy.get('button[title="Change photo"]').should('be.visible')
      cy.get('input[type="file"][accept*="image"]').should('exist')
    })

    it('grass type dropdown has all options', () => {
      cy.get('select').contains('Bermuda Grass').should('exist')
      cy.get('select').contains('Kentucky Bluegrass').should('exist')
      cy.get('select').contains('Tall Fescue').should('exist')
      cy.get('select').contains('Zoysia Grass').should('exist')
      cy.get('select').contains('St. Augustine').should('exist')
      cy.get('select').contains('Perennial Ryegrass').should('exist')
    })

    it('country selector has US and Canada', () => {
      cy.contains('label', 'Country').siblings().find('select').should('contain', 'United States')
      cy.contains('label', 'Country').siblings().find('select').should('contain', 'Canada')
    })
  })
})
