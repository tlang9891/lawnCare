'use client'

import { useState, FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useAuth } from '@/app/context/AuthContext'
import type { GrassType } from '@/app/context/AuthContext'

// ── Logo ───────────────────────────────────────────────────────────────────────

function Logo() {
  return (
    <div className="flex flex-col items-center mb-8">
      <div className="flex items-center gap-2.5">
        <div className="w-7 h-7 bg-green-400 rounded-lg flex items-center justify-center flex-shrink-0">
          <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4 text-green-900">
            <path d="M17 8C8 10 5.9 16.17 3.82 22H5.71c.19-.51.39-1.03.61-1.53 1.3-2.77 4.5-5.88 9.68-5.88 0-3-1-5.19-3-8z" />
          </svg>
        </div>
        <span className="text-gray-900 font-bold text-xl tracking-tight">LawnCare</span>
      </div>
    </div>
  )
}

// ── Eye icon toggle ────────────────────────────────────────────────────────────

function EyeIcon({ open }: { open: boolean }) {
  return open ? (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
      strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  ) : (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
      strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
      <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
      <line x1="1" y1="1" x2="23" y2="23" />
    </svg>
  )
}

// ── Chevron for select ─────────────────────────────────────────────────────────

function Chevron() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
      strokeLinecap="round" strokeLinejoin="round"
      className="w-4 h-4 text-gray-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
      <polyline points="6 9 12 15 18 9" />
    </svg>
  )
}

// ── Field error ────────────────────────────────────────────────────────────────

function FieldError({ message }: { message?: string }) {
  if (!message) return null
  return <p className="mt-1.5 text-xs text-red-500">{message}</p>
}

// ── Signup inner (needs useAuth, so wrapped in provider below) ─────────────────

function SignupForm() {
  const router = useRouter()
  const { signup } = useAuth()

  const [firstName, setFirstName]       = useState('')
  const [lastName, setLastName]         = useState('')
  const [email, setEmail]               = useState('')
  const [password, setPassword]         = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [zipCode, setZipCode]           = useState('')
  const [lawnSize, setLawnSize]         = useState('')
  const [grassType, setGrassType]       = useState<GrassType>('bermuda')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirm, setShowConfirm]   = useState(false)
  const [submitting, setSubmitting]     = useState(false)

  const [errors, setErrors] = useState<Record<string, string>>({})
  const [globalError, setGlobalError] = useState('')

  function validate(): boolean {
    const next: Record<string, string> = {}

    if (!firstName.trim()) next.firstName = 'First name is required.'
    if (!lastName.trim())  next.lastName  = 'Last name is required.'

    if (!email.trim()) {
      next.email = 'Email is required.'
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      next.email = 'Enter a valid email address.'
    }

    if (!password) {
      next.password = 'Password is required.'
    } else if (password.length < 8) {
      next.password = 'Password must be at least 8 characters.'
    }

    if (!confirmPassword) {
      next.confirmPassword = 'Please confirm your password.'
    } else if (password !== confirmPassword) {
      next.confirmPassword = 'Passwords do not match.'
    }

    const zip = zipCode.trim().toUpperCase()
    const usZip      = /^\d{5}(-\d{4})?$/
    const caPostal   = /^[A-Z]\d[A-Z][ -]?\d[A-Z]\d$/
    if (!zip) {
      next.zipCode = 'ZIP or postal code is required.'
    } else if (!usZip.test(zip) && !caPostal.test(zip)) {
      next.zipCode = 'Enter a valid US ZIP code (e.g. 90210) or Canadian postal code (e.g. K1A 0A9).'
    }

    if (!lawnSize) {
      next.lawnSize = 'Lawn size is required.'
    } else if (Number(lawnSize) <= 0) {
      next.lawnSize = 'Enter a valid lawn size.'
    }

    setErrors(next)
    return Object.keys(next).length === 0
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setGlobalError('')
    if (!validate()) return

    setSubmitting(true)
    try {
      await signup({
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        email: email.trim(),
        password,
        zipCode: zipCode.trim().toUpperCase(),
        lawnSizeSqFt: Number(lawnSize),
        grassType,
      })
      router.push('/')
    } catch (err) {
      setGlobalError(err instanceof Error ? err.message : 'Something went wrong. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  const inputClass = 'w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent'
  const labelClass = 'block text-sm font-medium text-gray-700 mb-1.5'

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center px-4 py-12">
      <Logo />

      <div className="w-full max-w-md bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
        <h1 className="text-xl font-bold text-gray-900 mb-1">Create your account</h1>
        <p className="text-sm text-gray-400 mb-7">Start tracking your lawn in minutes.</p>

        {globalError && (
          <div className="mb-5 px-4 py-3 bg-red-50 border border-red-100 rounded-xl">
            <p className="text-sm text-red-600">{globalError}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} noValidate className="space-y-5">

          {/* First + Last Name */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelClass}>First Name</label>
              <input
                type="text"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                placeholder="Jane"
                autoComplete="given-name"
                className={inputClass}
              />
              <FieldError message={errors.firstName} />
            </div>
            <div>
              <label className={labelClass}>Last Name</label>
              <input
                type="text"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                placeholder="Smith"
                autoComplete="family-name"
                className={inputClass}
              />
              <FieldError message={errors.lastName} />
            </div>
          </div>

          {/* Email */}
          <div>
            <label className={labelClass}>Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="jane@example.com"
              autoComplete="email"
              className={inputClass}
            />
            <FieldError message={errors.email} />
          </div>

          {/* Password */}
          <div>
            <label className={labelClass}>Password</label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Min. 8 characters"
                autoComplete="new-password"
                className={`${inputClass} pr-10`}
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                <EyeIcon open={showPassword} />
              </button>
            </div>
            <FieldError message={errors.password} />
          </div>

          {/* Confirm Password */}
          <div>
            <label className={labelClass}>Confirm Password</label>
            <div className="relative">
              <input
                type={showConfirm ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Re-enter your password"
                autoComplete="new-password"
                className={`${inputClass} pr-10`}
              />
              <button
                type="button"
                onClick={() => setShowConfirm((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                aria-label={showConfirm ? 'Hide password' : 'Show password'}
              >
                <EyeIcon open={showConfirm} />
              </button>
            </div>
            <FieldError message={errors.confirmPassword} />
          </div>

          {/* ZIP / Postal Code */}
          <div>
            <label className={labelClass}>ZIP / Postal Code</label>
            <input
              type="text"
              value={zipCode}
              onChange={(e) => setZipCode(e.target.value.toUpperCase().slice(0, 10))}
              placeholder="e.g. 90210 or K1A 0A9"
              autoComplete="postal-code"
              className={inputClass}
            />
            <FieldError message={errors.zipCode} />
          </div>

          {/* Lawn Size */}
          <div>
            <label className={labelClass}>Lawn Size (sq ft)</label>
            <input
              type="number"
              value={lawnSize}
              onChange={(e) => setLawnSize(e.target.value)}
              placeholder="e.g. 2500"
              min="1"
              className={inputClass}
            />
            <FieldError message={errors.lawnSize} />
          </div>

          {/* Grass Type */}
          <div>
            <label className={labelClass}>Grass Type</label>
            <div className="relative">
              <select
                value={grassType}
                onChange={(e) => setGrassType(e.target.value as GrassType)}
                className={`${inputClass} appearance-none pr-8 bg-white`}
              >
                <option value="bermuda">Bermuda Grass</option>
                <option value="kentucky_bluegrass">Kentucky Bluegrass</option>
                <option value="fescue">Tall Fescue</option>
                <option value="zoysia">Zoysia Grass</option>
                <option value="st_augustine">St. Augustine</option>
                <option value="ryegrass">Perennial Ryegrass</option>
                <option value="other">Other / Not Sure</option>
              </select>
              <Chevron />
            </div>
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={submitting}
            className="w-full bg-green-600 hover:bg-green-700 disabled:bg-green-400 disabled:cursor-not-allowed text-white font-semibold rounded-xl py-2.5 transition-colors mt-2"
          >
            {submitting ? 'Creating account…' : 'Create Account'}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-gray-400">
          Already have an account?{' '}
          <Link href="/login" className="text-green-600 font-semibold hover:text-green-700">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  )
}

export default function SignupPage() {
  return <SignupForm />
}
