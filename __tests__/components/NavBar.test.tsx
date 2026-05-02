import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import NavBar from '@/app/components/NavBar'
import { useAuth } from '@/app/context/AuthContext'
import type { User } from '@/app/context/AuthContext'

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
  loading: false,
  sendOtp: jest.fn(),
  verifyOtp: jest.fn(),
  logout: jest.fn(),
  updateProfile: jest.fn(),
  completeOnboarding: jest.fn(),
}

const mockUser: User = {
  id: 'user-1',
  firstName: 'Jane',
  lastName: 'Smith',
  email: 'jane@example.com',
  zipCode: '78701',
  city: 'Austin',
  state: 'TX',
  country: 'US',
  lawnSizeSqFt: 1000,
  grassType: 'bermuda',
  avatarDataUrl: null,
  onboardingComplete: true,
  createdAt: '2024-01-01T00:00:00Z',
}

describe('NavBar — unauthenticated', () => {
  beforeEach(() => {
    mockUseAuth.mockReturnValue({ ...baseAuthValue, user: null })
  })

  it('renders the LawnCare brand name', () => {
    render(<NavBar />)
    expect(screen.getByText('LawnCare')).toBeInTheDocument()
  })

  it('shows Sign In link', () => {
    render(<NavBar />)
    expect(screen.getByText('Sign In')).toBeInTheDocument()
  })

  it('shows Sign Up link', () => {
    render(<NavBar />)
    expect(screen.getByText('Sign Up')).toBeInTheDocument()
  })

  it('does not show a Sign Out button', () => {
    render(<NavBar />)
    expect(screen.queryByText('Sign Out')).not.toBeInTheDocument()
  })
})

describe('NavBar — authenticated', () => {
  beforeEach(() => {
    mockUseAuth.mockReturnValue({ ...baseAuthValue, user: mockUser })
  })

  it('shows the logged-in user full name', () => {
    render(<NavBar />)
    expect(screen.getByText('Jane Smith')).toBeInTheDocument()
  })

  it('shows a Sign Out button', () => {
    render(<NavBar />)
    expect(screen.getByText('Sign Out')).toBeInTheDocument()
  })

  it('does not show Sign In or Sign Up', () => {
    render(<NavBar />)
    expect(screen.queryByText('Sign In')).not.toBeInTheDocument()
    expect(screen.queryByText('Sign Up')).not.toBeInTheDocument()
  })

  it('calls logout when Sign Out is clicked', () => {
    const mockLogout = jest.fn()
    mockUseAuth.mockReturnValue({ ...baseAuthValue, user: mockUser, logout: mockLogout })
    render(<NavBar />)
    fireEvent.click(screen.getByText('Sign Out'))
    expect(mockLogout).toHaveBeenCalledTimes(1)
  })

  it('links the user name to /profile', () => {
    render(<NavBar />)
    const nameLink = screen.getByText('Jane Smith').closest('a')
    expect(nameLink).toHaveAttribute('href', '/profile')
  })
})
