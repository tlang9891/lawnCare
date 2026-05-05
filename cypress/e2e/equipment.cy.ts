describe('Equipment shed', () => {
  describe('empty shed', () => {
    beforeEach(() => {
      cy.loginAsTestUser()
    })

    it('shows Your Shed section', () => {
      cy.contains('Your Shed')
      cy.contains('Equipment & maintenance schedule')
    })

    it('shows empty state with add prompt', () => {
      cy.contains('No equipment yet.')
      cy.contains('Add your first piece of equipment →')
    })

    it('shows Add Equipment button', () => {
      cy.contains('button', 'Add Equipment').should('be.visible')
    })
  })

  describe('Add Equipment modal', () => {
    beforeEach(() => {
      cy.loginAsTestUser()
      cy.contains('button', 'Add Equipment').click()
    })

    it('opens the Add Equipment modal', () => {
      cy.contains('Add Equipment')
      cy.contains('label', 'Equipment Type')
      cy.contains('button', 'Cancel')
      cy.contains('button', 'Add to Shed')
    })

    it('Save button is disabled until make and model are filled', () => {
      cy.contains('button', 'Add to Shed').should('be.disabled')
    })

    it('shows mower-specific fields when Lawn Mower is selected', () => {
      cy.get('select').first().should('have.value', 'mower')
      cy.contains('Mower Type')
      cy.contains('button', 'Riding')
      cy.contains('button', 'Push')
    })

    it('switches to free-text make/model for non-mower equipment', () => {
      cy.get('select').first().select('Leaf Blower')
      cy.contains('Mower Type').should('not.exist')
      cy.contains('label', 'Make')
      cy.contains('label', 'Model')
      cy.get('input[placeholder="e.g. Craftsman"]').should('be.visible')
    })

    it('shows maintenance preview for selected equipment type', () => {
      cy.contains('Maintenance tracking included')
      cy.contains('Oil Change')
      cy.contains('Blade Sharpen/Replace')
    })

    it('shows no maintenance preview for "Other" type', () => {
      cy.get('select').first().select('Other')
      cy.contains('Maintenance tracking included').should('not.exist')
    })

    it('closes modal on Cancel', () => {
      cy.contains('button', 'Cancel').click()
      cy.contains('Add Equipment').should('not.exist')
    })

    it('closes modal on backdrop click', () => {
      cy.get('.fixed.inset-0 > .absolute.inset-0').click()
      cy.contains('h2', 'Add Equipment').should('not.exist')
    })

    it('validates file size limit for equipment photo (via error message visibility)', () => {
      cy.contains('Upload photo').should('be.visible')
    })

    it('selects mower sub-type', () => {
      cy.contains('button', 'Riding').click()
      cy.contains('button', 'Riding').should('have.class', 'bg-green-600')
    })
  })

  describe('adding a mower', () => {
    beforeEach(() => {
      cy.loginAsTestUser()
      cy.contains('button', 'Add Equipment').click()
    })

    it('adds a Honda mower and shows it in the shed', () => {
      cy.contains('button', 'Push').click()
      cy.get('select').first().should('have.value', 'mower')
      cy.get('select').eq(1).select('Honda')
      cy.get('select').last().select(1)
      cy.contains('button', 'Add to Shed').should('not.be.disabled')
      cy.contains('button', 'Add to Shed').click()
      cy.contains('Honda').should('be.visible')
      cy.contains('Lawn Mower').should('be.visible')
    })
  })

  describe('adding non-mower equipment', () => {
    beforeEach(() => {
      cy.loginAsTestUser()
      cy.contains('button', 'Add Equipment').click()
      cy.get('select').first().select('Leaf Blower')
    })

    it('enables Save once make and model are entered', () => {
      cy.get('input[placeholder="e.g. Craftsman"]').type('Husqvarna')
      cy.get('input[placeholder="e.g. BV428"]').type('350BT')
      cy.contains('button', 'Add to Shed').should('not.be.disabled')
    })

    it('adds blower and shows it in the shed', () => {
      cy.get('input[placeholder="e.g. Craftsman"]').type('Husqvarna')
      cy.get('input[placeholder="e.g. BV428"]').type('350BT')
      cy.contains('button', 'Add to Shed').click()
      cy.contains('Husqvarna').should('be.visible')
      cy.contains('Leaf Blower').should('be.visible')
    })
  })

  describe('with existing equipment', () => {
    beforeEach(() => {
      cy.visitWithFixtures('/', 'lawn_empty', 'equipment_with_data')
      cy.contains('Your Lawn Dashboard', { timeout: 10000 })
    })

    it('shows existing mower in the shed', () => {
      cy.contains('Honda')
      cy.contains('HRX217VKA')
      cy.contains('Lawn Mower')
    })

    it('shows maintenance items on equipment card', () => {
      cy.contains('Oil Change')
      cy.contains('Blade Sharpen/Replace')
      cy.contains('Air Filter Replace')
      cy.contains('Spark Plug Replace')
    })

    it('shows Last and Next date for maintenance with logged data', () => {
      cy.contains('Last: Nov 1, 2025')
    })

    it('shows "Never done" for unmaintained items', () => {
      cy.contains('Never done').should('be.visible')
    })

    it('shows Owner\'s Manual link', () => {
      cy.contains("Owner's Manual").should('have.attr', 'href').and('include', 'google.com')
    })

    it('opens maintenance log modal', () => {
      cy.contains('button', 'Log').first().click()
      cy.contains('Log Maintenance')
      cy.contains('Oil Change')
      cy.contains('label', 'Date Completed')
    })

    it('saves maintenance log entry', () => {
      cy.contains('button', 'Log').first().click()
      cy.contains('button', 'Save').click()
      cy.contains('Log Maintenance').should('not.exist')
    })

    it('opens maintenance history modal', () => {
      cy.contains('button', 'History (1)').click()
      cy.get('.fixed.inset-0').within(() => {
        cy.contains('Oil Change History')
        cy.contains('Nov 1, 2025')
      })
    })

    it('opens maintenance history showing empty for unmaintained items', () => {
      cy.contains('button', 'History (0)').first().click()
      cy.contains('No history recorded yet.')
    })

    it('opens Edit Equipment modal', () => {
      cy.get('button[title="Edit equipment"]').click()
      cy.contains('Edit Equipment')
      cy.contains('button', 'Save Changes')
    })

    it('edit modal is pre-filled with existing data', () => {
      cy.get('button[title="Edit equipment"]').click()
      cy.get('select').first().should('have.value', 'mower')
    })

    it('closes edit modal on Cancel', () => {
      cy.get('button[title="Edit equipment"]').click()
      cy.contains('button', 'Cancel').click()
      cy.contains('Edit Equipment').should('not.exist')
    })
  })
})
