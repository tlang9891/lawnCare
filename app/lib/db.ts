import { supabase } from './supabase'
import type {
  ActivityType, ActivityLog, LawnData,
  EquipmentType, MaintenanceItem, Equipment,
  ScheduledTask, LawnPhoto,
} from './types'

// ── Default intervals ────────────────────────────────────────────────────────

const DEFAULT_INTERVALS: Record<ActivityType, number> = {
  watering:    3,
  mowing:      10,
  fertilizing: 60,
}

// ── Maintenance defaults (mirrors page.tsx MAINTENANCE_DEFAULTS) ─────────────

const MAINTENANCE_DEFAULTS: Record<EquipmentType, { name: string; intervalMonths: number }[]> = {
  mower: [
    { name: 'Oil Change',            intervalMonths: 6  },
    { name: 'Blade Sharpen/Replace', intervalMonths: 6  },
    { name: 'Air Filter Replace',    intervalMonths: 6  },
    { name: 'Spark Plug Replace',    intervalMonths: 12 },
    { name: 'Fuel Filter Replace',   intervalMonths: 12 },
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
    { name: 'Blade Sharpen/Replace', intervalMonths: 6  },
    { name: 'Air Filter Replace',    intervalMonths: 6  },
    { name: 'Spark Plug Replace',    intervalMonths: 12 },
    { name: 'Fuel Filter Replace',   intervalMonths: 12 },
  ],
  chainsaw: [
    { name: 'Bar & Chain Oil',    intervalMonths: 1  },
    { name: 'Chain Sharpen',       intervalMonths: 3  },
    { name: 'Air Filter Clean',    intervalMonths: 3  },
    { name: 'Fuel Filter Replace', intervalMonths: 6  },
    { name: 'Spark Plug Replace',  intervalMonths: 12 },
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

// ── Storage helpers ──────────────────────────────────────────────────────────

async function uploadFile(bucket: string, path: string, file: File): Promise<string> {
  const { error } = await supabase.storage.from(bucket).upload(path, file, { upsert: true })
  if (error) throw new Error(error.message)
  const { data } = supabase.storage.from(bucket).getPublicUrl(path)
  return data.publicUrl
}

export async function deleteStorageFile(bucket: string, url: string): Promise<void> {
  try {
    const urlObj = new URL(url)
    const marker = `/object/public/${bucket}/`
    const idx    = urlObj.pathname.indexOf(marker)
    if (idx === -1) return
    const path = urlObj.pathname.slice(idx + marker.length)
    await supabase.storage.from(bucket).remove([decodeURIComponent(path)])
  } catch {
    // best-effort; don't throw if Storage cleanup fails
  }
}

// ── Lawn data ────────────────────────────────────────────────────────────────

export async function getLawnData(userId: string): Promise<LawnData> {
  const [{ data: settings }, { data: activities }] = await Promise.all([
    supabase.from('lawn_settings').select('*').eq('user_id', userId),
    supabase
      .from('lawn_activities')
      .select('*')
      .eq('user_id', userId)
      .order('date', { ascending: false }),
  ])

  const data: LawnData = {
    watering:    { logs: [], nextRecommended: null, intervalDays: DEFAULT_INTERVALS.watering    },
    mowing:      { logs: [], nextRecommended: null, intervalDays: DEFAULT_INTERVALS.mowing      },
    fertilizing: { logs: [], nextRecommended: null, intervalDays: DEFAULT_INTERVALS.fertilizing },
  }

  for (const s of settings ?? []) {
    const t = s.activity_type as ActivityType
    data[t].intervalDays    = s.interval_days
    data[t].nextRecommended = s.next_recommended ?? null
  }

  for (const a of activities ?? []) {
    const t = a.activity_type as ActivityType
    data[t].logs.push({
      id:   a.id,
      date: a.date,
      ...(a.duration_minutes != null ? { duration: a.duration_minutes } : {}),
    })
  }

  return data
}

export async function logActivity(
  userId:          string,
  type:            ActivityType,
  date:            string,
  nextRecommended: string | null,
  intervalDays:    number,
  durationMinutes?: number,
): Promise<ActivityLog> {
  const payload: Record<string, unknown> = { user_id: userId, activity_type: type, date }
  if (durationMinutes != null) payload.duration_minutes = durationMinutes

  const { data, error } = await supabase
    .from('lawn_activities')
    .insert(payload)
    .select()
    .single()
  if (error) throw new Error(error.message)

  await supabase.from('lawn_settings').upsert(
    {
      user_id:          userId,
      activity_type:    type,
      interval_days:    intervalDays,
      next_recommended: nextRecommended,
      updated_at:       new Date().toISOString(),
    },
    { onConflict: 'user_id,activity_type' },
  )

  return {
    id:   data.id,
    date: data.date,
    ...(data.duration_minutes != null ? { duration: data.duration_minutes } : {}),
  }
}

// ── Equipment ────────────────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function rowToEquipment(row: any): Equipment {
  return {
    id:               row.id,
    type:             row.type as EquipmentType,
    mowerSubType:     (row.mower_sub_type as 'riding' | 'push') ?? undefined,
    year:             row.year,
    make:             row.make,
    model:            row.model,
    purchaseDate:     row.purchase_date ?? null,
    purchaseLocation: row.purchase_location ?? '',
    photoUrl:         row.photo_url ?? null,
    receiptUrl:       row.receipt_url ?? null,
    maintenance:      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (row.maintenance_items ?? []).map((item: any): MaintenanceItem => ({
        id:             item.id,
        name:           item.name,
        intervalMonths: item.interval_months,
        logDates:       (item.maintenance_logs ?? [])
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          .map((l: any) => l.date as string)
          .sort((a: string, b: string) => b.localeCompare(a)),
      })),
  }
}

export async function getEquipment(userId: string): Promise<Equipment[]> {
  const { data, error } = await supabase
    .from('equipment')
    .select(`
      *,
      maintenance_items (
        id, name, interval_months,
        maintenance_logs ( date )
      )
    `)
    .eq('user_id', userId)
    .order('created_at')
  if (error) throw new Error(error.message)
  return (data ?? []).map(rowToEquipment)
}

export async function addEquipment(
  userId:      string,
  type:        EquipmentType,
  fields:      Omit<Equipment, 'id' | 'type' | 'maintenance' | 'photoUrl' | 'receiptUrl'>,
  photoFile:   File | null,
  receiptFile: File | null,
): Promise<Equipment> {
  const { data: row, error } = await supabase
    .from('equipment')
    .insert({
      user_id:           userId,
      type,
      mower_sub_type:    fields.mowerSubType ?? null,
      year:              fields.year,
      make:              fields.make,
      model:             fields.model,
      purchase_date:     fields.purchaseDate ?? null,
      purchase_location: fields.purchaseLocation,
    })
    .select()
    .single()
  if (error) throw new Error(error.message)

  const equipId: string = row.id
  let photoUrl:   string | null = null
  let receiptUrl: string | null = null

  if (photoFile) {
    const ext = photoFile.name.split('.').pop() ?? 'jpg'
    photoUrl = await uploadFile('equipment-media', `${userId}/${equipId}/photo.${ext}`, photoFile)
  }
  if (receiptFile) {
    const ext = receiptFile.type === 'application/pdf' ? 'pdf' : (receiptFile.name.split('.').pop() ?? 'jpg')
    receiptUrl = await uploadFile('equipment-media', `${userId}/${equipId}/receipt.${ext}`, receiptFile)
  }
  if (photoUrl || receiptUrl) {
    await supabase.from('equipment').update({ photo_url: photoUrl, receipt_url: receiptUrl }).eq('id', equipId)
  }

  const defaults = MAINTENANCE_DEFAULTS[type]
  const maintRows: MaintenanceItem[] = []
  if (defaults.length > 0) {
    const { data: items, error: maintError } = await supabase
      .from('maintenance_items')
      .insert(
        defaults.map(m => ({
          equipment_id:    equipId,
          user_id:         userId,
          name:            m.name,
          interval_months: m.intervalMonths,
        })),
      )
      .select()
    if (maintError) throw new Error(maintError.message)
    for (const item of items ?? []) {
      maintRows.push({ id: item.id, name: item.name, intervalMonths: item.interval_months, logDates: [] })
    }
  }

  return {
    id:               equipId,
    type,
    mowerSubType:     fields.mowerSubType,
    year:             fields.year,
    make:             fields.make,
    model:            fields.model,
    purchaseDate:     fields.purchaseDate,
    purchaseLocation: fields.purchaseLocation,
    photoUrl,
    receiptUrl,
    maintenance:      maintRows,
  }
}

export async function updateEquipment(
  userId:      string,
  equipment:   Equipment,
  photoFile:   File | null,
  receiptFile: File | null,
): Promise<Equipment> {
  let { photoUrl, receiptUrl } = equipment

  if (photoFile) {
    const ext = photoFile.name.split('.').pop() ?? 'jpg'
    photoUrl = await uploadFile('equipment-media', `${userId}/${equipment.id}/photo.${ext}`, photoFile)
  }
  if (receiptFile) {
    const ext = receiptFile.type === 'application/pdf' ? 'pdf' : (receiptFile.name.split('.').pop() ?? 'jpg')
    receiptUrl = await uploadFile('equipment-media', `${userId}/${equipment.id}/receipt.${ext}`, receiptFile)
  }

  const { error } = await supabase.from('equipment').update({
    type:              equipment.type,
    mower_sub_type:    equipment.mowerSubType ?? null,
    year:              equipment.year,
    make:              equipment.make,
    model:             equipment.model,
    purchase_date:     equipment.purchaseDate ?? null,
    purchase_location: equipment.purchaseLocation,
    photo_url:         photoUrl,
    receipt_url:       receiptUrl,
  }).eq('id', equipment.id)
  if (error) throw new Error(error.message)

  return { ...equipment, photoUrl, receiptUrl }
}

// ── Maintenance logs ─────────────────────────────────────────────────────────

export async function logMaintenance(
  userId:            string,
  maintenanceItemId: string,
  date:              string,
): Promise<void> {
  const { error } = await supabase.from('maintenance_logs').insert({
    maintenance_item_id: maintenanceItemId,
    user_id:             userId,
    date,
  })
  if (error) throw new Error(error.message)
}

// ── Scheduled tasks ──────────────────────────────────────────────────────────

export async function getScheduledTasks(userId: string): Promise<ScheduledTask[]> {
  const { data, error } = await supabase
    .from('scheduled_tasks')
    .select('*')
    .eq('user_id', userId)
    .order('date')
  if (error) throw new Error(error.message)
  return (data ?? []).map(r => ({
    id:   r.id,
    type: r.type as ActivityType,
    date: r.date,
    ...(r.note ? { note: r.note as string } : {}),
  }))
}

export async function addScheduledTask(
  userId: string,
  type:   ActivityType,
  date:   string,
  note?:  string,
): Promise<ScheduledTask> {
  const { data, error } = await supabase
    .from('scheduled_tasks')
    .insert({ user_id: userId, type, date, note: note ?? null })
    .select()
    .single()
  if (error) throw new Error(error.message)
  return { id: data.id, type, date, ...(data.note ? { note: data.note as string } : {}) }
}

export async function removeScheduledTask(taskId: string): Promise<void> {
  const { error } = await supabase.from('scheduled_tasks').delete().eq('id', taskId)
  if (error) throw new Error(error.message)
}

// ── Lawn photos ──────────────────────────────────────────────────────────────

export async function getLawnPhotos(userId: string): Promise<LawnPhoto[]> {
  const { data, error } = await supabase
    .from('lawn_photos')
    .select('*')
    .eq('user_id', userId)
    .order('captured_at', { ascending: false })
  if (error) throw new Error(error.message)
  return (data ?? []).map(r => ({
    id:         r.id,
    url:        r.url,
    caption:    r.caption ?? '',
    capturedAt: r.captured_at,
  }))
}

export async function addLawnPhoto(
  userId:  string,
  file:    File,
  caption: string,
): Promise<LawnPhoto> {
  const ext  = file.name.split('.').pop() ?? 'jpg'
  const path = `${userId}/${Date.now()}.${ext}`
  const url  = await uploadFile('lawn-photos', path, file)

  const { data, error } = await supabase
    .from('lawn_photos')
    .insert({ user_id: userId, url, caption, captured_at: new Date().toISOString() })
    .select()
    .single()
  if (error) throw new Error(error.message)

  return { id: data.id, url, caption, capturedAt: data.captured_at }
}

export async function deleteLawnPhoto(
  userId:   string,
  photoId:  string,
  photoUrl: string,
): Promise<void> {
  await supabase.from('lawn_photos').delete().eq('id', photoId)
  await deleteStorageFile('lawn-photos', photoUrl)
}
