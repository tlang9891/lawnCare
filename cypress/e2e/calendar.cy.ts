describe('Lawn Calendar', () => {
  beforeEach(() => {
    cy.visitWithFixtures('/', 'lawn_with_data')
    cy.contains('Your Lawn Dashboard', { timeout: 10000 })
  })

  it('renders the Lawn Calendar section', () => {
    cy.contains('h2', 'Lawn Calendar').should('be.visible')
    cy.contains('Past activity & upcoming tasks')
  })

  it('shows current month and year', () => {
    const now = new Date()
    const label = now.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
    cy.contains(label)
  })

  it('shows day-of-week headers', () => {
    cy.contains('Sun').should('be.visible')
    cy.contains('Mon').should('be.visible')
    cy.contains('Sat').should('be.visible')
  })

  it('shows color legend for activity types', () => {
    cy.contains('Watering').should('be.visible')
    cy.contains('Mowing').should('be.visible')
    cy.contains('Fertilizing').should('be.visible')
    cy.contains('Scheduled').should('be.visible')
  })

  it('shows Schedule button', () => {
    cy.contains('button', 'Schedule').should('be.visible')
  })

  it('navigates to next month via chevron', () => {
    const now = new Date()
    const next = new Date(now.getFullYear(), now.getMonth() + 1, 1)
    const label = next.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
    cy.get('.bg-white.rounded-2xl').within(() => {
      cy.get('button').eq(1).click()
    })
    cy.contains(label)
  })

  it('navigates back to current month via prev chevron', () => {
    const now = new Date()
    const label = now.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
    cy.get('.bg-white.rounded-2xl').within(() => {
      cy.get('button').eq(1).click()
      cy.get('button').eq(0).click()
    })
    cy.contains(label)
  })

  it('opens Schedule Task modal from the Schedule button', () => {
    cy.contains('button', 'Schedule').click()
    cy.contains('h2', 'Schedule Task').should('be.visible')
    cy.contains('Task Type')
    cy.contains('button', 'Watering')
    cy.contains('button', 'Mowing')
    cy.contains('button', 'Fertilizing')
    cy.contains('label', 'Date')
    cy.contains('label', 'Note')
    cy.contains('button', 'Cancel')
    cy.contains('button', 'Schedule')
  })

  it('closes Schedule Task modal on Cancel', () => {
    cy.contains('button', 'Schedule').click()
    cy.contains('h2', 'Schedule Task')
    cy.get('.fixed.inset-0').within(() => {
      cy.contains('button', 'Cancel').click()
    })
    cy.contains('h2', 'Schedule Task').should('not.exist')
  })

  it('saves a scheduled task and shows Coming Up section', () => {
    const now = new Date()
    const futureDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 5)
    const futureDateStr = futureDate.toISOString().split('T')[0]

    cy.contains('button', 'Schedule').click()
    cy.get('input[type="date"]').clear().type(futureDateStr)
    cy.contains('button', 'Mowing').click()
    cy.get('.fixed.inset-0').within(() => {
      cy.contains('button', 'Schedule').click()
    })
    cy.contains('Coming Up')
    cy.contains('Mowing')
  })

  it('can remove a scheduled task from the Coming Up list', () => {
    const now = new Date()
    const futureDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 4)
    const futureDateStr = futureDate.toISOString().split('T')[0]

    cy.contains('button', 'Schedule').click()
    cy.get('input[type="date"]').clear().type(futureDateStr)
    cy.get('.fixed.inset-0').within(() => {
      cy.contains('button', 'Schedule').click()
    })
    cy.contains('Coming Up')
    cy.get('button[title="Remove"]').first().click()
    cy.contains('Coming Up').should('not.exist')
  })

  it('clicking a day opens the day detail modal', () => {
    const now = new Date()
    const dayNum = String(now.getDate())
    cy.get('.grid.grid-cols-7').find('button').contains(dayNum).first().click()
    cy.get('.fixed.inset-0').should('be.visible')
    cy.contains('button', 'Schedule Task')
    cy.contains('button', 'Close')
  })

  it('day detail modal shows "Schedule Task" button', () => {
    cy.get('.grid.grid-cols-7').find('button').first().click()
    cy.contains('button', 'Schedule Task').should('be.visible')
  })

  it('day detail modal "Schedule Task" button opens schedule modal', () => {
    cy.get('.grid.grid-cols-7').find('button').first().click()
    cy.contains('button', 'Schedule Task').click()
    cy.contains('h2', 'Schedule Task')
  })

  it('day detail modal closes on Close button', () => {
    cy.get('.grid.grid-cols-7').find('button').first().click()
    cy.contains('button', 'Close').click()
    cy.contains('h2', 'Schedule Task').should('not.exist')
    cy.get('button[title="Remove"]').should('not.exist')
  })
})
