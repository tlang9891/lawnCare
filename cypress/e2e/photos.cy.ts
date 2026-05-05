describe('Lawn Photo Gallery', () => {
  beforeEach(() => {
    cy.loginAsTestUser()
    cy.contains('button', 'Photos').click()
  })

  it('shows the Lawn Photos heading', () => {
    cy.contains('h2', 'Lawn Photos').should('be.visible')
  })

  it('shows photo count', () => {
    cy.contains('0 photos')
  })

  it('shows empty state when no photos', () => {
    cy.contains('No photos yet.').should('be.visible')
    cy.contains('Add your first lawn photo →')
  })

  it('shows Add Photo button', () => {
    cy.contains('button', 'Add Photo').should('be.visible')
  })

  it('opens Add Lawn Photo modal on button click', () => {
    cy.contains('button', 'Add Photo').click()
    cy.contains('Add Lawn Photo').should('be.visible')
    cy.contains('Take Photo')
    cy.contains('Upload Photo')
    cy.contains('Caption (optional)')
    cy.contains('button', 'Cancel')
    cy.contains('button', 'Save Photo').should('be.disabled')
  })

  it('closes Add Photo modal on Cancel', () => {
    cy.contains('button', 'Add Photo').click()
    cy.contains('button', 'Cancel').click()
    cy.contains('Add Lawn Photo').should('not.exist')
  })

  it('adds a photo via Upload Photo and shows it', () => {
    cy.contains('button', 'Add Photo').click()
    cy.get('input[type="file"][accept="image/*"]:not([capture])').selectFile({
      contents: Cypress.Buffer.from('fake image content'),
      fileName: 'lawn.jpg',
      mimeType: 'image/jpeg',
    }, { force: true })
    cy.get('img[alt="Preview"]').should('be.visible')
    cy.contains('button', 'Save Photo').should('not.be.disabled')
    cy.contains('button', 'Save Photo').click()
    cy.contains('1 photo')
    cy.get('img[alt="Lawn photo"]').should('exist')
  })

  it('supports adding a caption before saving', () => {
    cy.contains('button', 'Add Photo').click()
    cy.get('input[type="file"][accept="image/*"]:not([capture])').selectFile({
      contents: Cypress.Buffer.from('fake image content'),
      fileName: 'captioned.jpg',
      mimeType: 'image/jpeg',
    }, { force: true })
    cy.get('input[placeholder*="Fresh cut"]').type('Looking great!')
    cy.contains('button', 'Save Photo').click()
    cy.contains('Looking great!').should('be.visible')
  })

  it('rejects photos over 5 MB', () => {
    const bigBuffer = Cypress.Buffer.alloc(6 * 1024 * 1024)
    cy.contains('button', 'Add Photo').click()
    cy.get('input[type="file"][accept="image/*"]:not([capture])').selectFile({
      contents: bigBuffer,
      fileName: 'big.jpg',
      mimeType: 'image/jpeg',
    }, { force: true })
    cy.contains('Photo must be under 5 MB.').should('be.visible')
  })

  it('photo count updates after upload', () => {
    for (let i = 0; i < 2; i++) {
      cy.contains('button', 'Add Photo').click()
      cy.get('input[type="file"][accept="image/*"]:not([capture])').selectFile({
        contents: Cypress.Buffer.from(`image ${i}`),
        fileName: `photo${i}.jpg`,
        mimeType: 'image/jpeg',
      }, { force: true })
      cy.contains('button', 'Save Photo').click()
    }
    cy.contains('2 photos')
  })

  it('opens lightbox on photo click', () => {
    cy.contains('button', 'Add Photo').click()
    cy.get('input[type="file"][accept="image/*"]:not([capture])').selectFile({
      contents: Cypress.Buffer.from('fake image'),
      fileName: 'click.jpg',
      mimeType: 'image/jpeg',
    }, { force: true })
    cy.contains('button', 'Save Photo').click()
    cy.get('img[alt="Lawn photo"]').click()
    cy.get('.fixed.inset-0').within(() => {
      cy.contains('button', 'Delete')
    })
  })

  it('deletes a photo via lightbox', () => {
    cy.contains('button', 'Add Photo').click()
    cy.get('input[type="file"][accept="image/*"]:not([capture])').selectFile({
      contents: Cypress.Buffer.from('fake image'),
      fileName: 'delete-me.jpg',
      mimeType: 'image/jpeg',
    }, { force: true })
    cy.contains('button', 'Save Photo').click()
    cy.get('img[alt="Lawn photo"]').click()
    cy.contains('button', 'Delete').click()
    cy.contains('Yes, delete').click()
    cy.contains('No photos yet.').should('be.visible')
  })

  it('switching back to dashboard tab shows care cards', () => {
    cy.contains('button', 'Dashboard').click()
    cy.contains('Watering').should('be.visible')
    cy.contains('Lawn Photos').should('not.exist')
  })
})
