export type Status = 'on_track' | 'due_soon' | 'overdue' | 'never'

export function getStatus(nextDate: string | null): Status {
  if (!nextDate) return 'never'
  const now = new Date()
  now.setHours(0, 0, 0, 0)
  const next = new Date(nextDate + 'T00:00:00')
  const diff = Math.ceil((next.getTime() - now.getTime()) / 86400000)
  if (diff < 0) return 'overdue'
  if (diff <= 2) return 'due_soon'
  return 'on_track'
}

export function formatDate(dateStr: string | null): string {
  if (!dateStr) return '—'
  const d = new Date(dateStr + 'T00:00:00')
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

export function formatDateLong(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00')
  return d.toLocaleDateString('en-US', { weekday: 'short', month: 'long', day: 'numeric', year: 'numeric' })
}

export function daysUntil(dateStr: string | null): number | null {
  if (!dateStr) return null
  const now = new Date()
  now.setHours(0, 0, 0, 0)
  const next = new Date(dateStr + 'T00:00:00')
  return Math.ceil((next.getTime() - now.getTime()) / 86400000)
}

export function addDays(dateStr: string, days: number): string {
  const d = new Date(dateStr + 'T00:00:00')
  d.setDate(d.getDate() + days)
  return d.toISOString().split('T')[0]
}

export function isCanadianPostal(code: string): boolean {
  return /^[A-Za-z]\d[A-Za-z]/i.test(code.trim())
}
