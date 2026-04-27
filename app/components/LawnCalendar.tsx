'use client'

import { useState, useMemo } from 'react'

type ActivityType = 'watering' | 'mowing' | 'fertilizing'

interface ActivityLog {
  date: string
  duration?: number
}

interface Activity {
  logs: ActivityLog[]
  nextRecommended: string | null
  intervalDays: number
}

interface LawnData {
  watering: Activity
  mowing: Activity
  fertilizing: Activity
}

interface ScheduledTask {
  id: string
  type: ActivityType
  date: string
  note?: string
}

interface CalendarEvent {
  date: string
  type: ActivityType
  kind: 'logged' | 'upcoming' | 'scheduled'
  detail?: string
}

interface LawnCalendarProps {
  lawnData: LawnData
  scheduledTasks: ScheduledTask[]
  onAddScheduled: (task: Omit<ScheduledTask, 'id'>) => void
  onRemoveScheduled: (id: string) => void
}

const ACTIVITY_CONFIG: Record<ActivityType, { label: string; bg: string; text: string; dot: string; loggedBg: string; upcomingBg: string }> = {
  watering:    { label: 'Watering',    bg: 'bg-blue-500',    text: 'text-blue-700',    dot: 'bg-blue-400',    loggedBg: 'bg-blue-100 text-blue-700',    upcomingBg: 'bg-blue-50 text-blue-500'    },
  mowing:      { label: 'Mowing',      bg: 'bg-green-600',   text: 'text-green-700',   dot: 'bg-green-500',   loggedBg: 'bg-green-100 text-green-700',   upcomingBg: 'bg-green-50 text-green-600'  },
  fertilizing: { label: 'Fertilizing', bg: 'bg-emerald-600', text: 'text-emerald-700', dot: 'bg-emerald-500', loggedBg: 'bg-emerald-100 text-emerald-700', upcomingBg: 'bg-emerald-50 text-emerald-600' },
}

const ACTIVITY_TYPES: ActivityType[] = ['watering', 'mowing', 'fertilizing']

const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

function toDateStr(year: number, month: number, day: number): string {
  return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}

function todayStr(): string {
  return new Date().toISOString().split('T')[0]
}

function formatMonthYear(year: number, month: number): string {
  return new Date(year, month, 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
}

function ChevronLeft() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
      <polyline points="15 18 9 12 15 6" />
    </svg>
  )
}

function ChevronRight() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
      <polyline points="9 18 15 12 9 6" />
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

function PlusIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" className="w-3.5 h-3.5">
      <line x1="12" y1="5" x2="12" y2="19" />
      <line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  )
}

function TrashIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-3.5 h-3.5">
      <polyline points="3 6 5 6 21 6" />
      <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
      <path d="M10 11v6" />
      <path d="M14 11v6" />
      <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
    </svg>
  )
}

function ScheduleModal({
  date,
  onClose,
  onSave,
}: {
  date: string
  onClose: () => void
  onSave: (type: ActivityType, date: string, note: string) => void
}) {
  const [selectedType, setSelectedType] = useState<ActivityType>('watering')
  const [selectedDate, setSelectedDate] = useState(date)
  const [note, setNote] = useState('')

  const displayDate = new Date(date + 'T00:00:00').toLocaleDateString('en-US', {
    weekday: 'long', month: 'long', day: 'numeric',
  })

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h2 className="text-base font-bold text-gray-900">Schedule Task</h2>
            <p className="text-xs text-gray-400 mt-0.5">{displayDate}</p>
          </div>
          <button onClick={onClose} className="w-7 h-7 flex items-center justify-center rounded-full bg-gray-100 hover:bg-gray-200 transition-colors">
            <CloseIcon />
          </button>
        </div>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Task Type</label>
            <div className="grid grid-cols-3 gap-2">
              {ACTIVITY_TYPES.map((type) => {
                const cfg = ACTIVITY_CONFIG[type]
                const active = selectedType === type
                return (
                  <button
                    key={type}
                    onClick={() => setSelectedType(type)}
                    className={`py-2 px-2 rounded-xl text-xs font-semibold border-2 transition-colors ${
                      active
                        ? `border-current ${cfg.text} bg-gray-50`
                        : 'border-gray-200 text-gray-400 hover:border-gray-300'
                    }`}
                  >
                    {cfg.label}
                  </button>
                )
              })}
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Date</label>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Note <span className="text-gray-400 font-normal">(optional)</span></label>
            <input
              type="text"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="e.g. Use slow-release fertilizer"
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
            />
          </div>
        </div>
        <div className="flex gap-3 mt-6">
          <button onClick={onClose} className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm font-semibold text-gray-600 hover:bg-gray-50 transition-colors">
            Cancel
          </button>
          <button
            onClick={() => onSave(selectedType, selectedDate, note)}
            className="flex-1 py-2.5 bg-green-600 hover:bg-green-700 rounded-xl text-sm font-semibold text-white transition-colors"
          >
            Schedule
          </button>
        </div>
      </div>
    </div>
  )
}

function DayDetailModal({
  date,
  events,
  scheduledOnDay,
  onClose,
  onSchedule,
  onRemoveScheduled,
}: {
  date: string
  events: CalendarEvent[]
  scheduledOnDay: ScheduledTask[]
  onClose: () => void
  onSchedule: () => void
  onRemoveScheduled: (id: string) => void
}) {
  const displayDate = new Date(date + 'T00:00:00').toLocaleDateString('en-US', {
    weekday: 'long', month: 'long', day: 'numeric', year: 'numeric',
  })

  const logged = events.filter((e) => e.kind === 'logged')
  const upcoming = events.filter((e) => e.kind === 'upcoming')

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm flex flex-col max-h-[80vh]">
        <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-gray-100 flex-shrink-0">
          <div>
            <h2 className="text-base font-bold text-gray-900">{displayDate}</h2>
            <p className="text-xs text-gray-400 mt-0.5">
              {events.length + scheduledOnDay.length === 0 ? 'No activity' : `${events.length + scheduledOnDay.length} item${events.length + scheduledOnDay.length !== 1 ? 's' : ''}`}
            </p>
          </div>
          <button onClick={onClose} className="w-7 h-7 flex items-center justify-center rounded-full bg-gray-100 hover:bg-gray-200 transition-colors">
            <CloseIcon />
          </button>
        </div>
        <div className="overflow-y-auto flex-1 px-5 py-4 space-y-4">
          {logged.length > 0 && (
            <div>
              <p className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-2">Logged</p>
              <div className="space-y-2">
                {logged.map((e, i) => {
                  const cfg = ACTIVITY_CONFIG[e.type]
                  return (
                    <div key={i} className={`flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-semibold ${cfg.loggedBg}`}>
                      <span className={`w-2 h-2 rounded-full flex-shrink-0 ${cfg.dot}`} />
                      {cfg.label}
                      {e.detail && <span className="font-normal text-xs ml-auto opacity-70">{e.detail}</span>}
                    </div>
                  )
                })}
              </div>
            </div>
          )}
          {upcoming.length > 0 && (
            <div>
              <p className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-2">Upcoming</p>
              <div className="space-y-2">
                {upcoming.map((e, i) => {
                  const cfg = ACTIVITY_CONFIG[e.type]
                  return (
                    <div key={i} className={`flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-semibold border border-dashed ${cfg.upcomingBg} border-current`}>
                      <span className={`w-2 h-2 rounded-full flex-shrink-0 ${cfg.dot} opacity-50`} />
                      {cfg.label} (recommended)
                    </div>
                  )
                })}
              </div>
            </div>
          )}
          {scheduledOnDay.length > 0 && (
            <div>
              <p className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-2">Scheduled</p>
              <div className="space-y-2">
                {scheduledOnDay.map((task) => {
                  const cfg = ACTIVITY_CONFIG[task.type]
                  return (
                    <div key={task.id} className="flex items-center gap-2 px-3 py-2 rounded-xl bg-gray-50 border border-gray-200">
                      <span className={`w-2 h-2 rounded-full flex-shrink-0 ${cfg.dot}`} />
                      <span className={`text-sm font-semibold flex-1 ${cfg.text}`}>{cfg.label}</span>
                      {task.note && <span className="text-xs text-gray-400 truncate max-w-[100px]">{task.note}</span>}
                      <button
                        onClick={() => onRemoveScheduled(task.id)}
                        className="flex-shrink-0 w-6 h-6 flex items-center justify-center rounded-lg text-gray-300 hover:text-red-500 hover:bg-red-50 transition-colors"
                        title="Remove scheduled task"
                      >
                        <TrashIcon />
                      </button>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
          {events.length === 0 && scheduledOnDay.length === 0 && (
            <p className="text-sm text-gray-400 text-center py-6">Nothing logged or scheduled for this day.</p>
          )}
        </div>
        <div className="px-5 pb-5 pt-3 border-t border-gray-100 flex-shrink-0 flex gap-3">
          <button onClick={onClose} className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm font-semibold text-gray-600 hover:bg-gray-50 transition-colors">
            Close
          </button>
          <button
            onClick={onSchedule}
            className="flex-1 py-2.5 bg-green-600 hover:bg-green-700 rounded-xl text-sm font-semibold text-white transition-colors flex items-center justify-center gap-1.5"
          >
            <PlusIcon />
            Schedule Task
          </button>
        </div>
      </div>
    </div>
  )
}

export default function LawnCalendar({ lawnData, scheduledTasks, onAddScheduled, onRemoveScheduled }: LawnCalendarProps) {
  const today = new Date()
  const [viewYear, setViewYear]   = useState(today.getFullYear())
  const [viewMonth, setViewMonth] = useState(today.getMonth())
  const [selectedDay, setSelectedDay] = useState<string | null>(null)
  const [showScheduleModal, setShowScheduleModal] = useState(false)
  const [scheduleForDate, setScheduleForDate]     = useState<string>(todayStr())

  const todayDateStr = todayStr()

  const eventsByDate = useMemo(() => {
    const map: Record<string, CalendarEvent[]> = {}

    function addEvent(event: CalendarEvent) {
      if (!map[event.date]) map[event.date] = []
      map[event.date].push(event)
    }

    ACTIVITY_TYPES.forEach((type) => {
      const activity = lawnData[type]
      activity.logs.forEach((log) => {
        addEvent({
          date: log.date,
          type,
          kind: 'logged',
          detail: log.duration ? `${log.duration} min` : undefined,
        })
      })
      if (activity.nextRecommended) {
        addEvent({ date: activity.nextRecommended, type, kind: 'upcoming' })
      }
    })

    return map
  }, [lawnData])

  const scheduledByDate = useMemo(() => {
    const map: Record<string, ScheduledTask[]> = {}
    scheduledTasks.forEach((task) => {
      if (!map[task.date]) map[task.date] = []
      map[task.date].push(task)
    })
    return map
  }, [scheduledTasks])

  function prevMonth() {
    if (viewMonth === 0) { setViewMonth(11); setViewYear((y) => y - 1) }
    else setViewMonth((m) => m - 1)
  }

  function nextMonth() {
    if (viewMonth === 11) { setViewMonth(0); setViewYear((y) => y + 1) }
    else setViewMonth((m) => m + 1)
  }

  const firstDayOfMonth  = new Date(viewYear, viewMonth, 1).getDay()
  const daysInMonth      = new Date(viewYear, viewMonth + 1, 0).getDate()

  const calendarCells: (number | null)[] = [
    ...Array(firstDayOfMonth).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ]
  while (calendarCells.length % 7 !== 0) calendarCells.push(null)

  function openDay(day: number) {
    const dateStr = toDateStr(viewYear, viewMonth, day)
    setSelectedDay(dateStr)
  }

  function handleScheduleSave(type: ActivityType, date: string, note: string) {
    onAddScheduled({ type, date, note: note.trim() || undefined })
    setShowScheduleModal(false)
    setSelectedDay(null)
  }

  function openScheduleFromDay(date: string) {
    setScheduleForDate(date)
    setShowScheduleModal(true)
  }

  const selectedDayEvents = selectedDay ? (eventsByDate[selectedDay] ?? []) : []
  const selectedDayScheduled = selectedDay ? (scheduledByDate[selectedDay] ?? []) : []

  const upcomingTasks = useMemo(() => {
    const today0 = new Date(todayDateStr + 'T00:00:00')
    const all: { date: string; type: ActivityType; kind: 'upcoming' | 'scheduled'; note?: string; id?: string }[] = []

    ACTIVITY_TYPES.forEach((type) => {
      const next = lawnData[type].nextRecommended
      if (next) {
        const d = new Date(next + 'T00:00:00')
        if (d >= today0) all.push({ date: next, type, kind: 'upcoming' })
      }
    })
    scheduledTasks.forEach((task) => {
      const d = new Date(task.date + 'T00:00:00')
      if (d >= today0) all.push({ date: task.date, type: task.type, kind: 'scheduled', note: task.note, id: task.id })
    })

    return all.sort((a, b) => a.date.localeCompare(b.date)).slice(0, 6)
  }, [lawnData, scheduledTasks, todayDateStr])

  return (
    <div className="mt-10">
      <div className="flex items-end justify-between mb-4">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Lawn Calendar</h2>
          <p className="text-sm text-gray-400 mt-0.5">Past activity &amp; upcoming tasks</p>
        </div>
        <button
          onClick={() => { setScheduleForDate(todayDateStr); setShowScheduleModal(true) }}
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-white bg-green-600 hover:bg-green-700 transition-colors px-3 py-1.5 rounded-lg"
        >
          <PlusIcon />
          Schedule
        </button>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-3 mb-4">
        {ACTIVITY_TYPES.map((type) => {
          const cfg = ACTIVITY_CONFIG[type]
          return (
            <div key={type} className="flex items-center gap-1.5 text-xs text-gray-500">
              <span className={`w-2 h-2 rounded-full ${cfg.dot}`} />
              {cfg.label}
            </div>
          )
        })}
        <div className="flex items-center gap-1.5 text-xs text-gray-500">
          <span className="w-2 h-2 rounded-full bg-gray-300 border border-dashed border-gray-400" />
          Scheduled
        </div>
      </div>

      {/* Calendar grid */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        {/* Month nav */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <button onClick={prevMonth} className="w-8 h-8 flex items-center justify-center rounded-xl hover:bg-gray-100 text-gray-500 transition-colors">
            <ChevronLeft />
          </button>
          <span className="text-sm font-bold text-gray-800">{formatMonthYear(viewYear, viewMonth)}</span>
          <button onClick={nextMonth} className="w-8 h-8 flex items-center justify-center rounded-xl hover:bg-gray-100 text-gray-500 transition-colors">
            <ChevronRight />
          </button>
        </div>

        {/* Day labels */}
        <div className="grid grid-cols-7 border-b border-gray-50">
          {DAY_LABELS.map((d) => (
            <div key={d} className="py-2 text-center text-xs font-semibold text-gray-400">{d}</div>
          ))}
        </div>

        {/* Day cells */}
        <div className="grid grid-cols-7">
          {calendarCells.map((day, idx) => {
            if (day === null) {
              return <div key={`empty-${idx}`} className="h-14 border-b border-r border-gray-50 last:border-r-0" />
            }
            const dateStr   = toDateStr(viewYear, viewMonth, day)
            const isToday   = dateStr === todayDateStr
            const events    = eventsByDate[dateStr] ?? []
            const scheduled = scheduledByDate[dateStr] ?? []
            const hasEvents = events.length > 0 || scheduled.length > 0

            const loggedTypes    = Array.from(new Set(events.filter((e) => e.kind === 'logged').map((e) => e.type))) as ActivityType[]
            const upcomingTypes  = Array.from(new Set(events.filter((e) => e.kind === 'upcoming').map((e) => e.type))) as ActivityType[]
            const scheduledTypes = Array.from(new Set(scheduled.map((s) => s.type))) as ActivityType[]

            return (
              <button
                key={dateStr}
                onClick={() => openDay(day)}
                className={`h-14 flex flex-col items-center pt-1.5 border-b border-r border-gray-50 last:border-r-0 transition-colors relative group ${
                  hasEvents ? 'hover:bg-green-50 cursor-pointer' : 'hover:bg-gray-50 cursor-pointer'
                }`}
              >
                <span className={`text-xs font-semibold w-6 h-6 flex items-center justify-center rounded-full transition-colors ${
                  isToday ? 'bg-green-600 text-white' : 'text-gray-600 group-hover:text-gray-900'
                }`}>
                  {day}
                </span>
                <div className="flex gap-0.5 mt-1 flex-wrap justify-center max-w-[40px]">
                  {loggedTypes.map((type) => (
                    <span key={`l-${type}`} className={`w-1.5 h-1.5 rounded-full ${ACTIVITY_CONFIG[type].dot}`} />
                  ))}
                  {upcomingTypes.filter((t) => !loggedTypes.includes(t)).map((type) => (
                    <span key={`u-${type}`} className={`w-1.5 h-1.5 rounded-full ${ACTIVITY_CONFIG[type].dot} opacity-40`} />
                  ))}
                  {scheduledTypes.map((type) => (
                    <span key={`s-${type}`} className="w-1.5 h-1.5 rounded-full bg-gray-400" />
                  ))}
                </div>
              </button>
            )
          })}
        </div>
      </div>

      {/* Upcoming tasks list */}
      {upcomingTasks.length > 0 && (
        <div className="mt-5">
          <h3 className="text-sm font-bold text-gray-700 mb-3">Coming Up</h3>
          <div className="space-y-2">
            {upcomingTasks.map((task, i) => {
              const cfg         = ACTIVITY_CONFIG[task.type]
              const d           = new Date(task.date + 'T00:00:00')
              const now         = new Date(todayDateStr + 'T00:00:00')
              const diffDays    = Math.ceil((d.getTime() - now.getTime()) / 86400000)
              const dateLabel   = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
              const daysLabel   = diffDays === 0 ? 'Today' : diffDays === 1 ? 'Tomorrow' : `In ${diffDays} days`

              return (
                <div key={i} className="flex items-center gap-3 bg-white rounded-xl border border-gray-100 px-4 py-3 shadow-sm">
                  <span className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${cfg.dot}`} />
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-semibold ${cfg.text}`}>
                      {cfg.label}
                      {task.kind === 'scheduled' ? ' (scheduled)' : ' (recommended)'}
                    </p>
                    {task.note && <p className="text-xs text-gray-400 truncate">{task.note}</p>}
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-xs font-semibold text-gray-700">{dateLabel}</p>
                    <p className="text-xs text-gray-400">{daysLabel}</p>
                  </div>
                  {task.kind === 'scheduled' && task.id && (
                    <button
                      onClick={() => onRemoveScheduled(task.id!)}
                      className="flex-shrink-0 w-6 h-6 flex items-center justify-center rounded-lg text-gray-300 hover:text-red-500 hover:bg-red-50 transition-colors"
                      title="Remove"
                    >
                      <TrashIcon />
                    </button>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Day detail modal */}
      {selectedDay && !showScheduleModal && (
        <DayDetailModal
          date={selectedDay}
          events={selectedDayEvents}
          scheduledOnDay={selectedDayScheduled}
          onClose={() => setSelectedDay(null)}
          onSchedule={() => openScheduleFromDay(selectedDay)}
          onRemoveScheduled={(id) => {
            onRemoveScheduled(id)
          }}
        />
      )}

      {/* Schedule modal */}
      {showScheduleModal && (
        <ScheduleModal
          date={scheduleForDate}
          onClose={() => { setShowScheduleModal(false) }}
          onSave={handleScheduleSave}
        />
      )}
    </div>
  )
}
