describe('Login page', () => {
  beforeEach(() => {
    cy.intercept('GET', '**/auth/v1/user', { statusCode: 401, body: {} })
    cy.intercept('GET', '**/rest/v1/users*', { statusCode: 401, body: {} })
    cy.visit('/login')
  })

  it('renders the email step by default', () => {
    cy.contains('Welcome back')
    cy.contains('Enter your email')
    cy.get('input[type="email"]').should('be.visible')
    cy.contains('button', 'Send Code').should('be.visible')
    cy.contains('a', 'Sign up').should('have.attr', 'href', '/signup')
  })

  it('validates empty email', () => {
    cy.contains('button', 'Send Code').click()
    cy.contains('Email is required.')
  })

  it('validates invalid email format', () => {
    cy.get('input[type="email"]').type('not-an-email')
    cy.contains('button', 'Send Code').click()
    cy.contains('Enter a valid email address.')
  })

  it('transitions to OTP step after submitting valid email', () => {
    cy.intercept('POST', '**/auth/v1/otp*', { statusCode: 200, body: {} }).as('sendOtp')
    cy.get('input[type="email"]').type('user@example.com')
    cy.contains('button', 'Send Code').click()
    cy.wait('@sendOtp')
    cy.contains('Check your email')
    cy.contains('user@example.com')
    cy.contains('8-character code')
    cy.contains('button', 'Sign In')
  })

  it('shows error when sendOtp fails', () => {
    cy.intercept('POST', '**/auth/v1/otp*', { statusCode: 500, body: { message: 'Server error' } }).as('sendOtp')
    cy.get('input[type="email"]').type('user@example.com')
    cy.contains('button', 'Send Code').click()
    cy.wait('@sendOtp')
    cy.contains('Something went wrong')
  })

  it('validates empty OTP code', () => {
    cy.intercept('POST', '**/auth/v1/otp*', { statusCode: 200, body: {} })
    cy.get('input[type="email"]').type('user@example.com')
    cy.contains('button', 'Send Code').click()
    cy.contains('button', 'Sign In').click()
    cy.contains('Code is required.')
  })

  it('validates OTP code shorter than 8 characters', () => {
    cy.intercept('POST', '**/auth/v1/otp*', { statusCode: 200, body: {} })
    cy.get('input[type="email"]').type('user@example.com')
    cy.contains('button', 'Send Code').click()
    cy.get('input[type="text"]').type('1234')
    cy.contains('button', 'Sign In').click()
    cy.contains('8-character code from your email')
  })

  it('"Use a different email" resets back to email step', () => {
    cy.intercept('POST', '**/auth/v1/otp*', { statusCode: 200, body: {} })
    cy.get('input[type="email"]').type('user@example.com')
    cy.contains('button', 'Send Code').click()
    cy.contains('Check your email')
    cy.contains('Use a different email').click()
    cy.contains('Welcome back')
    cy.get('input[type="email"]').should('have.value', '')
  })

  it('shows error when verifyOtp fails', () => {
    cy.intercept('POST', '**/auth/v1/otp*', { statusCode: 200, body: {} })
    cy.intercept('POST', '**/auth/v1/verify*', { statusCode: 401, body: { message: 'Invalid token' } }).as('verifyOtp')
    cy.get('input[type="email"]').type('user@example.com')
    cy.contains('button', 'Send Code').click()
    cy.get('input[type="text"]').type('12345678')
    cy.contains('button', 'Sign In').click()
    cy.wait('@verifyOtp')
    cy.contains('Something went wrong')
  })
})

describe('Signup page', () => {
  beforeEach(() => {
    cy.intercept('GET', '**/auth/v1/user', { statusCode: 401, body: {} })
    cy.intercept('GET', '**/rest/v1/users*', { statusCode: 401, body: {} })
    cy.visit('/signup')
  })

  it('renders the details step by default', () => {
    cy.contains('Create your account')
    cy.contains('No password needed')
    cy.contains('label', 'First Name')
    cy.contains('label', 'Last Name')
    cy.contains('label', 'Email')
    cy.contains('button', 'Continue')
    cy.contains('a', 'Sign in').should('have.attr', 'href', '/login')
  })

  it('validates all required fields on empty submit', () => {
    cy.contains('button', 'Continue').click()
    cy.contains('First name is required.')
    cy.contains('Last name is required.')
    cy.contains('Email is required.')
  })

  it('validates invalid email', () => {
    cy.get('input[placeholder="Jane"]').type('Jane')
    cy.get('input[placeholder="Smith"]').type('Smith')
    cy.get('input[type="email"]').type('bad-email')
    cy.contains('button', 'Continue').click()
    cy.contains('Enter a valid email address.')
  })

  it('transitions to OTP step after valid details submit', () => {
    cy.intercept('POST', '**/auth/v1/otp*', { statusCode: 200, body: {} }).as('sendOtp')
    cy.get('input[placeholder="Jane"]').type('Jane')
    cy.get('input[placeholder="Smith"]').type('Smith')
    cy.get('input[type="email"]').type('new@example.com')
    cy.contains('button', 'Continue').click()
    cy.wait('@sendOtp')
    cy.contains('Check your email')
    cy.contains('new@example.com')
    cy.contains('button', 'Create Account')
  })

  it('"Go back" resets to details step', () => {
    cy.intercept('POST', '**/auth/v1/otp*', { statusCode: 200, body: {} })
    cy.get('input[placeholder="Jane"]').type('Jane')
    cy.get('input[placeholder="Smith"]').type('Smith')
    cy.get('input[type="email"]').type('new@example.com')
    cy.contains('button', 'Continue').click()
    cy.contains('Go back').click()
    cy.contains('Create your account')
  })

  it('validates empty OTP on signup', () => {
    cy.intercept('POST', '**/auth/v1/otp*', { statusCode: 200, body: {} })
    cy.get('input[placeholder="Jane"]').type('Jane')
    cy.get('input[placeholder="Smith"]').type('Smith')
    cy.get('input[type="email"]').type('new@example.com')
    cy.contains('button', 'Continue').click()
    cy.contains('button', 'Create Account').click()
    cy.contains('Code is required.')
  })

  it('shows error when sendOtp fails on signup', () => {
    cy.intercept('POST', '**/auth/v1/otp*', { statusCode: 500, body: { message: 'Rate limited' } }).as('sendOtp')
    cy.get('input[placeholder="Jane"]').type('Jane')
    cy.get('input[placeholder="Smith"]').type('Smith')
    cy.get('input[type="email"]').type('new@example.com')
    cy.contains('button', 'Continue').click()
    cy.wait('@sendOtp')
    cy.contains('Something went wrong')
  })
})
