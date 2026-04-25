import { useState, useEffect } from 'react'

// ── Types ─────────────────────────────────────────────────────────────────────

export interface DayForecast {
  date: string              // YYYY-MM-DD
  weatherCode: number
  tempHigh: number
  tempLow: number
  precipInches: number
  precipProbability: number // 0-100
}

export interface WeatherData {
  locationName: string      // "Austin, TX"
  currentTempF: number
  currentWeatherCode: number
  forecast: DayForecast[]  // 7 days, today first
}

export interface UseWeatherResult {
  data: WeatherData | null
  loading: boolean
  error: string | null
  rainExpectedSoon: boolean       // true if precipProbability > 50% in next 2 days
  recommendSkipWatering: boolean  // same as rainExpectedSoon
}

// ── Module-level cache keyed by zip code ──────────────────────────────────────

const cache = new Map<string, WeatherData>()

// ── Geocoding helpers ─────────────────────────────────────────────────────────

interface GeoResult {
  latitude: number
  longitude: number
  name: string
  admin1?: string
}

interface GeoResponse {
  results?: GeoResult[]
}

function isCanadianPostal(code: string): boolean {
  return /^[A-Za-z]\d[A-Za-z]/i.test(code.trim())
}

interface GeoPoint { lat: number; lng: number; locationName: string }

async function geocodeUS(zip: string): Promise<GeoPoint | null> {
  const url =
    `https://geocoding-api.open-meteo.com/v1/search` +
    `?name=${encodeURIComponent(zip)}&count=1&language=en&format=json`
  const res = await fetch(url)
  if (!res.ok) return null
  const json: GeoResponse = await res.json()
  if (!json.results?.length) return null
  const { latitude, longitude, name, admin1 } = json.results[0]
  return { lat: latitude, lng: longitude, locationName: admin1 ? `${name}, ${admin1}` : name }
}

async function geocodeCA(postal: string): Promise<GeoPoint | null> {
  const code = postal.replace(/\s+/g, '').toUpperCase()
  const url =
    `https://nominatim.openstreetmap.org/search` +
    `?postalcode=${encodeURIComponent(code)}&countrycodes=ca&format=json&addressdetails=1&limit=1`
  const res = await fetch(url, { headers: { 'Accept-Language': 'en' } })
  if (!res.ok) return null
  const json = await res.json()
  if (!json.length) return null
  const { lat, lon, address } = json[0]
  const city = address?.city || address?.town || address?.village || address?.county || ''
  const province = address?.state || ''
  return {
    lat: parseFloat(lat),
    lng: parseFloat(lon),
    locationName: city && province ? `${city}, ${province}` : city || province || postal,
  }
}

// ── Weather API response shape ────────────────────────────────────────────────

interface WeatherResponse {
  current_weather: {
    temperature: number
    weathercode: number
  }
  daily: {
    time: string[]
    temperature_2m_max: number[]
    temperature_2m_min: number[]
    precipitation_sum: number[]
    precipitation_probability_max: number[]
    weathercode: number[]
  }
}

// ── Hook ──────────────────────────────────────────────────────────────────────

export function useWeather(zipCode: string | null | undefined): UseWeatherResult {
  const [data, setData]       = useState<WeatherData | null>(null)
  const [loading, setLoading] = useState<boolean>(false)
  const [error, setError]     = useState<string | null>(null)

  useEffect(() => {
    // No zip code — return immediately with no data
    if (!zipCode) {
      setData(null)
      setLoading(false)
      setError(null)
      return
    }

    // Cache hit — serve immediately, no fetch needed
    if (cache.has(zipCode)) {
      setData(cache.get(zipCode)!)
      setLoading(false)
      setError(null)
      return
    }

    let cancelled = false

    async function fetchWeather() {
      setLoading(true)
      setError(null)
      setData(null)

      try {
        // Step 1: Geocoding — postal/zip → lat/lng + city name
        const geo = isCanadianPostal(zipCode!)
          ? await geocodeCA(zipCode!)
          : await geocodeUS(zipCode!)

        if (!geo) {
          if (!cancelled) {
            setError('Location not found')
            setLoading(false)
          }
          return
        }

        const { lat: latitude, lng: longitude, locationName } = geo

        // Step 2: Weather forecast — lat/lng → 7-day forecast + current conditions
        const weatherUrl =
          `https://api.open-meteo.com/v1/forecast` +
          `?latitude=${latitude}&longitude=${longitude}` +
          `&daily=temperature_2m_max,temperature_2m_min,precipitation_sum,precipitation_probability_max,weathercode` +
          `&current_weather=true` +
          `&temperature_unit=fahrenheit` +
          `&precipitation_unit=inch` +
          `&timezone=auto` +
          `&forecast_days=7`

        const weatherRes = await fetch(weatherUrl)
        if (!weatherRes.ok) throw new Error(`Weather request failed (${weatherRes.status})`)

        const weatherJson: WeatherResponse = await weatherRes.json()

        const { current_weather, daily } = weatherJson

        const forecast: DayForecast[] = daily.time.map((date, i) => ({
          date,
          weatherCode:       daily.weathercode[i],
          tempHigh:          Math.round(daily.temperature_2m_max[i]),
          tempLow:           Math.round(daily.temperature_2m_min[i]),
          precipInches:      daily.precipitation_sum[i] ?? 0,
          precipProbability: daily.precipitation_probability_max[i] ?? 0,
        }))

        const result: WeatherData = {
          locationName,
          currentTempF:      Math.round(current_weather.temperature),
          currentWeatherCode: current_weather.weathercode,
          forecast,
        }

        // Store in cache for this session
        cache.set(zipCode!, result)

        if (!cancelled) {
          setData(result)
          setLoading(false)
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to load weather data')
          setLoading(false)
        }
      }
    }

    fetchWeather()

    return () => {
      cancelled = true
    }
  }, [zipCode])

  // Derive rain flags from next 2 days of forecast
  const next2Days     = data?.forecast.slice(0, 2) ?? []
  const rainExpected  = next2Days.some((day) => day.precipProbability > 50)

  return {
    data,
    loading,
    error,
    rainExpectedSoon:      rainExpected,
    recommendSkipWatering: rainExpected,
  }
}
