'use client'

import { useState, FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useAuth } from '@/app/context/AuthContext'

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

function FieldError({ message }: { message?: string }) {
  if (!message) return null
  return <p className="mt-1.5 text-xs text-red-500">{message}</p>
}

function SignupForm() {
  const router = useRouter()
  const { sendOtp, verifyOtp } = useAuth()

  const [step, setStep]           = useState<'details' | 'otp'>('details')
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName]   = useState('')
  const [email, setEmail]         = useState('')
  const [otp, setOtp]             = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [errors, setErrors]       = useState<Record<string, string>>({})
  const [globalError, setGlobalError] = useState('')

  const inputClass = 'w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent'
  const labelClass = 'block text-sm font-medium text-gray-700 mb-1.5'

  async function handleDetailsSubmit(e: FormEvent) {
    e.preventDefault()
    setGlobalError('')
    const next: Record<string, string> = {}
    if (!firstName.trim()) next.firstName = 'First name is required.'
    if (!lastName.trim())  next.lastName  = 'Last name is required.'
    if (!email.trim()) {
      next.email = 'Email is required.'
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      next.email = 'Enter a valid email address.'
    }
    setErrors(next)
    if (Object.keys(next).length > 0) return

    setSubmitting(true)
    try {
      await sendOtp(email.trim(), { firstName: firstName.trim(), lastName: lastName.trim() })
      setStep('otp')
    } catch (err) {
      setGlobalError(err instanceof Error ? err.message : 'Something went wrong. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  async function handleOtpSubmit(e: FormEvent) {
    e.preventDefault()
    setGlobalError('')
    const next: Record<string, string> = {}
    if (!otp.trim()) {
      next.otp = 'Code is required.'
    } else if (!/^\d{6}$/.test(otp.trim())) {
      next.otp = 'Enter the 6-digit code from your email.'
    }
    setErrors(next)
    if (Object.keys(next).length > 0) return

    setSubmitting(true)
    try {
      const { isNewUser } = await verifyOtp(email.trim(), otp.trim())
      router.push(isNewUser ? '/onboarding' : '/')
    } catch (err) {
      setGlobalError(err instanceof Error ? err.message : 'Something went wrong. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center px-4 py-12">
      <Logo />

      <div className="w-full max-w-md bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
        {step === 'details' ? (
          <>
            <h1 className="text-xl font-bold text-gray-900 mb-1">Create your account</h1>
            <p className="text-sm text-gray-400 mb-7">No password needed — we&apos;ll email you a code to sign in.</p>

            {globalError && (
              <div className="mb-5 px-4 py-3 bg-red-50 border border-red-100 rounded-xl">
                <p className="text-sm text-red-600">{globalError}</p>
              </div>
            )}

            <form onSubmit={handleDetailsSubmit} noValidate className="space-y-5">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelClass}>First Name</label>
                  <input type="text" value={firstName} onChange={(e) => setFirstName(e.target.value)}
                    placeholder="Jane" autoComplete="given-name" className={inputClass} />
                  <FieldError message={errors.firstName} />
                </div>
                <div>
                  <label className={labelClass}>Last Name</label>
                  <input type="text" value={lastName} onChange={(e) => setLastName(e.target.value)}
                    placeholder="Smith" autoComplete="family-name" className={inputClass} />
                  <FieldError message={errors.lastName} />
                </div>
              </div>

              <div>
                <label className={labelClass}>Email</label>
                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                  placeholder="jane@example.com" autoComplete="email" className={inputClass} />
                <FieldError message={errors.email} />
              </div>

              <button type="submit" disabled={submitting}
                className="w-full bg-green-600 hover:bg-green-700 disabled:bg-green-400 disabled:cursor-not-allowed text-white font-semibold rounded-xl py-2.5 transition-colors mt-2">
                {submitting ? 'Sending code…' : 'Continue'}
              </button>
            </form>

            <p className="mt-6 text-center text-sm text-gray-400">
              Already have an account?{' '}
              <Link href="/login" className="text-green-600 font-semibold hover:text-green-700">Sign in</Link>
            </p>
          </>
        ) : (
          <>
            <h1 className="text-xl font-bold text-gray-900 mb-1">Check your email</h1>
            <p className="text-sm text-gray-400 mb-7">
              We sent a 6-digit code to <span className="font-medium text-gray-600">{email}</span>.
            </p>

            {globalError && (
              <div className="mb-5 px-4 py-3 bg-red-50 border border-red-100 rounded-xl">
                <p className="text-sm text-red-600">{globalError}</p>
              </div>
            )}

            <form onSubmit={handleOtpSubmit} noValidate className="space-y-5">
              <div>
                <label className={labelClass}>6-digit code</label>
                <input
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                  placeholder="123456"
                  autoComplete="one-time-code"
                  className={`${inputClass} tracking-widest text-center text-lg`}
                />
                <FieldError message={errors.otp} />
              </div>

              <button type="submit" disabled={submitting}
                className="w-full bg-green-600 hover:bg-green-700 disabled:bg-green-400 disabled:cursor-not-allowed text-white font-semibold rounded-xl py-2.5 transition-colors mt-2">
                {submitting ? 'Verifying…' : 'Create Account'}
              </button>
            </form>

            <button
              onClick={() => { setStep('details'); setOtp(''); setGlobalError(''); setErrors({}) }}
              className="mt-4 w-full text-sm text-gray-400 hover:text-gray-600 transition-colors"
            >
              Go back
            </button>
          </>
        )}
      </div>
    </div>
  )
}

export default function SignupPage() {
  return <SignupForm />
}
