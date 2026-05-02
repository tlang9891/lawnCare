'use client'

import { MOWER_MAKES, OTHER } from '@/app/lib/mowerData'

interface Props {
  make: string
  model: string
  onMakeChange: (make: string) => void
  onModelChange: (model: string) => void
  makeError?: string
  modelError?: string
  showRequiredMark?: boolean
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

export default function MowerMakeModelPicker({
  make, model, onMakeChange, onModelChange, makeError, modelError, showRequiredMark = true,
}: Props) {
  const knownMake    = MOWER_MAKES.find((m) => m.make === make) ?? null
  const isCustomMake = make !== '' && !knownMake

  const knownModels   = knownMake ? knownMake.models : []
  const isCustomModel = !isCustomMake && model !== '' && !knownModels.includes(model)

  const selectClass = 'w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm text-gray-800 bg-white focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent appearance-none pr-8'
  const inputClass  = 'w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent'
  const labelClass  = 'block text-sm font-medium text-gray-700 mb-1.5'
  const req         = showRequiredMark ? <span className="text-red-400"> *</span> : null

  function handleMakeSelect(val: string) {
    onMakeChange(val)
  }

  return (
    <div className="grid grid-cols-2 gap-3">
      {/* Make */}
      <div>
        <label className={labelClass}>Make{req}</label>
        <div className="relative">
          <select
            value={isCustomMake ? OTHER : make}
            onChange={(e) => handleMakeSelect(e.target.value)}
            className={selectClass}
          >
            <option value="">Select make…</option>
            {MOWER_MAKES.map((m) => (
              <option key={m.make} value={m.make}>{m.make}</option>
            ))}
            <option value={OTHER}>{OTHER}</option>
          </select>
          <ChevronIcon />
        </div>
        {isCustomMake && (
          <input
            type="text"
            value={make === OTHER ? '' : make}
            onChange={(e) => onMakeChange(e.target.value || OTHER)}
            placeholder="Type make…"
            className={`${inputClass} mt-2`}
          />
        )}
        {makeError && <p className="mt-1.5 text-xs text-red-500">{makeError}</p>}
      </div>

      {/* Model */}
      <div>
        <label className={labelClass}>Model{req}</label>
        {isCustomMake ? (
          <input
            type="text"
            value={model}
            onChange={(e) => onModelChange(e.target.value)}
            placeholder="Type model…"
            className={inputClass}
          />
        ) : (
          <>
            <div className="relative">
              <select
                value={isCustomModel ? OTHER : model}
                onChange={(e) => onModelChange(e.target.value)}
                disabled={!make}
                className={`${selectClass} disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                <option value="">{make ? 'Select model…' : '—'}</option>
                {knownModels.map((m) => (
                  <option key={m} value={m}>{m}</option>
                ))}
                {make && <option value={OTHER}>{OTHER}</option>}
              </select>
              <ChevronIcon />
            </div>
            {isCustomModel && (
              <input
                type="text"
                value={model === OTHER ? '' : model}
                onChange={(e) => onModelChange(e.target.value || OTHER)}
                placeholder="Type model…"
                className={`${inputClass} mt-2`}
              />
            )}
          </>
        )}
        {modelError && <p className="mt-1.5 text-xs text-red-500">{modelError}</p>}
      </div>
    </div>
  )
}
