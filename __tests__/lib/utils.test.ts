import { getStatus, formatDate, formatDateLong, daysUntil, addDays, isCanadianPostal } from '@/app/lib/utils'

const FIXED_TODAY = '2024-06-15'

beforeAll(() => {
  jest.useFakeTimers()
  jest.setSystemTime(new Date(FIXED_TODAY + 'T12:00:00'))
})

afterAll(() => {
  jest.useRealTimers()
})

// ── getStatus ──────────────────────────────────────────────────────────────────

describe('getStatus', () => {
  it('returns never for null', () => {
    expect(getStatus(null)).toBe('never')
  })

  it('returns overdue for a past date', () => {
    expect(getStatus('2024-06-14')).toBe('overdue')
  })

  it('returns overdue for a date well in the past', () => {
    expect(getStatus('2024-01-01')).toBe('overdue')
  })

  it('returns due_soon for today', () => {
    expect(getStatus('2024-06-15')).toBe('due_soon')
  })

  it('returns due_soon for tomorrow', () => {
    expect(getStatus('2024-06-16')).toBe('due_soon')
  })

  it('returns due_soon for 2 days out', () => {
    expect(getStatus('2024-06-17')).toBe('due_soon')
  })

  it('returns on_track for 3 days out', () => {
    expect(getStatus('2024-06-18')).toBe('on_track')
  })

  it('returns on_track for a date far in the future', () => {
    expect(getStatus('2025-01-01')).toBe('on_track')
  })
})

// ── formatDate ─────────────────────────────────────────────────────────────────

describe('formatDate', () => {
  it('returns em dash for null', () => {
    expect(formatDate(null)).toBe('—')
  })

  it('formats January 15', () => {
    expect(formatDate('2024-01-15')).toBe('Jan 15')
  })

  it('formats December 1', () => {
    expect(formatDate('2024-12-01')).toBe('Dec 1')
  })

  it('formats June 15', () => {
    expect(formatDate('2024-06-15')).toBe('Jun 15')
  })
})

// ── formatDateLong ─────────────────────────────────────────────────────────────

describe('formatDateLong', () => {
  it('includes weekday, month, day, and year', () => {
    const result = formatDateLong('2024-01-15')
    expect(result).toContain('2024')
    expect(result).toContain('January')
    expect(result).toContain('15')
    expect(result).toMatch(/Mon|Tue|Wed|Thu|Fri|Sat|Sun/)
  })
})

// ── daysUntil ──────────────────────────────────────────────────────────────────

describe('daysUntil', () => {
  it('returns null for null', () => {
    expect(daysUntil(null)).toBeNull()
  })

  it('returns 0 for today', () => {
    expect(daysUntil('2024-06-15')).toBe(0)
  })

  it('returns positive number for a future date', () => {
    expect(daysUntil('2024-06-20')).toBe(5)
  })

  it('returns negative number for a past date', () => {
    expect(daysUntil('2024-06-10')).toBe(-5)
  })
})

// ── addDays ────────────────────────────────────────────────────────────────────

describe('addDays', () => {
  it('adds days within the same month', () => {
    expect(addDays('2024-06-10', 5)).toBe('2024-06-15')
  })

  it('rolls over to the next month', () => {
    expect(addDays('2024-01-28', 5)).toBe('2024-02-02')
  })

  it('rolls over into the next year', () => {
    expect(addDays('2023-12-30', 5)).toBe('2024-01-04')
  })

  it('handles adding zero days', () => {
    expect(addDays('2024-06-15', 0)).toBe('2024-06-15')
  })

  it('handles standard lawn care intervals', () => {
    expect(addDays('2024-06-01', 3)).toBe('2024-06-04')   // watering
    expect(addDays('2024-06-01', 10)).toBe('2024-06-11')  // mowing
    expect(addDays('2024-06-01', 60)).toBe('2024-07-31')  // fertilizing
  })
})

// ── isCanadianPostal ───────────────────────────────────────────────────────────

describe('isCanadianPostal', () => {
  it('recognises standard Canadian postal codes with a space', () => {
    expect(isCanadianPostal('M5V 3A8')).toBe(true)
    expect(isCanadianPostal('K1A 0B1')).toBe(true)
  })

  it('recognises Canadian postal codes without a space', () => {
    expect(isCanadianPostal('V6B2B8')).toBe(true)
  })

  it('is case-insensitive', () => {
    expect(isCanadianPostal('m5v 3a8')).toBe(true)
  })

  it('rejects US 5-digit zip codes', () => {
    expect(isCanadianPostal('78701')).toBe(false)
    expect(isCanadianPostal('10001')).toBe(false)
  })

  it('rejects US ZIP+4 codes', () => {
    expect(isCanadianPostal('78701-1234')).toBe(false)
  })

  it('rejects empty strings', () => {
    expect(isCanadianPostal('')).toBe(false)
  })
})
