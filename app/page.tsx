'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from './context/AuthContext'
import WeatherWidget from './components/WeatherWidget'

type ActivityType  = 'watering' | 'mowing' | 'fertilizing'
type Status        = 'on_track' | 'due_soon' | 'overdue' | 'never'
type EquipmentType = 'mower' | 'blower' | 'trimmer' | 'edger' | 'chainsaw' | 'pressure_washer' | 'other'

interface ActivityLog {
  date: string
  duration?: number
}

interface Activity {
  logs: ActivityLog[]        // most-recent first
  nextRecommended: string | null
  intervalDays: number
}

interface LawnData {
  watering:    Activity
  mowing:      Activity
  fertilizing: Activity
}

interface MaintenanceItem {
  id: string
  name: string
  logDates: string[]         // most-recent first
  intervalMonths: number
}
interface Equipment {
  id: string
  type: EquipmentType
  year: string
  make: string
  model: string
  purchaseDate: string | null
  purchaseLocation: string
  receiptDataUrl: string | null
  maintenance: MaintenanceItem[]
}

interface HistoryEntry {
  date: string
  detail?: string
}

// ── Constants ─────────────────────────────────────────────────────────────────

const EQUIPMENT_LABELS: Record<EquipmentType, string> = {
  mower:           'Lawn Mower',
  blower:          'Leaf Blower',
  trimmer:         'String Trimmer',
  edger:           'Lawn Edger',
  chainsaw:        'Chainsaw',
  pressure_washer: 'Pressure Washer',
  other:           'Equipment',
}

const EQUIPMENT_OPTIONS: { value: EquipmentType; label: string }[] = [
  { value: 'mower',           label: 'Lawn Mower' },
  { value: 'blower',          label: 'Leaf Blower' },
  { value: 'trimmer',         label: 'String Trimmer' },
  { value: 'edger',           label: 'Lawn Edger' },
  { value: 'chainsaw',        label: 'Chainsaw' },
  { value: 'pressure_washer', label: 'Pressure Washer' },
  { value: 'other',           label: 'Other' },
]

const MAINTENANCE_DEFAULTS: Record<EquipmentType, { name: string; intervalMonths: number }[]> = {
  mower: [
    { name: 'Oil Change',           intervalMonths: 6  },
    { name: 'Blade Sharpen/Replace',intervalMonths: 6  },
    { name: 'Air Filter Replace',   intervalMonths: 6  },
    { name: 'Spark Plug Replace',   intervalMonths: 12 },
    { name: 'Fuel Filter Replace',  intervalMonths: 12 },
  ],
  blower: [
    { name: 'Air Filter Clean',     intervalMonths: 3  },
    { name: 'Spark Arrestor Clean', intervalMonths: 6  },
    { name: 'Spark Plug Replace',   intervalMonths: 12 },
    { name: 'Fuel Filter Replace',  intervalMonths: 12 },
  ],
  trimmer: [
    { name: 'Cutting Line Replace', intervalMonths: 3  },
    { name: 'Air Filter Replace',   intervalMonths: 6  },
    { name: 'Spark Arrestor Clean', intervalMonths: 6  },
    { name: 'Spark Plug Replace',   intervalMonths: 12 },
    { name: 'Fuel Filter Replace',  intervalMonths: 12 },
  ],
  edger: [
    { name: 'Blade Sharpen/Replace',intervalMonths: 6  },
    { name: 'Air Filter Replace',   intervalMonths: 6  },
    { name: 'Spark Plug Replace',   intervalMonths: 12 },
    { name: 'Fuel Filter Replace',  intervalMonths: 12 },
  ],
  chainsaw: [
    { name: 'Bar & Chain Oil',      intervalMonths: 1  },
    { name: 'Chain Sharpen',        intervalMonths: 3  },
    { name: 'Air Filter Clean',     intervalMonths: 3  },
    { name: 'Fuel Filter Replace',  intervalMonths: 6  },
    { name: 'Spark Plug Replace',   intervalMonths: 12 },
  ],
  pressure_washer: [
    { name: 'Nozzle Inspect/Clean', intervalMonths: 3  },
    { name: 'Oil Change',           intervalMonths: 6  },
    { name: 'Pump Protector/Flush', intervalMonths: 6  },
    { name: 'Spark Plug Replace',   intervalMonths: 12 },
    { name: 'Air Filter Replace',   intervalMonths: 12 },
  ],
  other: [],
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function todayStr(): string {
  return new Date().toISOString().split('T')[0]
}

function getStatus(nextDate: string | null): Status {
  if (!nextDate) return 'never'
  const now = new Date()
  now.setHours(0, 0, 0, 0)
  const next = new Date(nextDate + 'T00:00:00')
  const diff = Math.ceil((next.getTime() - now.getTime()) / 86400000)
  if (diff < 0) return 'overdue'
  if (diff <= 2) return 'due_soon'
  return 'on_track'
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return '—'
  const d = new Date(dateStr + 'T00:00:00')
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function formatDateLong(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00')
  return d.toLocaleDateString('en-US', { weekday: 'short', month: 'long', day: 'numeric', year: 'numeric' })
}

function daysUntil(dateStr: string | null): number | null {
  if (!dateStr) return null
  const now = new Date()
  now.setHours(0, 0, 0, 0)
  const next = new Date(dateStr + 'T00:00:00')
  return Math.ceil((next.getTime() - now.getTime()) / 86400000)
}

function addDays(dateStr: string, days: number): string {
  const d = new Date(dateStr + 'T00:00:00')
  d.setDate(d.getDate() + days)
  return d.toISOString().split('T')[0]
}

function getMaintenanceStatus(item: MaintenanceItem): Status {
  const lastDate = item.logDates[0] ?? null
  if (!lastDate) return 'never'
  const last = new Date(lastDate + 'T00:00:00')
  const next = new Date(last)
  next.setMonth(next.getMonth() + item.intervalMonths)
  return getStatus(next.toISOString().split('T')[0])
}

function getMaintenanceNextDate(item: MaintenanceItem): string | null {
  const lastDate = item.logDates[0] ?? null
  if (!lastDate) return null
  const last = new Date(lastDate + 'T00:00:00')
  const next = new Date(last)
  next.setMonth(next.getMonth() + item.intervalMonths)
  return next.toISOString().split('T')[0]
}

// ── Default data ──────────────────────────────────────────────────────────────

const DEFAULT_LAWN: LawnData = {
  watering:    { logs: [], nextRecommended: null, intervalDays: 3  },
  mowing:      { logs: [], nextRecommended: null, intervalDays: 10 },
  fertilizing: { logs: [], nextRecommended: null, intervalDays: 60 },
}

const DEFAULT_EQUIPMENT: Equipment[] = []

// ── Status badge ──────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: Status }) {
  const cfg = {
    on_track: { cls: 'bg-green-100 text-green-700', dot: 'bg-green-500',  label: 'On Track' },
    due_soon: { cls: 'bg-amber-100 text-amber-700', dot: 'bg-amber-500',  label: 'Due Soon' },
    overdue:  { cls: 'bg-red-100 text-red-700',     dot: 'bg-red-500',    label: 'Overdue'  },
    never:    { cls: 'bg-gray-100 text-gray-500',   dot: 'bg-gray-400',   label: 'No Data'  },
  }[status]
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold ${cfg.cls}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
      {cfg.label}
    </span>
  )
}

// ── Icons ─────────────────────────────────────────────────────────────────────

function WaterIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6">
      <path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0L12 2.69z" />
    </svg>
  )
}

function MowIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6">
      <circle cx="6" cy="6" r="3" />
      <circle cx="6" cy="18" r="3" />
      <line x1="20" y1="4" x2="8.12" y2="15.88" />
      <line x1="14.47" y1="14.48" x2="20" y2="20" />
      <line x1="8.12" y1="8.12" x2="12" y2="12" />
    </svg>
  )
}

function FertilizeIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6">
      <path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19 2c1 2 2 4.18 2 8 0 5.5-4.78 10-10 10z" />
      <path d="M2 21c0-3 1.85-5.36 5.08-6C9.5 14.52 12 13 13 12" />
    </svg>
  )
}

function EngineIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5 text-gray-500">
      <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </svg>
  )
}

function ReceiptIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="16" y1="13" x2="8" y2="13" />
      <line x1="16" y1="17" x2="8" y2="17" />
      <polyline points="10 9 9 9 8 9" />
    </svg>
  )
}

function UploadIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6 text-gray-300">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="17 8 12 3 7 8" />
      <line x1="12" y1="3" x2="12" y2="15" />
    </svg>
  )
}

function CloseIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" className="w-3.5 h-3.5 text-gray-500">
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  )
}

// ── CareCard ──────────────────────────────────────────────────────────────────

interface CareCardProps {
  title: string
  icon: React.ReactNode
  activity: Activity
  onLog: () => void
  onHistory: () => void
  accentColor: string
}

function CareCard({ title, icon, activity, onLog, onHistory, accentColor }: CareCardProps) {
  const lastLog = activity.logs[0] ?? null
  const status  = getStatus(activity.nextRecommended)
  const days    = daysUntil(activity.nextRecommended)

  const topBorder = {
    on_track: 'border-t-green-500',
    due_soon: 'border-t-amber-400',
    overdue:  'border-t-red-500',
    never:    'border-t-gray-300',
  }[status]

  let daysText = ''
  if (days !== null) {
    if (days < 0)        daysText = `${Math.abs(days)} day${Math.abs(days) !== 1 ? 's' : ''} overdue`
    else if (days === 0) daysText = 'Due today'
    else if (days === 1) daysText = 'Due tomorrow'
    else                 daysText = `Due in ${days} days`
  }

  const daysChipColor = {
    on_track: 'bg-green-50 text-green-700',
    due_soon: 'bg-amber-50 text-amber-700',
    overdue:  'bg-red-50 text-red-600',
    never:    'bg-gray-50 text-gray-500',
  }[status]

  return (
    <div className={`bg-white rounded-2xl shadow-sm border border-gray-100 border-t-4 ${topBorder} flex flex-col`}>
      <div className="p-5 flex flex-col flex-1">
        <div className="flex items-start justify-between mb-4">
          <div className={`w-11 h-11 rounded-xl flex items-center justify-center ${accentColor} text-white`}>
            {icon}
          </div>
          <StatusBadge status={status} />
        </div>
        <h3 className="text-base font-bold text-gray-900 mb-3">{title}</h3>
        <div className="space-y-2 mb-4 flex-1">
          <div className="flex justify-between text-sm">
            <span className="text-gray-400">Last logged</span>
            <span className="font-medium text-gray-700 text-right">
              {lastLog ? formatDate(lastLog.date) : '—'}
              {lastLog?.duration ? ` · ${lastLog.duration} min` : ''}
            </span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-400">Next up</span>
            <span className={`font-medium text-right ${
              status === 'overdue'  ? 'text-red-600'   :
              status === 'due_soon' ? 'text-amber-600' : 'text-gray-700'
            }`}>
              {activity.nextRecommended ? formatDate(activity.nextRecommended) : '—'}
            </span>
          </div>
          {daysText && (
            <div className={`text-xs font-semibold text-center py-1 rounded-full ${daysChipColor}`}>
              {daysText}
            </div>
          )}
        </div>
        <button onClick={onLog}
          className="w-full py-2.5 bg-green-600 hover:bg-green-700 active:bg-green-800 text-white text-sm font-semibold rounded-xl transition-colors mb-2">
          Log {title}
        </button>
        <button onClick={onHistory}
          className="w-full py-1.5 text-sm font-medium text-gray-400 hover:text-green-600 transition-colors">
          View history ({activity.logs.length})
        </button>
      </div>
    </div>
  )
}

// ── History Modal ─────────────────────────────────────────────────────────────

function HistoryModal({
  title, entries, dotColor, onClose,
}: {
  title: string
  entries: HistoryEntry[]
  dotColor: string
  onClose: () => void
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm flex flex-col max-h-[78vh]">
        <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-gray-100 flex-shrink-0">
          <h2 className="text-base font-bold text-gray-900">{title}</h2>
          <button onClick={onClose} className="w-7 h-7 flex items-center justify-center rounded-full bg-gray-100 hover:bg-gray-200 transition-colors">
            <CloseIcon />
          </button>
        </div>
        <div className="overflow-y-auto flex-1 px-5 py-4">
          {entries.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-8">No history recorded yet.</p>
          ) : (
            <ol className="relative border-l-2 border-gray-100 ml-2">
              {entries.map((entry, i) => (
                <li key={i} className="ml-5 pb-5 last:pb-0">
                  <span className={`absolute -left-[9px] w-4 h-4 rounded-full border-2 border-white ${dotColor} mt-0.5`} />
                  <p className="text-sm font-semibold text-gray-800">{formatDateLong(entry.date)}</p>
                  {entry.detail && <p className="text-xs text-gray-400 mt-0.5">{entry.detail}</p>}
                </li>
              ))}
            </ol>
          )}
        </div>
        <div className="px-5 pb-5 pt-3 border-t border-gray-100 flex-shrink-0">
          <button onClick={onClose}
            className="w-full py-2.5 border border-gray-200 rounded-xl text-sm font-semibold text-gray-600 hover:bg-gray-50 transition-colors">
            Close
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Add Equipment Modal ───────────────────────────────────────────────────────

function AddEquipmentModal({ onClose, onSave }: { onClose: () => void; onSave: (e: Equipment) => void }) {
  const [equipType, setEquipType]               = useState<EquipmentType>('mower')
  const [make, setMake]                         = useState('')
  const [model, setModel]                       = useState('')
  const [year, setYear]                         = useState(new Date().getFullYear().toString())
  const [purchaseDate, setPurchaseDate]         = useState('')
  const [purchaseLocation, setPurchaseLocation] = useState('')
  const [receiptDataUrl, setReceiptDataUrl]     = useState<string | null>(null)
  const [receiptName, setReceiptName]           = useState<string | null>(null)
  const [fileError, setFileError]               = useState('')
  const fileRef = useRef<HTMLInputElement>(null)

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setFileError('')
    if (file.size > 2 * 1024 * 1024) {
      setFileError('File must be under 2 MB. Try a compressed image or PDF.')
      e.target.value = ''
      return
    }
    setReceiptName(file.name)
    const reader = new FileReader()
    reader.onload = (ev) => setReceiptDataUrl(ev.target?.result as string)
    reader.readAsDataURL(file)
  }

  function removeReceipt() {
    setReceiptDataUrl(null)
    setReceiptName(null)
    setFileError('')
    if (fileRef.current) fileRef.current.value = ''
  }

  function handleSave() {
    const defaults = MAINTENANCE_DEFAULTS[equipType]
    const maintenance: MaintenanceItem[] = defaults.map((m, i) => ({
      id: `${Date.now()}-${i}`,
      name: m.name,
      logDates: [],
      intervalMonths: m.intervalMonths,
    }))
    onSave({
      id: Date.now().toString(),
      type: equipType,
      year: year.trim() || new Date().getFullYear().toString(),
      make: make.trim(),
      model: model.trim(),
      purchaseDate: purchaseDate || null,
      purchaseLocation: purchaseLocation.trim(),
      receiptDataUrl,
      maintenance,
    })
  }

  const canSave = make.trim().length > 0 && model.trim().length > 0
  const defaults = MAINTENANCE_DEFAULTS[equipType]

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm flex flex-col max-h-[92vh]">

        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-gray-100 flex-shrink-0">
          <h2 className="text-base font-bold text-gray-900">Add Equipment</h2>
          <button onClick={onClose} className="w-7 h-7 flex items-center justify-center rounded-full bg-gray-100 hover:bg-gray-200 transition-colors">
            <CloseIcon />
          </button>
        </div>

        {/* Scrollable form */}
        <div className="overflow-y-auto flex-1 px-5 py-5 space-y-4">

          {/* Equipment type */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Equipment Type</label>
            <div className="relative">
              <select
                value={equipType}
                onChange={(e) => setEquipType(e.target.value as EquipmentType)}
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm text-gray-800 bg-white focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent appearance-none pr-8"
              >
                {EQUIPMENT_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
              {/* chevron */}
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                className="w-4 h-4 text-gray-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
                <polyline points="6 9 12 15 18 9" />
              </svg>
            </div>
          </div>

          {/* Make + Model side by side */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Make <span className="text-red-400">*</span></label>
              <input type="text" value={make} placeholder="e.g. John Deere"
                onChange={(e) => setMake(e.target.value)}
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Model <span className="text-red-400">*</span></label>
              <input type="text" value={model} placeholder="e.g. X350"
                onChange={(e) => setModel(e.target.value)}
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent" />
            </div>
          </div>

          {/* Year */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Year</label>
            <input type="number" value={year} min="1990" max={new Date().getFullYear()}
              onChange={(e) => setYear(e.target.value)}
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent" />
          </div>

          {/* Divider */}
          <div className="border-t border-gray-100" />

          {/* Purchase Date */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Date of Purchase</label>
            <input type="date" value={purchaseDate} max={todayStr()}
              onChange={(e) => setPurchaseDate(e.target.value)}
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent" />
          </div>

          {/* Purchase Location */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Purchase Location</label>
            <input type="text" value={purchaseLocation} placeholder="e.g. Home Depot, Dealer Name"
              onChange={(e) => setPurchaseLocation(e.target.value)}
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent" />
          </div>

          {/* Receipt upload */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Receipt</label>
            <input ref={fileRef} type="file" accept="image/*,application/pdf" onChange={handleFileChange} className="hidden" />
            {receiptDataUrl ? (
              <div className="border border-gray-200 rounded-xl p-3 flex items-center gap-3">
                {receiptDataUrl.startsWith('data:image') ? (
                  <img src={receiptDataUrl} alt="Receipt preview" className="w-12 h-12 object-cover rounded-lg flex-shrink-0" />
                ) : (
                  <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center flex-shrink-0 text-gray-400">
                    <ReceiptIcon />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-700 truncate">{receiptName}</p>
                  <button onClick={removeReceipt} className="text-xs text-red-500 hover:text-red-600 font-medium">Remove</button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => fileRef.current?.click()}
                className="w-full border-2 border-dashed border-gray-200 rounded-xl py-5 flex flex-col items-center gap-1.5 hover:border-green-400 hover:bg-green-50 transition-colors"
              >
                <UploadIcon />
                <span className="text-xs font-semibold text-gray-400">Upload receipt</span>
                <span className="text-xs text-gray-300">PNG, JPG or PDF · max 2 MB</span>
              </button>
            )}
            {fileError && <p className="text-xs text-red-500 mt-1.5">{fileError}</p>}
          </div>

          {/* Maintenance preview */}
          {defaults.length > 0 && (
            <div className="bg-green-50 rounded-xl p-4">
              <p className="text-xs font-bold text-green-700 mb-2 uppercase tracking-wide">Maintenance tracking included</p>
              <ul className="space-y-1.5">
                {defaults.map((m) => (
                  <li key={m.name} className="flex items-center justify-between text-xs">
                    <span className="flex items-center gap-1.5 text-green-700">
                      <span className="w-1 h-1 rounded-full bg-green-400 flex-shrink-0" />
                      {m.name}
                    </span>
                    <span className="text-green-500 font-medium">
                      Every {m.intervalMonths} mo
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 pb-5 pt-4 border-t border-gray-100 flex-shrink-0 flex gap-3">
          <button onClick={onClose}
            className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm font-semibold text-gray-600 hover:bg-gray-50 transition-colors">
            Cancel
          </button>
          <button onClick={handleSave} disabled={!canSave}
            className="flex-1 py-2.5 bg-green-600 hover:bg-green-700 disabled:bg-gray-200 disabled:text-gray-400 disabled:cursor-not-allowed rounded-xl text-sm font-semibold text-white transition-colors">
            Add to Shed
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Equipment Card ────────────────────────────────────────────────────────────

function manualSearchUrl(make: string, model: string, year: string): string {
  const q = encodeURIComponent(`${year} ${make} ${model} owner's manual`)
  return `https://www.google.com/search?q=${q}`
}

function BookIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
      strokeLinecap="round" strokeLinejoin="round" className="w-3.5 h-3.5">
      <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
      <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
    </svg>
  )
}

function EquipmentCard({
  equipment,
  onLogMaintenance,
  onHistoryMaintenance,
}: {
  equipment: Equipment
  onLogMaintenance: (equipId: string, itemId: string) => void
  onHistoryMaintenance: (equipId: string, itemId: string) => void
}) {
  const [showReceipt, setShowReceipt] = useState(false)
  const typeLabel = EQUIPMENT_LABELS[equipment.type] ?? 'Equipment'

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
      {/* Equipment header */}
      <div className="flex items-start gap-3 mb-4">
        <div className="w-10 h-10 bg-gray-100 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5">
          <EngineIcon />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-bold text-gray-900 text-sm">{equipment.year} {equipment.make} {equipment.model}</h3>
          <p className="text-xs text-green-600 font-medium">{typeLabel}</p>
          {(equipment.purchaseDate || equipment.purchaseLocation) && (
            <p className="text-xs text-gray-400 mt-0.5">
              {equipment.purchaseDate ? `Purchased ${formatDate(equipment.purchaseDate)}` : ''}
              {equipment.purchaseLocation
                ? `${equipment.purchaseDate ? '  ·  ' : ''}${equipment.purchaseLocation}`
                : ''}
            </p>
          )}
          <a
            href={manualSearchUrl(equipment.make, equipment.model, equipment.year)}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 mt-1.5 text-xs font-semibold text-green-600 hover:text-green-700 transition-colors"
          >
            <BookIcon />
            Owner&apos;s Manual
          </a>
        </div>
        {/* Receipt thumbnail */}
        {equipment.receiptDataUrl && (
          <button
            onClick={() => setShowReceipt(true)}
            title="View receipt"
            className="flex-shrink-0 w-10 h-10 rounded-xl border border-gray-200 overflow-hidden hover:border-green-400 transition-colors"
          >
            {equipment.receiptDataUrl.startsWith('data:image') ? (
              <img src={equipment.receiptDataUrl} alt="Receipt" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full bg-gray-50 flex items-center justify-center text-gray-400">
                <ReceiptIcon />
              </div>
            )}
          </button>
        )}
      </div>

      {/* Maintenance items */}
      {equipment.maintenance.length > 0 && (
        <div>
          {equipment.maintenance.map((item) => {
            const status   = getMaintenanceStatus(item)
            const nextDate = getMaintenanceNextDate(item)
            const lastDate = item.logDates[0] ?? null
            return (
              <div key={item.id} className="flex items-center justify-between py-3 border-t border-gray-50 gap-2">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-gray-800">{item.name}</p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {lastDate ? `Last: ${formatDate(lastDate)}` : 'Never done'}
                    {nextDate ? `  ·  Next: ${formatDate(nextDate)}` : ''}
                  </p>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <StatusBadge status={status} />
                  <button onClick={() => onHistoryMaintenance(equipment.id, item.id)}
                    className="text-xs text-gray-400 hover:text-green-600 font-semibold transition-colors whitespace-nowrap">
                    History ({item.logDates.length})
                  </button>
                  <button onClick={() => onLogMaintenance(equipment.id, item.id)}
                    className="text-xs text-green-600 hover:text-green-700 font-bold transition-colors">
                    Log
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Receipt viewer overlay */}
      {showReceipt && equipment.receiptDataUrl && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center p-6 bg-black/70"
          onClick={() => setShowReceipt(false)}
        >
          <div className="relative max-w-lg w-full" onClick={(e) => e.stopPropagation()}>
            <button
              onClick={() => setShowReceipt(false)}
              className="absolute -top-3 -right-3 w-8 h-8 bg-white rounded-full shadow-lg flex items-center justify-center z-10 hover:bg-gray-100"
            >
              <CloseIcon />
            </button>
            {equipment.receiptDataUrl.startsWith('data:image') ? (
              <img src={equipment.receiptDataUrl} alt="Receipt" className="w-full rounded-2xl shadow-2xl max-h-[80vh] object-contain" />
            ) : (
              <div className="bg-white rounded-2xl p-6 text-center shadow-2xl">
                <ReceiptIcon />
                <p className="text-sm text-gray-600 mt-2 mb-4">PDF receipt</p>
                <a
                  href={equipment.receiptDataUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm font-semibold text-green-600 hover:text-green-700"
                >
                  Open in new tab →
                </a>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

// ── Log Activity Modal ────────────────────────────────────────────────────────

function LogModal({
  type, onClose, onSave, date, setDate, duration, setDuration,
}: {
  type: ActivityType | null
  onClose: () => void
  onSave: () => void
  date: string
  setDate: (d: string) => void
  duration: string
  setDuration: (d: string) => void
}) {
  if (!type) return null
  const labels: Record<ActivityType, string> = { watering: 'Watering', mowing: 'Mowing', fertilizing: 'Fertilizing' }
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6">
        <h2 className="text-lg font-bold text-gray-900 mb-5">Log {labels[type]}</h2>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Date</label>
            <input type="date" value={date} max={todayStr()} onChange={(e) => setDate(e.target.value)}
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent" />
          </div>
          {type === 'watering' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Duration (minutes)</label>
              <input type="number" value={duration} min="1" max="300" placeholder="45"
                onChange={(e) => setDuration(e.target.value)}
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent" />
            </div>
          )}
        </div>
        <div className="flex gap-3 mt-6">
          <button onClick={onClose} className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm font-semibold text-gray-600 hover:bg-gray-50 transition-colors">Cancel</button>
          <button onClick={onSave} className="flex-1 py-2.5 bg-green-600 hover:bg-green-700 rounded-xl text-sm font-semibold text-white transition-colors">Save</button>
        </div>
      </div>
    </div>
  )
}

// ── Maintenance Log Modal ─────────────────────────────────────────────────────

function MaintenanceLogModal({
  open, onClose, onSave, date, setDate, itemName,
}: {
  open: boolean; onClose: () => void; onSave: () => void
  date: string; setDate: (d: string) => void; itemName: string
}) {
  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6">
        <h2 className="text-lg font-bold text-gray-900 mb-1">Log Maintenance</h2>
        <p className="text-sm text-gray-500 mb-5">{itemName}</p>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Date Completed</label>
          <input type="date" value={date} max={todayStr()} onChange={(e) => setDate(e.target.value)}
            className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent" />
        </div>
        <div className="flex gap-3 mt-6">
          <button onClick={onClose} className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm font-semibold text-gray-600 hover:bg-gray-50 transition-colors">Cancel</button>
          <button onClick={onSave} className="flex-1 py-2.5 bg-green-600 hover:bg-green-700 rounded-xl text-sm font-semibold text-white transition-colors">Save</button>
        </div>
      </div>
    </div>
  )
}

// ── Main Dashboard ────────────────────────────────────────────────────────────

export default function Dashboard() {
  const { user, loading: authLoading } = useAuth()
  const router = useRouter()

  const [lawnData, setLawnData]     = useState<LawnData>(DEFAULT_LAWN)
  const [equipment, setEquipment]   = useState<Equipment[]>(DEFAULT_EQUIPMENT)
  const [hydrated, setHydrated]     = useState(false)
  const [showAddEquip, setShowAddEquip] = useState(false)

  const [activeModal, setActiveModal] = useState<ActivityType | null>(null)
  const [logDate, setLogDate]         = useState(todayStr())
  const [logDuration, setLogDuration] = useState('45')

  const [maintModal, setMaintModal] = useState<{ equipId: string; itemId: string } | null>(null)
  const [maintDate, setMaintDate]   = useState(todayStr())

  const [historyModal, setHistoryModal] = useState<{
    title: string; entries: HistoryEntry[]; dotColor: string
  } | null>(null)

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login')
    }
  }, [user, authLoading, router])

  const lawnKey  = user ? `lawncare-lawn-v2-${user.id}`  : null
  const equipKey = user ? `lawncare-equipment-v2-${user.id}` : null

  useEffect(() => {
    if (!lawnKey || !equipKey) return
    try {
      const savedLawn  = localStorage.getItem(lawnKey)
      const savedEquip = localStorage.getItem(equipKey)
      if (savedLawn)  setLawnData(JSON.parse(savedLawn))
      else            setLawnData(DEFAULT_LAWN)
      if (savedEquip) setEquipment(JSON.parse(savedEquip))
      else            setEquipment(DEFAULT_EQUIPMENT)
    } catch { /* ignore */ }
    setHydrated(true)
  }, [lawnKey, equipKey])

  useEffect(() => {
    if (hydrated && lawnKey)  localStorage.setItem(lawnKey,  JSON.stringify(lawnData))
  }, [lawnData, hydrated, lawnKey])

  useEffect(() => {
    if (hydrated && equipKey) localStorage.setItem(equipKey, JSON.stringify(equipment))
  }, [equipment, hydrated, equipKey])

  function openActivityModal(type: ActivityType) {
    setLogDate(todayStr())
    setLogDuration('45')
    setActiveModal(type)
  }

  function handleSaveActivity() {
    if (!activeModal) return
    const newLog: ActivityLog = { date: logDate }
    if (activeModal === 'watering') newLog.duration = parseInt(logDuration) || 45
    const nextDate = addDays(logDate, lawnData[activeModal].intervalDays)
    setLawnData((prev) => ({
      ...prev,
      [activeModal]: { ...prev[activeModal], logs: [newLog, ...prev[activeModal].logs], nextRecommended: nextDate },
    }))
    setActiveModal(null)
  }

  function openMaintModal(equipId: string, itemId: string) {
    setMaintDate(todayStr())
    setMaintModal({ equipId, itemId })
  }

  function handleSaveMaintenance() {
    if (!maintModal) return
    setEquipment((prev) =>
      prev.map((e) => e.id !== maintModal.equipId ? e : {
        ...e,
        maintenance: e.maintenance.map((m) =>
          m.id !== maintModal.itemId ? m : { ...m, logDates: [maintDate, ...m.logDates] }
        ),
      })
    )
    setMaintModal(null)
  }

  function handleAddEquipment(newEquip: Equipment) {
    setEquipment((prev) => [...prev, newEquip])
    setShowAddEquip(false)
  }

  function openActivityHistory(type: ActivityType) {
    const labels:  Record<ActivityType, string> = { watering: 'Watering History', mowing: 'Mowing History', fertilizing: 'Fertilizing History' }
    const colors:  Record<ActivityType, string> = { watering: 'bg-blue-500',      mowing: 'bg-green-600',   fertilizing: 'bg-emerald-600'       }
    setHistoryModal({
      title: labels[type],
      entries: lawnData[type].logs.map((log) => ({ date: log.date, detail: log.duration ? `Duration: ${log.duration} min` : undefined })),
      dotColor: colors[type],
    })
  }

  function openMaintenanceHistory(equipId: string, itemId: string) {
    const item = equipment.find((e) => e.id === equipId)?.maintenance.find((m) => m.id === itemId)
    if (!item) return
    setHistoryModal({ title: `${item.name} History`, entries: item.logDates.map((date) => ({ date })), dotColor: 'bg-gray-500' })
  }

  const maintItem = maintModal
    ? equipment.find((e) => e.id === maintModal.equipId)?.maintenance.find((m) => m.id === maintModal.itemId)
    : null

  if (authLoading || !user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="w-8 h-8 rounded-full border-4 border-green-600 border-t-transparent animate-spin" />
      </div>
    )
  }

  const scoreMap: Record<Status, number> = { on_track: 100, due_soon: 60, overdue: 20, never: 0 }
  const statuses: Status[] = [
    getStatus(lawnData.watering.nextRecommended),
    getStatus(lawnData.mowing.nextRecommended),
    getStatus(lawnData.fertilizing.nextRecommended),
  ]
  const score          = Math.round(statuses.reduce((s, st) => s + scoreMap[st], 0) / statuses.length)
  const scoreGrade     = score >= 80 ? 'Excellent' : score >= 50 ? 'Needs Attention' : 'Action Required'
  const scoreRingColor = score >= 80 ? '#4ade80'   : score >= 50 ? '#fbbf24'         : '#f87171'
  const scoreTextColor = score >= 80 ? 'text-green-300' : score >= 50 ? 'text-amber-300' : 'text-red-400'

  const hour     = new Date().getHours()
  const greeting = `${hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening'}, ${user.firstName}`

  return (
    <div className="min-h-screen bg-gray-50 pb-12">

      {/* Hero */}
      <div className="bg-gradient-to-br from-green-700 to-green-900 pt-8 pb-20 px-4">
        <div className="max-w-3xl mx-auto">
          <p className="text-green-300 text-sm font-medium">{greeting}</p>
          <h1 className="text-white text-2xl font-bold mt-0.5 mb-6">Your Lawn Dashboard</h1>
          <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-5 flex items-center justify-between">
            <div>
              <p className="text-green-200 text-sm">Lawn Health Score</p>
              <p className="text-white text-5xl font-black mt-1 leading-none">{score}</p>
              <p className={`text-sm font-semibold mt-1.5 ${scoreTextColor}`}>{scoreGrade}</p>
            </div>
            <div className="w-24 h-24 relative flex-shrink-0">
              <svg viewBox="0 0 36 36" className="w-full h-full -rotate-90">
                <circle cx="18" cy="18" r="15.9" fill="none" stroke="rgba(255,255,255,0.12)" strokeWidth="3" />
                <circle cx="18" cy="18" r="15.9" fill="none" stroke={scoreRingColor} strokeWidth="3"
                  strokeLinecap="round" strokeDasharray={`${score} ${100 - score}`} />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-white text-sm font-bold">{score}%</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Care cards */}
      <div className="max-w-3xl mx-auto px-4 -mt-12">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <CareCard title="Watering"    icon={<WaterIcon />}     activity={lawnData.watering}    accentColor="bg-blue-500"    onLog={() => openActivityModal('watering')}    onHistory={() => openActivityHistory('watering')} />
          <CareCard title="Mowing"      icon={<MowIcon />}       activity={lawnData.mowing}      accentColor="bg-green-600"   onLog={() => openActivityModal('mowing')}      onHistory={() => openActivityHistory('mowing')} />
          <CareCard title="Fertilizing" icon={<FertilizeIcon />} activity={lawnData.fertilizing} accentColor="bg-emerald-600" onLog={() => openActivityModal('fertilizing')} onHistory={() => openActivityHistory('fertilizing')} />
        </div>

        {/* Weather */}
        <div className="mt-6">
          <WeatherWidget zipCode={user.zipCode} />
        </div>

        {/* The Shed */}
        <div className="mt-10">
          <div className="flex items-end justify-between mb-4">
            <div>
              <h2 className="text-xl font-bold text-gray-900">The Shed</h2>
              <p className="text-sm text-gray-400 mt-0.5">Equipment &amp; maintenance schedule</p>
            </div>
            <button
              onClick={() => setShowAddEquip(true)}
              className="inline-flex items-center gap-1.5 text-sm font-semibold text-white bg-green-600 hover:bg-green-700 transition-colors px-3 py-1.5 rounded-lg"
            >
              <span className="text-base leading-none">+</span> Add Equipment
            </button>
          </div>
          {equipment.length === 0 ? (
            <div className="bg-white rounded-2xl border-2 border-dashed border-gray-200 p-10 text-center">
              <p className="text-gray-400 text-sm">No equipment yet.</p>
              <button onClick={() => setShowAddEquip(true)} className="mt-2 text-sm font-semibold text-green-600 hover:text-green-700">
                Add your first piece of equipment →
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {equipment.map((e) => (
                <EquipmentCard key={e.id} equipment={e} onLogMaintenance={openMaintModal} onHistoryMaintenance={openMaintenanceHistory} />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Modals */}
      {showAddEquip && <AddEquipmentModal onClose={() => setShowAddEquip(false)} onSave={handleAddEquipment} />}

      <LogModal type={activeModal} onClose={() => setActiveModal(null)} onSave={handleSaveActivity}
        date={logDate} setDate={setLogDate} duration={logDuration} setDuration={setLogDuration} />

      <MaintenanceLogModal open={!!maintModal} onClose={() => setMaintModal(null)} onSave={handleSaveMaintenance}
        date={maintDate} setDate={setMaintDate} itemName={maintItem?.name ?? ''} />

      {historyModal && (
        <HistoryModal title={historyModal.title} entries={historyModal.entries} dotColor={historyModal.dotColor} onClose={() => setHistoryModal(null)} />
      )}
    </div>
  )
}
