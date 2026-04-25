'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '../context/AuthContext'
import type { GrassType } from '../context/AuthContext'

// ── Growing zone data ─────────────────────────────────────────────────────────

function latToZone(lat: number): string {
  if (lat >= 60) return '2'
  if (lat >= 55) return '3'
  if (lat >= 50) return '4'
  if (lat >= 45) return '5'
  if (lat >= 40) return '6'
  if (lat >= 35) return '7'
  if (lat >= 30) return '8'
  if (lat >= 25) return '9'
  return '10'
}

const ZONE_DATA: Record<string, { range: string; desc: string; grasses: string[]; color: string; textColor: string }> = {
  '2':  { range: '-50°F to -40°F', desc: 'Extremely cold winters. Very limited turf options.',       grasses: ['Creeping Red Fescue', 'Hard Fescue'],                              color: 'bg-blue-100',    textColor: 'text-blue-800'   },
  '3':  { range: '-40°F to -30°F', desc: 'Very cold winters. Short growing season.',                  grasses: ['Kentucky Bluegrass', 'Creeping Red Fescue'],                        color: 'bg-blue-100',    textColor: 'text-blue-800'   },
  '4':  { range: '-30°F to -20°F', desc: 'Cold winters. Cool-season grasses thrive.',                 grasses: ['Kentucky Bluegrass', 'Perennial Ryegrass', 'Tall Fescue'],         color: 'bg-sky-100',     textColor: 'text-sky-800'    },
  '5':  { range: '-20°F to -10°F', desc: 'Cool-season grasses perform best.',                         grasses: ['Kentucky Bluegrass', 'Tall Fescue', 'Perennial Ryegrass'],         color: 'bg-teal-100',    textColor: 'text-teal-800'   },
  '6':  { range: '-10°F to 0°F',   desc: 'Excellent zone for cool-season turf.',                      grasses: ['Tall Fescue', 'Kentucky Bluegrass', 'Zoysia (south edge)'],        color: 'bg-green-100',   textColor: 'text-green-800'  },
  '7':  { range: '0°F to 10°F',    desc: 'Transition zone — cool and warm season grasses viable.',    grasses: ['Tall Fescue', 'Bermuda', 'Zoysia', 'Kentucky Bluegrass'],          color: 'bg-lime-100',    textColor: 'text-lime-800'   },
  '8':  { range: '10°F to 20°F',   desc: 'Warm-season grasses dominate. Mild winters.',               grasses: ['Bermuda', 'Zoysia', 'St. Augustine', 'Centipede'],                 color: 'bg-yellow-100',  textColor: 'text-yellow-800' },
  '9':  { range: '20°F to 30°F',   desc: 'Warm-season grasses year-round. Very mild winters.',        grasses: ['St. Augustine', 'Bermuda', 'Bahiagrass', 'Zoysia'],                color: 'bg-orange-100',  textColor: 'text-orange-800' },
  '10': { range: '30°F to 40°F',   desc: 'Subtropical. Warm-season grasses only.',                    grasses: ['St. Augustine', 'Bermuda', 'Bahiagrass'],                          color: 'bg-red-100',     textColor: 'text-red-800'    },
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const AVATAR_COLORS = ['bg-green-500', 'bg-blue-500', 'bg-purple-500', 'bg-amber-500', 'bg-teal-500']

function getAvatarColor(name: string): string {
  let hash = 0
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash)
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length]
}

function getInitials(first: string, last: string): string {
  return `${first.charAt(0)}${last.charAt(0)}`.toUpperCase()
}

// ── Sub-components ────────────────────────────────────────────────────────────

function SectionCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mt-4">
      <h2 className="text-base font-bold text-gray-900 mb-4">{title}</h2>
      {children}
    </div>
  )
}

function FieldError({ message }: { message?: string }) {
  if (!message) return null
  return <p className="mt-1.5 text-xs text-red-500">{message}</p>
}

function ChevronIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
      className="w-4 h-4 text-gray-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
      <polyline points="6 9 12 15 18 9" />
    </svg>
  )
}

function CameraIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
      <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
      <circle cx="12" cy="13" r="4" />
    </svg>
  )
}

// ── Main Profile Page ─────────────────────────────────────────────────────────

export default function ProfilePage() {
  const { user, loading: authLoading, updateProfile } = useAuth()
  const router = useRouter()

  const [firstName, setFirstName]               = useState('')
  const [lastName, setLastName]                 = useState('')
  const [zipCode, setZipCode]                   = useState('')
  const [city, setCity]                         = useState('')
  const [state, setState]                       = useState('')
  const [country, setCountry]                   = useState('US')
  const [grassType, setGrassType]               = useState<GrassType>('bermuda')
  const [lawnSize, setLawnSize]                 = useState('')
  const [avatarDataUrl, setAvatarDataUrl]       = useState<string | null>(null)

  const [lat, setLat]                           = useState<number | null>(null)
  const [geoLoading, setGeoLoading]             = useState(false)
  const [fileError, setFileError]               = useState('')
  const [errors, setErrors]                     = useState<Record<string, string>>({})
  const [saving, setSaving]                     = useState(false)
  const [saveSuccess, setSaveSuccess]           = useState(false)

  const fileRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!authLoading && !user) router.push('/login')
  }, [user, authLoading, router])

  // Seed form from user on mount
  useEffect(() => {
    if (!user) return
    setFirstName(user.firstName)
    setLastName(user.lastName)
    setZipCode(user.zipCode ?? '')
    setCity(user.city ?? '')
    setState(user.state ?? '')
    setCountry(user.country ?? 'US')
    setGrassType(user.grassType)
    setLawnSize(user.lawnSizeSqFt?.toString() ?? '')
    setAvatarDataUrl(user.avatarDataUrl ?? null)
  }, [user])

  // Geocode ZIP/postal → city/state/lat
  const geocodeZip = useCallback(async (zip: string) => {
    if (zip.length < 3) return
    setGeoLoading(true)
    try {
      const isCA = /^[A-Za-z]\d[A-Za-z]/i.test(zip.trim())
      if (isCA) {
        const code = zip.replace(/\s+/g, '').toUpperCase()
        const res  = await fetch(
          `https://nominatim.openstreetmap.org/search?postalcode=${encodeURIComponent(code)}&countrycodes=ca&format=json&addressdetails=1&limit=1`,
          { headers: { 'Accept-Language': 'en' } }
        )
        const data = await res.json()
        if (data.length) {
          const { lat, address } = data[0]
          setCity(address?.city || address?.town || address?.village || address?.county || '')
          setState(address?.state || '')
          setLat(parseFloat(lat))
        }
      } else {
        if (zip.length < 5) { setGeoLoading(false); return }
        const res  = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(zip)}&count=1&language=en&format=json`)
        const data = await res.json()
        const r    = data.results?.[0]
        if (r) {
          setCity(r.name ?? '')
          setState(r.admin1 ?? '')
          setLat(r.latitude)
        }
      }
    } catch { /* silent */ }
    setGeoLoading(false)
  }, [])

  // Initial geocode from saved zip
  useEffect(() => {
    if (user?.zipCode) geocodeZip(user.zipCode)
  }, [user?.zipCode, geocodeZip])

  // Debounce geocode on zip change
  useEffect(() => {
    if (!zipCode) return
    const t = setTimeout(() => geocodeZip(zipCode), 700)
    return () => clearTimeout(t)
  }, [zipCode, geocodeZip])

  function handleAvatarFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setFileError('')
    if (file.size > 2 * 1024 * 1024) {
      setFileError('Photo must be under 2 MB.')
      e.target.value = ''
      return
    }
    const reader = new FileReader()
    reader.onload = (ev) => setAvatarDataUrl(ev.target?.result as string)
    reader.readAsDataURL(file)
  }

  function validate(): boolean {
    const next: Record<string, string> = {}
    if (!firstName.trim()) next.firstName = 'First name is required.'
    if (!lastName.trim())  next.lastName  = 'Last name is required.'
    if (!zipCode.trim())   next.zipCode   = 'ZIP or postal code is required.'
    setErrors(next)
    return Object.keys(next).length === 0
  }

  async function handleSave() {
    if (!validate()) return
    setSaving(true)
    updateProfile({
      firstName: firstName.trim(),
      lastName:  lastName.trim(),
      zipCode:   zipCode.trim().toUpperCase(),
      city:      city.trim(),
      state:     state.trim(),
      country,
      grassType,
      lawnSizeSqFt: Number(lawnSize) || 0,
      avatarDataUrl,
    })
    setSaving(false)
    setSaveSuccess(true)
    setTimeout(() => setSaveSuccess(false), 2500)
  }

  if (authLoading || !user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="w-8 h-8 rounded-full border-4 border-green-600 border-t-transparent animate-spin" />
      </div>
    )
  }

  const zone     = lat !== null ? latToZone(lat) : null
  const zoneInfo = zone ? ZONE_DATA[zone] : null
  const initials = getInitials(firstName || user.firstName, lastName || user.lastName)
  const avatarBg = getAvatarColor(user.firstName + user.lastName)

  const inputClass = 'w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent'
  const labelClass = 'block text-sm font-medium text-gray-700 mb-1.5'

  return (
    <div className="min-h-screen bg-gray-50 pb-16">
      <div className="max-w-xl mx-auto px-4 pt-8">

        {/* ── Avatar card ── */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 flex flex-col items-center">
          {/* Avatar circle */}
          <div className="relative mb-4">
            {avatarDataUrl ? (
              <img src={avatarDataUrl} alt="Avatar" className="w-24 h-24 rounded-full object-cover" />
            ) : (
              <div className={`w-24 h-24 rounded-full ${avatarBg} flex items-center justify-center`}>
                <span className="text-white text-3xl font-bold tracking-tight">{initials}</span>
              </div>
            )}
            {/* Camera button */}
            <button
              onClick={() => fileRef.current?.click()}
              className="absolute bottom-0 right-0 w-8 h-8 bg-white border border-gray-200 rounded-full shadow flex items-center justify-center text-gray-500 hover:text-green-600 hover:border-green-400 transition-colors"
              title="Change photo"
            >
              <CameraIcon />
            </button>
            <input ref={fileRef} type="file" accept="image/*" onChange={handleAvatarFile} className="hidden" />
          </div>
          {fileError && <p className="text-xs text-red-500 mb-2">{fileError}</p>}
          {avatarDataUrl && (
            <button onClick={() => setAvatarDataUrl(null)} className="text-xs text-gray-400 hover:text-red-500 transition-colors mb-2">
              Remove photo
            </button>
          )}
          <p className="text-xl font-bold text-gray-900">{user.firstName} {user.lastName}</p>
          <p className="text-sm text-gray-400 mt-0.5">{user.email}</p>
          <p className="text-xs text-green-600 font-medium mt-1">
            Member since {new Date(user.createdAt).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
          </p>
        </div>

        {/* ── Personal Information ── */}
        <SectionCard title="Personal Information">
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelClass}>First Name</label>
                <input type="text" value={firstName} onChange={(e) => setFirstName(e.target.value)}
                  placeholder="Jane" className={inputClass} />
                <FieldError message={errors.firstName} />
              </div>
              <div>
                <label className={labelClass}>Last Name</label>
                <input type="text" value={lastName} onChange={(e) => setLastName(e.target.value)}
                  placeholder="Smith" className={inputClass} />
                <FieldError message={errors.lastName} />
              </div>
            </div>
            <div>
              <label className={labelClass}>
                Email <span className="text-xs text-gray-400 font-normal">(cannot be changed)</span>
              </label>
              <input type="email" value={user.email} readOnly
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm text-gray-400 bg-gray-50 cursor-not-allowed" />
            </div>
          </div>
        </SectionCard>

        {/* ── Location ── */}
        <SectionCard title="Location">
          <div className="space-y-4">
            <div>
              <label className={labelClass}>ZIP / Postal Code</label>
              <div className="relative">
                <input type="text" value={zipCode}
                  onChange={(e) => setZipCode(e.target.value.toUpperCase().slice(0, 10))}
                  placeholder="e.g. 90210 or K1A 0A9"
                  className={`${inputClass} pr-9`} />
                {geoLoading && (
                  <div className="absolute right-3 top-1/2 -translate-y-1/2">
                    <div className="w-4 h-4 rounded-full border-2 border-green-500 border-t-transparent animate-spin" />
                  </div>
                )}
              </div>
              <FieldError message={errors.zipCode} />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelClass}>City</label>
                <input type="text" value={city} onChange={(e) => setCity(e.target.value)}
                  placeholder="Auto-filled from ZIP" className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>State / Province</label>
                <input type="text" value={state} onChange={(e) => setState(e.target.value)}
                  placeholder="Auto-filled from ZIP" className={inputClass} />
              </div>
            </div>

            <div>
              <label className={labelClass}>Country</label>
              <div className="relative">
                <select value={country} onChange={(e) => setCountry(e.target.value)}
                  className={`${inputClass} appearance-none pr-8 bg-white`}>
                  <option value="US">United States</option>
                  <option value="CA">Canada</option>
                </select>
                <ChevronIcon />
              </div>
            </div>
          </div>
        </SectionCard>

        {/* ── Growing Zone ── */}
        <div className={`rounded-2xl border p-6 mt-4 ${zoneInfo ? `${zoneInfo.color} border-opacity-50` : 'bg-green-50 border-green-100'}`}>
          <h2 className="text-base font-bold text-green-800 mb-3">🌱 Plant Hardiness Zone</h2>
          {zoneInfo ? (
            <div>
              <div className="flex items-end gap-3 mb-3">
                <span className={`text-4xl font-black ${zoneInfo.textColor}`}>Zone {zone}</span>
                <span className={`text-sm font-semibold px-2.5 py-1 rounded-full bg-white/60 ${zoneInfo.textColor} mb-1`}>
                  {zoneInfo.range}
                </span>
              </div>
              <p className="text-sm text-gray-700 mb-3">{zoneInfo.desc}</p>
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Best grasses for this zone</p>
                <div className="flex flex-wrap gap-2">
                  {zoneInfo.grasses.map((g) => (
                    <span key={g} className="text-xs font-medium px-2.5 py-1 bg-white/70 rounded-full text-gray-700 border border-white/80">
                      {g}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <p className="text-sm text-green-700">
              Enter your ZIP or postal code above to see your plant hardiness zone and grass recommendations.
            </p>
          )}
        </div>

        {/* ── Lawn Settings ── */}
        <SectionCard title="Lawn Settings">
          <div className="space-y-4">
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
            <div>
              <label className={labelClass}>Lawn Size</label>
              <div className="relative">
                <input type="number" value={lawnSize} min="1"
                  onChange={(e) => setLawnSize(e.target.value)}
                  placeholder="e.g. 2500"
                  className={`${inputClass} pr-14`} />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400 font-medium">sq ft</span>
              </div>
            </div>
          </div>
        </SectionCard>

        {/* ── Save ── */}
        <div className="mt-6 flex items-center gap-4">
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex-1 py-3 bg-green-600 hover:bg-green-700 disabled:bg-green-400 disabled:cursor-not-allowed text-white font-semibold rounded-xl transition-colors"
          >
            {saving ? 'Saving…' : 'Save Changes'}
          </button>
          {saveSuccess && (
            <span className="flex items-center gap-1.5 text-sm font-semibold text-green-600 whitespace-nowrap">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
                <polyline points="20 6 9 17 4 12" />
              </svg>
              Saved
            </span>
          )}
        </div>

      </div>
    </div>
  )
}
