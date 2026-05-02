import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import SignupPage from '@/app/signup/page'
import { useAuth } from '@/app/context/AuthContext'

jest.mock('@/app/context/AuthContext', () => ({ useAuth: jest.fn() }))
jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: jest.fn() }),
}))
jest.mock('next/link', () => ({
  __esModule: true,
  default: ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
}))

const mockUseAuth = useAuth as jest.MockedFunction<typeof useAuth>

const baseAuthValue = {
  user: null,
  loading: false,
  sendOtp: jest.fn(),
  verifyOtp: jest.fn(),
  logout: jest.fn(),
  updateProfile: jest.fn(),
  completeOnboarding: jest.fn(),
}

// ── Step 1: details form ───────────────────────────────────────────────────────

describe('Signup — details step', () => {
  beforeEach(() => {
    mockUseAuth.mockReturnValue({ ...baseAuthValue, sendOtp: jest.fn().mockResolvedValue(undefined) })
  })

  it('renders the create account heading', () => {
    render(<SignupPage />)
    expect(screen.getByText('Create your account')).toBeInTheDocument()
  })

  it('shows required-field errors when submitting an empty form', async () => {
    render(<SignupPage />)
    fireEvent.click(screen.getByText('Continue'))
    expect(await screen.findByText('First name is required.')).toBeInTheDocument()
    expect(screen.getByText('Last name is required.')).toBeInTheDocument()
    expect(screen.getByText('Email is required.')).toBeInTheDocument()
  })

  it('shows an invalid-email error for a malformed address', async () => {
    render(<SignupPage />)
    await userEvent.type(screen.getByPlaceholderText('Jane'), 'John')
    await userEvent.type(screen.getByPlaceholderText('Smith'), 'Doe')
    await userEvent.type(screen.getByPlaceholderText('jane@example.com'), 'notanemail')
    fireEvent.click(screen.getByText('Continue'))
    expect(await screen.findByText('Enter a valid email address.')).toBeInTheDocument()
  })

  it('does not show field errors for a valid form before submission', () => {
    render(<SignupPage />)
    expect(screen.queryByText('First name is required.')).not.toBeInTheDocument()
    expect(screen.queryByText('Email is required.')).not.toBeInTheDocument()
  })

  it('calls sendOtp with trimmed names and the email as entered', async () => {
    const mockSendOtp = jest.fn().mockResolvedValue(undefined)
    mockUseAuth.mockReturnValue({ ...baseAuthValue, sendOtp: mockSendOtp })
    render(<SignupPage />)

    await userEvent.type(screen.getByPlaceholderText('Jane'), 'John')
    await userEvent.type(screen.getByPlaceholderText('Smith'), 'Doe')
    await userEvent.type(screen.getByPlaceholderText('jane@example.com'), 'john@example.com')
    fireEvent.click(screen.getByText('Continue'))

    await waitFor(() => {
      expect(mockSendOtp).toHaveBeenCalledWith('john@example.com', {
        firstName: 'John',
        lastName: 'Doe',
      })
    })
  })

  it('advances to the OTP step after sendOtp resolves', async () => {
    render(<SignupPage />)
    await userEvent.type(screen.getByPlaceholderText('Jane'), 'Jane')
    await userEvent.type(screen.getByPlaceholderText('Smith'), 'Smith')
    await userEvent.type(screen.getByPlaceholderText('jane@example.com'), 'jane@example.com')
    fireEvent.click(screen.getByText('Continue'))
    expect(await screen.findByText('Check your email')).toBeInTheDocument()
  })

  it('shows a global error message when sendOtp rejects', async () => {
    mockUseAuth.mockReturnValue({
      ...baseAuthValue,
      sendOtp: jest.fn().mockRejectedValue(new Error('Email rate limit exceeded')),
    })
    render(<SignupPage />)
    await userEvent.type(screen.getByPlaceholderText('Jane'), 'Jane')
    await userEvent.type(screen.getByPlaceholderText('Smith'), 'Smith')
    await userEvent.type(screen.getByPlaceholderText('jane@example.com'), 'jane@example.com')
    fireEvent.click(screen.getByText('Continue'))
    expect(await screen.findByText('Email rate limit exceeded')).toBeInTheDocument()
  })
})

// ── Step 2: OTP form ───────────────────────────────────────────────────────────

describe('Signup — OTP step', () => {
  async function advanceToOtpStep() {
    const mockSendOtp = jest.fn().mockResolvedValue(undefined)
    mockUseAuth.mockReturnValue({ ...baseAuthValue, sendOtp: mockSendOtp })
    render(<SignupPage />)
    await userEvent.type(screen.getByPlaceholderText('Jane'), 'Jane')
    await userEvent.type(screen.getByPlaceholderText('Smith'), 'Smith')
    await userEvent.type(screen.getByPlaceholderText('jane@example.com'), 'jane@example.com')
    fireEvent.click(screen.getByText('Continue'))
    await screen.findByText('Check your email')
  }

  it('shows a required-code error when submitting without a code', async () => {
    await advanceToOtpStep()
    fireEvent.click(screen.getByText('Create Account'))
    expect(await screen.findByText('Code is required.')).toBeInTheDocument()
  })

  it('shows a length error for a code shorter than 8 characters', async () => {
    await advanceToOtpStep()
    await userEvent.type(screen.getByPlaceholderText('12345678'), '1234')
    fireEvent.click(screen.getByText('Create Account'))
    expect(await screen.findByText('Enter the 8-character code from your email.')).toBeInTheDocument()
  })

  it('calls verifyOtp with the correct email and token', async () => {
    const mockVerifyOtp = jest.fn().mockResolvedValue({ isNewUser: false })
    mockUseAuth.mockReturnValue({
      ...baseAuthValue,
      sendOtp: jest.fn().mockResolvedValue(undefined),
      verifyOtp: mockVerifyOtp,
    })
    render(<SignupPage />)
    await userEvent.type(screen.getByPlaceholderText('Jane'), 'Jane')
    await userEvent.type(screen.getByPlaceholderText('Smith'), 'Smith')
    await userEvent.type(screen.getByPlaceholderText('jane@example.com'), 'jane@example.com')
    fireEvent.click(screen.getByText('Continue'))
    await screen.findByText('Check your email')

    await userEvent.type(screen.getByPlaceholderText('12345678'), '12345678')
    fireEvent.click(screen.getByText('Create Account'))

    await waitFor(() => {
      expect(mockVerifyOtp).toHaveBeenCalledWith('jane@example.com', '12345678')
    })
  })

  it('navigates back to the details step via the Go back button', async () => {
    await advanceToOtpStep()
    fireEvent.click(screen.getByText('Go back'))
    expect(screen.getByText('Create your account')).toBeInTheDocument()
  })
})
