'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/app/context/AuthContext'
import type { GrassType } from '@/app/context/AuthContext'
import MowerMakeModelPicker from '@/app/components/MowerMakeModelPicker'

type Step = 1 | 2 | 3

interface MowerData {
  make: string
  model: string
  subType: 'riding' | 'push' | null
  skip: boolean
}

const MOWER_MAINTENANCE_DEFAULTS = [
  { name: 'Oil Change',            intervalMonths: 6  },
  { name: 'Blade Sharpen/Replace', intervalMonths: 6  },
  { name: 'Air Filter Replace',    intervalMonths: 6  },
  { name: 'Spark Plug Replace',    intervalMonths: 12 },
  { name: 'Fuel Filter Replace',   intervalMonths: 12 },
]

function Logo() {
  return (
    <div className="flex items-center gap-2.5">
      <div className="w-7 h-7 bg-green-400 rounded-lg flex items-center justify-center flex-shrink-0">
        <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4 text-green-900">
          <path d="M17 8C8 10 5.9 16.17 3.82 22H5.71c.19-.51.39-1.03.61-1.53 1.3-2.77 4.5-5.88 9.68-5.88 0-3-1-5.19-3-8z" />
        </svg>
      </div>
      <span className="text-gray-900 font-bold text-xl tracking-tight">LawnCare</span>
    </div>
  )
}

function ChevronIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
      strokeLinecap="round" strokeLinejoin="round"
      className="w-4 h-4 text-gray-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
      <polyline points="6 9 12 15 18 9" />
    </svg>
  )
}

function StepIndicator({ current, total }: { current: Step; total: number }) {
  return (
    <div className="flex items-center gap-2">
      {Array.from({ length: total }, (_, i) => {
        const n = (i + 1) as Step
        const done   = n < current
        const active = n === current
        return (
          <div key={n} className="flex items-center gap-2">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-colors ${
              done   ? 'bg-green-600 text-white' :
              active ? 'bg-green-600 text-white ring-4 ring-green-100' :
                       'bg-gray-100 text-gray-400'
            }`}>
              {done ? (
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"
                  strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              ) : n}
            </div>
            {i < total - 1 && (
              <div className={`w-10 h-0.5 ${n < current ? 'bg-green-600' : 'bg-gray-200'}`} />
            )}
          </div>
        )
      })}
    </div>
  )
}

// ── Step 1: Location ──────────────────────────────────────────────────────────

function Step1Location({ city, setCity, state, setState, country, setCountry, zipCode, setZipCode, onNext }: {
  city: string; setCity: (v: string) => void
  state: string; setState: (v: string) => void
  country: string; setCountry: (v: string) => void
  zipCode: string; setZipCode: (v: string) => void
  onNext: () => void
}) {
  const [errors, setErrors] = useState<Record<string, string>>({})

  function validate() {
    const next: Record<string, string> = {}
    if (!city.trim())    next.city    = 'City is required.'
    if (!state.trim())   next.state   = 'State / province is required.'
    if (!country.trim()) next.country = 'Country is required.'
    const zip = zipCode.trim().toUpperCase()
    if (!zip) {
      next.zipCode = 'ZIP or postal code is required.'
    } else if (!/^\d{5}(-\d{4})?$/.test(zip) && !/^[A-Z]\d[A-Z][ -]?\d[A-Z]\d$/.test(zip)) {
      next.zipCode = 'Enter a valid US ZIP (e.g. 90210) or Canadian postal code (e.g. K1A 0A9).'
    }
    setErrors(next)
    return Object.keys(next).length === 0
  }

  const inputClass = 'w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent'
  const labelClass = 'block text-sm font-medium text-gray-700 mb-1.5'

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-bold text-gray-900">Where do you live?</h2>
        <p className="text-sm text-gray-400 mt-1">We&apos;ll use this to set up your local weather.</p>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="col-span-2">
          <label className={labelClass}>City</label>
          <input type="text" value={city} onChange={(e) => setCity(e.target.value)}
            placeholder="e.g. Austin" autoComplete="address-level2" className={inputClass} />
          {errors.city && <p className="mt-1.5 text-xs text-red-500">{errors.city}</p>}
        </div>
        <div>
          <label className={labelClass}>State / Province</label>
          <input type="text" value={state} onChange={(e) => setState(e.target.value)}
            placeholder="e.g. Texas" autoComplete="address-level1" className={inputClass} />
          {errors.state && <p className="mt-1.5 text-xs text-red-500">{errors.state}</p>}
        </div>
        <div>
          <label className={labelClass}>Country</label>
          <input type="text" value={country} onChange={(e) => setCountry(e.target.value)}
            placeholder="e.g. USA" autoComplete="country-name" className={inputClass} />
          {errors.country && <p className="mt-1.5 text-xs text-red-500">{errors.country}</p>}
        </div>
        <div className="col-span-2">
          <label className={labelClass}>ZIP / Postal Code</label>
          <input type="text" value={zipCode}
            onChange={(e) => setZipCode(e.target.value.toUpperCase().slice(0, 10))}
            placeholder="e.g. 90210 or K1A 0A9" autoComplete="postal-code" className={inputClass} />
          {errors.zipCode && <p className="mt-1.5 text-xs text-red-500">{errors.zipCode}</p>}
        </div>
      </div>
      <button onClick={() => validate() && onNext()}
        className="w-full py-3 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-xl transition-colors">
        Continue
      </button>
    </div>
  )
}

// ── Step 2: Mower ─────────────────────────────────────────────────────────────

function Step2Mower({ mower, setMower, onNext, onBack }: {
  mower: MowerData; setMower: (v: MowerData) => void
  onNext: () => void; onBack: () => void
}) {
  const [errors, setErrors] = useState<Record<string, string>>({})

  function validate() {
    if (mower.skip) return true
    const next: Record<string, string> = {}
    if (!mower.make.trim())  next.make  = 'Make is required.'
    if (!mower.model.trim()) next.model = 'Model is required.'
    setErrors(next)
    return Object.keys(next).length === 0
  }

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-bold text-gray-900">Tell us about your mower</h2>
        <p className="text-sm text-gray-400 mt-1">We&apos;ll add it to your shed and set up maintenance tracking.</p>
      </div>

      {!mower.skip && (
        <>
          <MowerMakeModelPicker
            make={mower.make}
            model={mower.model}
            onMakeChange={(v) => setMower({ ...mower, make: v, model: '' })}
            onModelChange={(v) => setMower({ ...mower, model: v })}
            makeError={errors.make}
            modelError={errors.model}
            showRequiredMark={false}
          />
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Mower Type</label>
            <div className="grid grid-cols-2 gap-2">
              {(['riding', 'push'] as const).map((t) => (
                <button key={t} type="button" onClick={() => setMower({ ...mower, subType: t })}
                  className={`py-2.5 rounded-xl text-sm font-semibold border transition-colors ${
                    mower.subType === t
                      ? 'bg-green-600 text-white border-green-600'
                      : 'bg-white text-gray-600 border-gray-200 hover:border-green-400'
                  }`}>
                  {t === 'riding' ? 'Riding Mower' : 'Push Mower'}
                </button>
              ))}
            </div>
          </div>
        </>
      )}

      <button onClick={() => setMower({ make: '', model: '', subType: null, skip: !mower.skip })}
        className="w-full py-2.5 border border-gray-200 rounded-xl text-sm font-medium text-gray-400 hover:text-gray-600 hover:border-gray-300 transition-colors">
        {mower.skip ? 'I have a mower to add' : "I don't have a mower yet — skip"}
      </button>

      <div className="flex gap-3">
        <button onClick={onBack}
          className="flex-1 py-3 border border-gray-200 rounded-xl text-sm font-semibold text-gray-600 hover:bg-gray-50 transition-colors">
          Back
        </button>
        <button onClick={() => validate() && onNext()}
          className="flex-1 py-3 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-xl transition-colors">
          Continue
        </button>
      </div>
    </div>
  )
}

// ── Step 3: Lawn ──────────────────────────────────────────────────────────────

function Step3Lawn({ lawnSize, setLawnSize, grassType, setGrassType, onFinish, onBack, submitting, error }: {
  lawnSize: string; setLawnSize: (v: string) => void
  grassType: GrassType; setGrassType: (v: GrassType) => void
  onFinish: () => void; onBack: () => void
  submitting: boolean; error: string
}) {
  const [errors, setErrors] = useState<Record<string, string>>({})

  function validate() {
    const next: Record<string, string> = {}
    if (!lawnSize || Number(lawnSize) <= 0) next.lawnSize = 'Enter a valid lawn size.'
    setErrors(next)
    return Object.keys(next).length === 0
  }

  const inputClass = 'w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent'
  const labelClass = 'block text-sm font-medium text-gray-700 mb-1.5'

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-bold text-gray-900">About your lawn</h2>
        <p className="text-sm text-gray-400 mt-1">Help us personalise your maintenance schedule.</p>
      </div>

      <div>
        <label className={labelClass}>Lawn Size (sq ft)</label>
        <input type="number" value={lawnSize} onChange={(e) => setLawnSize(e.target.value)}
          placeholder="e.g. 2500" min="1" className={inputClass} />
        {errors.lawnSize && <p className="mt-1.5 text-xs text-red-500">{errors.lawnSize}</p>}
      </div>

      <div>
        <label className={labelClass}>Grass Type</label>
        <div className="relative">
          <select value={grassType} onChange={(e) => setGrassType(e.target.value as GrassType)}
            className={`${inputClass} appearance-none pr-8 bg-white`}>
            <option value="bermuda">Bermuda Grass</option>
            <option value="kentucky_bluegrass">Kentucky Bluegrass</option>
            <option value="fescue">Tall Fescue</option>
            <option value="zoysia">Zoysia Grass</option>
            <option value="st_augustine">St. Augustine</option>
            <option value="ryegrass">Perennial Ryegrass</option>
            <option value="other">Other / Not Sure</option>
          </select>
          <ChevronIcon />
        </div>
      </div>

      {error && (
        <div className="px-4 py-3 bg-red-50 border border-red-100 rounded-xl">
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}

      <div className="bg-green-50 rounded-xl p-4">
        <p className="text-xs font-bold text-green-700 mb-1 uppercase tracking-wide">Almost done!</p>
        <p className="text-sm text-green-700">After this we&apos;ll drop you straight onto your dashboard.</p>
      </div>

      <div className="flex gap-3">
        <button onClick={onBack}
          className="flex-1 py-3 border border-gray-200 rounded-xl text-sm font-semibold text-gray-600 hover:bg-gray-50 transition-colors">
          Back
        </button>
        <button onClick={() => validate() && onFinish()} disabled={submitting}
          className="flex-1 py-3 bg-green-600 hover:bg-green-700 disabled:bg-green-400 disabled:cursor-not-allowed text-white font-semibold rounded-xl transition-colors">
          {submitting ? 'Setting up…' : 'Go to Dashboard'}
        </button>
      </div>
    </div>
  )
}

// ── Main ──────────────────────────────────────────────────────────────────────

export default function OnboardingPage() {
  const { user, loading, completeOnboarding } = useAuth()
  const router = useRouter()

  const [step, setStep]           = useState<Step>(1)
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState('')

  const [city, setCity]       = useState('')
  const [state, setState]     = useState('')
  const [country, setCountry] = useState('')
  const [zipCode, setZipCode] = useState('')

  const [mower, setMower] = useState<MowerData>({ make: '', model: '', subType: null, skip: false })

  const [lawnSize, setLawnSize]   = useState('')
  const [grassType, setGrassType] = useState<GrassType>('bermuda')

  useEffect(() => {
    if (!loading && !user) router.replace('/login')
    if (!loading && user?.onboardingComplete) router.replace('/')
  }, [user, loading, router])

  async function handleFinish() {
    if (!user) return
    setSubmitting(true)
    setSubmitError('')
    try {
      await completeOnboarding({ city, state, country, zipCode, lawnSizeSqFt: Number(lawnSize), grassType })

      if (!mower.skip && mower.make.trim() && mower.model.trim()) {
        const equipKey = `lawncare-equipment-v2-${user.id}`
        const existing = (() => { try { return JSON.parse(localStorage.getItem(equipKey) ?? '[]') } catch { return [] } })()
        const newMower = {
          id: Date.now().toString(),
          type: 'mower',
          mowerSubType: mower.subType ?? undefined,
          year: new Date().getFullYear().toString(),
          make: mower.make.trim(),
          model: mower.model.trim(),
          purchaseDate: null,
          purchaseLocation: '',
          receiptDataUrl: null,
          photoDataUrl: null,
          maintenance: MOWER_MAINTENANCE_DEFAULTS.map((m, i) => ({
            id: `${Date.now()}-${i}`,
            name: m.name,
            logDates: [],
            intervalMonths: m.intervalMonths,
          })),
        }
        localStorage.setItem(equipKey, JSON.stringify([...existing, newMower]))
      }

      router.push('/')
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Something went wrong. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading || !user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="w-8 h-8 rounded-full border-4 border-green-600 border-t-transparent animate-spin" />
      </div>
    )
  }

  const stepLabels = ['Location', 'Mower', 'Lawn']

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <div className="bg-white border-b border-gray-100 px-4 py-4">
        <div className="max-w-lg mx-auto flex items-center justify-between">
          <Logo />
          <span className="text-sm text-gray-400">Step {step} of 3</span>
        </div>
      </div>

      <div className="bg-white border-b border-gray-100 px-4 py-5">
        <div className="max-w-lg mx-auto">
          <div className="flex items-center justify-between mb-3">
            <StepIndicator current={step} total={3} />
            <div className="flex gap-4 ml-6">
              {stepLabels.map((label, i) => (
                <span key={label} className={`text-xs font-semibold ${
                  i + 1 === step ? 'text-green-600' : i + 1 < step ? 'text-gray-400' : 'text-gray-300'
                }`}>{label}</span>
              ))}
            </div>
          </div>
          <div className="w-full bg-gray-100 rounded-full h-1.5">
            <div className="bg-green-500 h-1.5 rounded-full transition-all duration-500"
              style={{ width: `${((step - 1) / 2) * 100 + 33}%` }} />
          </div>
        </div>
      </div>

      {step === 1 && (
        <div className="bg-gradient-to-r from-green-700 to-green-600 px-4 py-5">
          <div className="max-w-lg mx-auto">
            <p className="text-green-200 text-sm">Welcome, {user.firstName}!</p>
            <p className="text-white font-bold text-lg mt-0.5">Let&apos;s get your lawn set up</p>
          </div>
        </div>
      )}

      <div className="flex-1 px-4 py-8">
        <div className="max-w-lg mx-auto bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          {step === 1 && (
            <Step1Location city={city} setCity={setCity} state={state} setState={setState}
              country={country} setCountry={setCountry} zipCode={zipCode} setZipCode={setZipCode}
              onNext={() => setStep(2)} />
          )}
          {step === 2 && (
            <Step2Mower mower={mower} setMower={setMower}
              onNext={() => setStep(3)} onBack={() => setStep(1)} />
          )}
          {step === 3 && (
            <Step3Lawn lawnSize={lawnSize} setLawnSize={setLawnSize}
              grassType={grassType} setGrassType={setGrassType}
              onFinish={handleFinish} onBack={() => setStep(2)}
              submitting={submitting} error={submitError} />
          )}
        </div>
      </div>
    </div>
  )
}
