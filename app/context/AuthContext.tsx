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

export interface SignupMetadata {
  firstName: string
  lastName: string
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
  sendOtp: (email: string, signupData?: SignupMetadata) => Promise<void>
  verifyOtp: (email: string, token: string) => Promise<{ isNewUser: boolean }>
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

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event: AuthChangeEvent, session: Session | null) => {
      if (event === 'SIGNED_IN' && session?.user) {
        const userId    = session.user.id
        const userEmail = session.user.email ?? ''
        // Defer DB calls: auth mutex is still held here, and supabase.from() needs
        // getSession() which re-acquires it — causes a deadlock without the defer.
        setTimeout(() => {
          fetchProfile(userId, userEmail).then((profile) => {
            if (profile) setUser(profile)
          })
        }, 0)
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

  async function sendOtp(email: string, signupData?: SignupMetadata): Promise<void> {
    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim().toLowerCase(),
      options: {
        shouldCreateUser: true,
        data: signupData ? {
          first_name: signupData.firstName.trim(),
          last_name:  signupData.lastName.trim(),
        } : undefined,
      },
    })
    if (error) throw new Error(error.message)
  }

  async function verifyOtp(email: string, token: string): Promise<{ isNewUser: boolean }> {
    const { data, error } = await supabase.auth.verifyOtp({
      email: email.trim().toLowerCase(),
      token,
      type: 'email',
    })
    if (error) throw new Error(error.message)
    if (!data.user || !data.session) throw new Error('Verification failed. Please try again.')

    let profile = await fetchProfile(data.user.id, data.user.email ?? '')
    let isNewUser = false

    if (!profile) {
      isNewUser = true
      const meta = data.user.user_metadata
      const { error: insertError } = await supabase.from('users').upsert({
        id:                  data.user.id,
        first_name:          meta?.first_name ?? '',
        last_name:           meta?.last_name  ?? '',
        zip_code:            '',
        city:                '',
        state:               '',
        country:             '',
        grass_type:          'other',
        lawn_size_sq_ft:     0,
        onboarding_complete: false,
      }, { onConflict: 'id' })
      if (insertError) throw new Error(insertError.message)

      profile = await fetchProfile(data.user.id, data.user.email ?? '')
      if (!profile) throw new Error('Profile was not created. Check your Supabase RLS policies.')
    }

    setUser(profile)
    return { isNewUser }
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
    if (updates.firstName     !== undefined) dbUpdates.first_name      = updates.firstName
    if (updates.lastName      !== undefined) dbUpdates.last_name       = updates.lastName
    if (updates.zipCode       !== undefined) dbUpdates.zip_code        = updates.zipCode
    if (updates.city          !== undefined) dbUpdates.city            = updates.city
    if (updates.state         !== undefined) dbUpdates.state           = updates.state
    if (updates.country       !== undefined) dbUpdates.country         = updates.country
    if (updates.lawnSizeSqFt  !== undefined) dbUpdates.lawn_size_sq_ft = updates.lawnSizeSqFt
    if (updates.grassType     !== undefined) dbUpdates.grass_type      = updates.grassType
    if (updates.avatarDataUrl !== undefined) dbUpdates.avatar_url      = updates.avatarDataUrl

    const { error } = await supabase.from('users').update(dbUpdates).eq('id', user.id)
    if (error) throw new Error(error.message)
    setUser({ ...user, ...updates })
  }

  return (
    <AuthContext.Provider value={{ user, loading, sendOtp, verifyOtp, logout, updateProfile, completeOnboarding }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider')
  return ctx
}
