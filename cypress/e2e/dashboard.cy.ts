describe('Dashboard — care cards and health score', () => {
  describe('with empty lawn data', () => {
    beforeEach(() => {
      cy.loginAsTestUser()
    })

    it('shows personalized greeting', () => {
      cy.contains('Jane')
      cy.contains('Your Lawn Dashboard')
    })

    it('shows the lawn health score panel', () => {
      cy.contains('Lawn Health Score')
      cy.contains('No Data').should('have.length.gte', 1)
    })

    it('shows all three care cards', () => {
      cy.contains('Watering')
      cy.contains('Mowing')
      cy.contains('Fertilizing')
    })

    it('care cards show "No Data" status initially', () => {
      cy.get('.bg-gray-100').contains('No Data').should('exist')
    })

    it('care cards show dashes for last logged and next up', () => {
      cy.contains('Last logged').siblings().contains('—')
    })

    it('shows Dashboard and Photos tabs', () => {
      cy.contains('button', 'Dashboard').should('be.visible')
      cy.contains('button', 'Photos').should('be.visible')
    })
  })

  describe('logging watering', () => {
    beforeEach(() => {
      cy.loginAsTestUser()
    })

    it('opens log watering modal on button click', () => {
      cy.contains('button', 'Log Watering').click()
      cy.contains('Log Watering')
      cy.contains('label', 'Date')
      cy.contains('label', 'Duration (minutes)')
      cy.contains('button', 'Cancel')
      cy.contains('button', 'Save')
    })

    it('modal pre-fills today as the date', () => {
      cy.contains('button', 'Log Watering').click()
      const today = new Date().toISOString().split('T')[0]
      cy.get('input[type="date"]').should('have.value', today)
    })

    it('saves watering log and updates last logged', () => {
      cy.contains('button', 'Log Watering').click()
      cy.contains('button', 'Save').click()
      cy.contains('Log Watering').should('not.exist')
      cy.contains('Today').should('exist')
    })

    it('closes modal on Cancel', () => {
      cy.contains('button', 'Log Watering').click()
      cy.contains('button', 'Cancel').click()
      cy.contains('Log Watering').should('not.exist')
    })

    it('backdrop click closes the modal', () => {
      cy.contains('button', 'Log Watering').click()
      cy.contains('Log Watering')
      cy.get('.fixed.inset-0 > .absolute.inset-0').click()
      cy.contains('Log Watering').should('not.exist')
    })
  })

  describe('logging mowing', () => {
    beforeEach(() => {
      cy.loginAsTestUser()
    })

    it('opens log mowing modal without duration input', () => {
      cy.contains('button', 'Log Mowing').click()
      cy.contains('Log Mowing')
      cy.contains('label', 'Date')
      cy.contains('label', 'Duration').should('not.exist')
    })

    it('saves mowing log', () => {
      cy.contains('button', 'Log Mowing').click()
      cy.contains('button', 'Save').click()
      cy.contains('Log Mowing').should('not.exist')
    })
  })

  describe('logging fertilizing', () => {
    beforeEach(() => {
      cy.loginAsTestUser()
    })

    it('opens log fertilizing modal', () => {
      cy.contains('button', 'Log Fertilizing').click()
      cy.contains('Log Fertilizing')
    })

    it('saves fertilizing log', () => {
      cy.contains('button', 'Log Fertilizing').click()
      cy.contains('button', 'Save').click()
      cy.contains('Log Fertilizing').should('not.exist')
    })
  })

  describe('tips modals', () => {
    beforeEach(() => {
      cy.loginAsTestUser()
    })

    it('opens watering tips modal and shows tips', () => {
      cy.get('button[title="Watering tips"]').click()
      cy.contains('Watering Tips')
      cy.contains('Water deeply, not daily')
      cy.contains('Best time to water')
    })

    it('closes tips modal via X button', () => {
      cy.get('button[title="Watering tips"]').click()
      cy.contains('Watering Tips')
      cy.get('.fixed.inset-0').within(() => {
        cy.get('button').contains('×').click({ force: true })
      })
      cy.contains('Watering Tips').should('not.exist')
    })

    it('closes tips modal via "Got it" button', () => {
      cy.get('button[title="Mowing tips"]').click()
      cy.contains('Mowing Tips')
      cy.contains('button', 'Got it').click()
      cy.contains('Mowing Tips').should('not.exist')
    })

    it('opens fertilizing tips', () => {
      cy.get('button[title="Fertilizing tips"]').click()
      cy.contains('Fertilizing Tips')
      cy.contains('Timing matters')
    })
  })

  describe('history modals', () => {
    it('shows empty history when no logs', () => {
      cy.loginAsTestUser()
      cy.contains('button', 'View history (0)').first().click()
      cy.contains('No history recorded yet.')
    })

    it('shows history entries after logging', () => {
      cy.visitWithFixtures('/', 'lawn_with_data')
      cy.contains('Your Lawn Dashboard', { timeout: 10000 })
      cy.contains('View history (2)').click()
      cy.get('.fixed.inset-0').within(() => {
        cy.contains('Watering History').should('be.visible')
        cy.contains('Duration: 30 min').should('be.visible')
      })
    })

    it('closes history modal', () => {
      cy.loginAsTestUser()
      cy.contains('button', 'View history (0)').first().click()
      cy.contains('button', 'Close').click()
      cy.contains('No history recorded yet.').should('not.exist')
    })
  })

  describe('data persistence via localStorage', () => {
    it('persists a logged activity after page reload', () => {
      cy.loginAsTestUser()
      cy.contains('button', 'Log Watering').click()
      cy.contains('button', 'Save').click()
      cy.reload()
      cy.contains('Your Lawn Dashboard', { timeout: 10000 })
      cy.contains('Today').should('exist')
    })
  })

  describe('health score', () => {
    it('shows score of 0 with all No Data', () => {
      cy.loginAsTestUser()
      cy.contains('0').should('be.visible')
      cy.contains('Action Required')
    })

    it('score improves after logging all activities', () => {
      cy.loginAsTestUser()
      cy.contains('button', 'Log Watering').click()
      cy.contains('button', 'Save').click()
      cy.contains('button', 'Log Mowing').click()
      cy.contains('button', 'Save').click()
      cy.contains('button', 'Log Fertilizing').click()
      cy.contains('button', 'Save').click()
      cy.contains('Excellent')
    })
  })
})
