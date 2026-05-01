'use client'

import React, { createContext, useContext, useEffect, useState } from 'react'
import type { AuthChangeEvent, Session } from '@supabase/supabase-js'
import { supabase } from '@/app/lib/supabase'

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
  updateProfile: (updates: ProfileUpdates) => Promise<void>
  completeOnboarding: (data: OnboardingData) => Promise<void>
}

// ── Helpers ────────────────────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function rowToUser(row: Record<string, any>, email: string): User {
  return {
    id:                 row.id,
    firstName:          row.first_name,
    lastName:           row.last_name,
    email,
    zipCode:            row.zip_code         ?? '',
    city:               row.city             ?? '',
    state:              row.state            ?? '',
    country:            row.country          ?? '',
    lawnSizeSqFt:       row.lawn_size_sq_ft  ?? 0,
    grassType:          (row.grass_type as GrassType) ?? 'other',
    avatarDataUrl:      row.avatar_url       ?? null,
    onboardingComplete: row.onboarding_complete ?? false,
    createdAt:          row.created_at,
  }
}

// ── Context ────────────────────────────────────────────────────────────────────

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }: { data: { session: Session | null } }) => {
      if (session?.user) {
        fetchProfile(session.user.id, session.user.email ?? '').then((p) => {
          setUser(p)
          setLoading(false)
        })
      } else {
        setLoading(false)
      }
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event: AuthChangeEvent, session: Session | null) => {
      if (event === 'SIGNED_IN' && session?.user) {
        const profile = await fetchProfile(session.user.id, session.user.email ?? '')
        setUser(profile)
      } else if (event === 'SIGNED_OUT') {
        setUser(null)
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  async function fetchProfile(id: string, email: string): Promise<User | null> {
    const { data, error } = await supabase.from('users').select('*').eq('id', id).single()
    if (error || !data) return null
    return rowToUser(data, email)
  }

  async function signup(data: SignupData): Promise<void> {
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: data.email.trim().toLowerCase(),
      password: data.password,
    })
    if (authError) throw new Error(authError.message)
    if (!authData.user) throw new Error('Signup failed. Please try again.')

    const { error: profileError } = await supabase.from('users').insert({
      id:                  authData.user.id,
      first_name:          data.firstName.trim(),
      last_name:           data.lastName.trim(),
      zip_code:            '',
      city:                '',
      state:               '',
      country:             '',
      lawn_size_sq_ft:     0,
      grass_type:          'other',
      onboarding_complete: false,
    })
    if (profileError) throw new Error(profileError.message)

    setUser({
      id:                 authData.user.id,
      firstName:          data.firstName.trim(),
      lastName:           data.lastName.trim(),
      email:              data.email.trim().toLowerCase(),
      zipCode:            '',
      city:               '',
      state:              '',
      country:            '',
      lawnSizeSqFt:       0,
      grassType:          'other',
      onboardingComplete: false,
      createdAt:          authData.user.created_at,
    })
  }

  async function login(email: string, password: string): Promise<void> {
    const { data, error } = await supabase.auth.signInWithPassword({
      email: email.trim().toLowerCase(),
      password,
    })
    if (error) throw new Error(error.message)
    if (!data.user) throw new Error('Login failed. Please try again.')

    const profile = await fetchProfile(data.user.id, data.user.email ?? '')
    if (!profile) throw new Error('Account not found. Please sign up.')
    setUser(profile)
  }

  function logout(): void {
    supabase.auth.signOut()
    setUser(null)
  }

  async function completeOnboarding(data: OnboardingData): Promise<void> {
    if (!user) return
    const { error } = await supabase.from('users').update({
      city:                data.city.trim(),
      state:               data.state.trim(),
      country:             data.country.trim(),
      zip_code:            data.zipCode.trim(),
      lawn_size_sq_ft:     data.lawnSizeSqFt,
      grass_type:          data.grassType,
      onboarding_complete: true,
    }).eq('id', user.id)
    if (error) throw new Error(error.message)

    setUser({
      ...user,
      city:               data.city.trim(),
      state:              data.state.trim(),
      country:            data.country.trim(),
      zipCode:            data.zipCode.trim(),
      lawnSizeSqFt:       data.lawnSizeSqFt,
      grassType:          data.grassType,
      onboardingComplete: true,
    })
  }

  async function updateProfile(updates: ProfileUpdates): Promise<void> {
    if (!user) return
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const dbUpdates: Record<string, any> = {}
    if (updates.firstName    !== undefined) dbUpdates.first_name      = updates.firstName
    if (updates.lastName     !== undefined) dbUpdates.last_name       = updates.lastName
    if (updates.zipCode      !== undefined) dbUpdates.zip_code        = updates.zipCode
    if (updates.city         !== undefined) dbUpdates.city            = updates.city
    if (updates.state        !== undefined) dbUpdates.state           = updates.state
    if (updates.country      !== undefined) dbUpdates.country         = updates.country
    if (updates.lawnSizeSqFt !== undefined) dbUpdates.lawn_size_sq_ft = updates.lawnSizeSqFt
    if (updates.grassType    !== undefined) dbUpdates.grass_type      = updates.grassType
    if (updates.avatarDataUrl !== undefined) dbUpdates.avatar_url     = updates.avatarDataUrl

    const { error } = await supabase.from('users').update(dbUpdates).eq('id', user.id)
    if (error) throw new Error(error.message)
    setUser({ ...user, ...updates })
  }

  return (
    <AuthContext.Provider value={{ user, loading, signup, login, logout, updateProfile, completeOnboarding }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider')
  return ctx
}
