'use client'

import { useWeather } from '../hooks/useWeather'

/*
 * INTEGRATION — add to app/page.tsx:
 *
 * import WeatherWidget from './components/WeatherWidget'
 *
 * Place <WeatherWidget zipCode={user?.zipCode ?? '10001'} />
 * inside the dashboard below the care cards section, before The Shed section.
 */

// ── WMO weather code helpers ──────────────────────────────────────────────────

function getWeatherInfo(code: number): { description: string; emoji: string } {
  if (code === 0)                              return { description: 'Clear Sky',   emoji: '☀️'  }
  if (code >= 1  && code <= 3)                return { description: 'Partly Cloudy', emoji: '⛅'      }
  if (code === 45 || code === 48)             return { description: 'Foggy',        emoji: '🌫️' }
  if (code >= 51 && code <= 55)              return { description: 'Drizzle',      emoji: '🌦️' }
  if (code >= 61 && code <= 65)              return { description: 'Rain',         emoji: '🌧️' }
  if (code >= 71 && code <= 75)              return { description: 'Snow',         emoji: '❄️'  }
  if (code >= 80 && code <= 82)              return { description: 'Showers',      emoji: '🌦️' }
  if (code === 95)                            return { description: 'Thunderstorm', emoji: '⛈️'  }
  return                                             { description: 'Cloudy',       emoji: '☁️'  }
}

function getDayLabel(dateStr: string, index: number): string {
  if (index === 0) return 'Today'
  if (index === 1) return 'Tomorrow'
  const d = new Date(dateStr + 'T00:00:00')
  return d.toLocaleDateString('en-US', { weekday: 'short' })
}

// ── Sub-components ────────────────────────────────────────────────────────────

function SkeletonPulse({ className }: { className: string }) {
  return <div className={`bg-gray-200 rounded animate-pulse ${className}`} />
}

function LoadingState() {
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
      <div className="flex items-center justify-between mb-4">
        <SkeletonPulse className="h-5 w-20" />
        <SkeletonPulse className="h-4 w-28" />
      </div>
      <div className="flex items-end gap-4 mb-5">
        <SkeletonPulse className="h-14 w-14 rounded-xl" />
        <div className="flex-1 space-y-2">
          <SkeletonPulse className="h-10 w-28" />
          <SkeletonPulse className="h-4 w-36" />
        </div>
        <SkeletonPulse className="h-6 w-24" />
      </div>
      <div className="grid grid-cols-3 gap-3">
        {[0, 1, 2].map((i) => (
          <div key={i} className="flex flex-col items-center gap-1.5">
            <SkeletonPulse className="h-4 w-12" />
            <SkeletonPulse className="h-8 w-8 rounded-full" />
            <SkeletonPulse className="h-3.5 w-16" />
            <SkeletonPulse className="h-3.5 w-10" />
          </div>
        ))}
      </div>
    </div>
  )
}

function ErrorState() {
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
      <p className="text-sm font-medium text-gray-400 text-center py-2">Weather unavailable</p>
    </div>
  )
}

// ── Main WeatherWidget ────────────────────────────────────────────────────────

interface WeatherWidgetProps {
  zipCode: string | null | undefined
}

export default function WeatherWidget({ zipCode }: WeatherWidgetProps) {
  const effectiveZip = zipCode || '10001'
  const { data, loading, error, rainExpectedSoon } = useWeather(effectiveZip)

  if (loading) return <LoadingState />
  if (error || !data) return <ErrorState />

  const currentInfo = getWeatherInfo(data.currentWeatherCode)
  const threeDays   = data.forecast.slice(0, 3)

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">

      {/* Header row */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-bold text-gray-900">Weather</h2>
        <span className="text-xs text-gray-400 font-medium">{data.locationName}</span>
      </div>

      {/* Current conditions */}
      <div className="flex items-end gap-4 mb-5">
        {/* Weather emoji */}
        <div className="w-14 h-14 flex items-center justify-center bg-sky-50 rounded-xl text-3xl flex-shrink-0" aria-hidden>
          {currentInfo.emoji}
        </div>

        {/* Temp + description */}
        <div className="flex-1 min-w-0">
          <p className="text-4xl font-black text-gray-900 leading-none">
            {data.currentTempF}&deg;F
          </p>
          <p className="text-sm text-gray-400 mt-1">{currentInfo.description}</p>
        </div>

        {/* Location (larger display) */}
        <div className="text-right flex-shrink-0">
          <p className="text-sm font-semibold text-gray-700 leading-snug">{data.locationName}</p>
        </div>
      </div>

      {/* 3-day mini forecast */}
      <div className="grid grid-cols-3 gap-3 mb-4">
        {threeDays.map((day, i) => {
          const info = getWeatherInfo(day.weatherCode)
          return (
            <div
              key={day.date}
              className="flex flex-col items-center bg-gray-50 rounded-xl py-3 px-1 gap-1"
            >
              <p className="text-xs font-semibold text-gray-500">{getDayLabel(day.date, i)}</p>
              <span className="text-2xl leading-none" aria-hidden>{info.emoji}</span>
              <p className="text-xs font-bold text-gray-800">
                {day.tempHigh}&deg; / {day.tempLow}&deg;
              </p>
              {day.precipProbability > 0 ? (
                <p className="text-xs text-sky-600 font-medium">{day.precipProbability}% rain</p>
              ) : (
                <p className="text-xs text-gray-300 font-medium">0% rain</p>
              )}
            </div>
          )
        })}
      </div>

      {/* Rain warning banner */}
      {rainExpectedSoon && (
        <div className="flex items-center gap-2.5 bg-amber-50 border border-amber-100 rounded-xl px-4 py-3">
          <span className="text-xl flex-shrink-0" aria-hidden>&#x1F327;&#xFE0F;</span>
          <p className="text-sm font-medium text-amber-700 leading-snug">
            Rain in the forecast &mdash; consider skipping your next watering
          </p>
        </div>
      )}
    </div>
  )
}
