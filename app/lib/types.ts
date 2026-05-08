export type ActivityType  = 'watering' | 'mowing' | 'fertilizing'
export type EquipmentType = 'mower' | 'blower' | 'trimmer' | 'edger' | 'chainsaw' | 'pressure_washer' | 'other'

export interface ActivityLog {
  id:        string
  date:      string
  duration?: number
}

export interface Activity {
  logs:            ActivityLog[]
  nextRecommended: string | null
  intervalDays:    number
}

export interface LawnData {
  watering:    Activity
  mowing:      Activity
  fertilizing: Activity
}

export interface MaintenanceItem {
  id:             string
  name:           string
  logDates:       string[]
  intervalMonths: number
}

export interface Equipment {
  id:               string
  type:             EquipmentType
  mowerSubType?:    'riding' | 'push'
  year:             string
  make:             string
  model:            string
  purchaseDate:     string | null
  purchaseLocation: string
  photoUrl:         string | null
  receiptUrl:       string | null
  maintenance:      MaintenanceItem[]
}

export interface ScheduledTask {
  id:    string
  type:  ActivityType
  date:  string
  note?: string
}

export interface LawnPhoto {
  id:         string
  url:        string
  capturedAt: string
  caption:    string
}
