'use client'

import React, { createContext, useContext, useEffect, useState } from 'react'

// ── Types ──────────────────────────────────────────────────────────────────────

export type GrassType =
  | 'bermuda'
  | 'kentucky_bluegrass'
  | 'fescue'
  | 'zoysia'
  | 'st_augustine'
  | 'ryegrass'
  | 'other'

export interface User {
  id: string
  firstName: string
  lastName: string
  email: string
  passwordHash: string   // btoa() encoded, not real crypto
  zipCode: string
  city: string
  state: string
  country: string
  lawnSizeSqFt: number
  grassType: GrassType
  avatarDataUrl?: string | null
  onboardingComplete: boolean
  createdAt: string
}

export interface SignupData {
  firstName: string
  lastName: string
  email: string
  password: string
}

export interface OnboardingData {
  city: string
  state: string
  country: string
  zipCode: string
  lawnSizeSqFt: number
  grassType: GrassType
}

export type ProfileUpdates = Partial<Pick<User,
  'firstName' | 'lastName' | 'zipCode' | 'city' | 'state' | 'country' |
  'lawnSizeSqFt' | 'grassType' | 'avatarDataUrl'
>>

interface AuthContextValue {
  user: User | null
  loading: boolean
  signup: (data: SignupData) => Promise<void>
  login: (email: string, password: string) => Promise<void>
  logout: () => void
  updateProfile: (updates: ProfileUpdates) => void
  completeOnboarding: (data: OnboardingData) => void
}

// ── Constants ──────────────────────────────────────────────────────────────────

const STORAGE_KEY = 'lawncare-user'

// ── Helpers ────────────────────────────────────────────────────────────────────

function hashPassword(password: string): string {
  return btoa(password)
}

function readUser(): User | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? (JSON.parse(raw) as User) : null
  } catch {
    return null
  }
}

function writeUser(user: User): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(user))
}

function clearUser(): void {
  localStorage.removeItem(STORAGE_KEY)
}

// ── Context ────────────────────────────────────────────────────────────────────

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setUser(readUser())
    setLoading(false)
  }, [])

  async function signup(data: SignupData): Promise<void> {
    const existing = readUser()
    if (existing && existing.email.toLowerCase() === data.email.toLowerCase()) {
      throw new Error('An account with this email already exists.')
    }

    const newUser: User = {
      id: crypto.randomUUID(),
      firstName: data.firstName.trim(),
      lastName: data.lastName.trim(),
      email: data.email.trim().toLowerCase(),
      passwordHash: hashPassword(data.password),
      zipCode: '',
      city: '',
      state: '',
      country: '',
      lawnSizeSqFt: 0,
      grassType: 'other',
      onboardingComplete: false,
      createdAt: new Date().toISOString(),
    }

    writeUser(newUser)
    setUser(newUser)
  }

  async function login(email: string, password: string): Promise<void> {
    const stored = readUser()
    if (
      !stored ||
      stored.email !== email.trim().toLowerCase() ||
      stored.passwordHash !== hashPassword(password)
    ) {
      throw new Error('Invalid email or password.')
    }
    setUser(stored)
  }

  function completeOnboarding(data: OnboardingData): void {
    if (!user) return
    const updated: User = {
      ...user,
      city: data.city.trim(),
      state: data.state.trim(),
      country: data.country.trim(),
      zipCode: data.zipCode.trim(),
      lawnSizeSqFt: data.lawnSizeSqFt,
      grassType: data.grassType,
      onboardingComplete: true,
    }
    writeUser(updated)
    setUser(updated)
  }

  function updateProfile(updates: ProfileUpdates): void {
    if (!user) return
    const updated = { ...user, ...updates }
    writeUser(updated)
    setUser(updated)
  }

  function logout(): void {
    clearUser()
    setUser(null)
  }

  return (
    <AuthContext.Provider value={{ user, loading, signup, login, logout, updateProfile, completeOnboarding }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return ctx
}
