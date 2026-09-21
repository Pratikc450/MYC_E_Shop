export type Channel = 'phone' | 'web' | 'app'
export type SessionState = 'consent_required' | 'ready' | 'verifying' | 'escalated' | 'ended'
export type Intent = 'directory' | 'schedule' | 'appointment' | 'surgery' | 'report_status' | 'pharmacy' | 'emergency' | 'unknown'

export type Session = {
  id: string
  channel: Channel
  language: 'en-IN' | 'hi-IN' | 'mr-IN'
  state: SessionState
  createdAt: string
  expiresAt: string
}

export type Consent = {
  sessionId: string
  disclosure: string
  consented: boolean
  capturedAt: string
}

export type AuthToken = {
  token: string
  sessionId: string
  patientRef: string
  expiresAt: string
}

export type DomainFailure = {
  code: 'INTEGRATION_TIMEOUT' | 'INTEGRATION_UNAVAILABLE' | 'LOW_CONFIDENCE' | 'NOT_AUTHORIZED' | 'NOT_FOUND'
  message: string
  retryable: boolean
}

export type SafeResult<T> = { ok: true; data: T; source: string } | { ok: false; error: DomainFailure }

export type Weekday = 'Monday' | 'Tuesday' | 'Wednesday' | 'Thursday' | 'Friday' | 'Saturday' | 'Sunday'
export type WeeklyHours = { day: Weekday; morning: string; afternoon: string; evening: string }
export type RegistrationHours = { day: Weekday; morning: string; afternoon: string; evening: string }
export type DoctorAvailability = { doctorName: string; department: string; weeklySlots: WeeklyHours[]; location: string }
export type TestAvailability = { testName: string; category: string; weeklySlots: WeeklyHours[]; location: string }
export type ReportStatus = { reportId: string; status: 'ready' | 'pending'; expectedDate?: string; testName?: string; reportTime?: string; patientId?: string; patientName?: string; testDate?: string }
export type PharmacyAvailability = { medicineName: string; locations: { name: string; available: boolean }[] }

/** Creates the five-character patient reference issued after a completed test. */
export function generatePatientId(patientName: string, completedAt: string | Date) {
  const prefix = patientName.replace(/[^a-z]/gi, '').slice(0, 3).toUpperCase().padEnd(3, 'X')
  const date = completedAt instanceof Date ? completedAt : new Date(completedAt)
  const day = Number.isNaN(date.getTime()) ? Number.parseInt(String(completedAt), 10) : date.getDate()
  return `${prefix}${String(Math.min(Math.max(day || 1, 1), 31)).padStart(2, '0')}`
}

export const WEEKDAYS: Weekday[] = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']

export const REGISTRATION_HOURS: RegistrationHours[] = WEEKDAYS.map((day) => ({
  day,
  morning: day === 'Sunday' ? 'Closed' : '10:00–11:00',
  afternoon: day === 'Sunday' ? 'Closed' : '15:00–16:00',
  evening: day === 'Sunday' ? 'Closed' : '18:00–19:00',
}))

export const DOCTOR_SCHEDULES: DoctorAvailability[] = [
  { doctorName: 'Dr. Meera Sharma', department: 'Cardiology', weeklySlots: WEEKDAYS.map((day) => ({ day, morning: day === 'Sunday' ? 'Closed' : '09:00–12:00', afternoon: day === 'Sunday' ? 'Closed' : '14:00–16:00', evening: day === 'Saturday' || day === 'Sunday' ? 'Closed' : '17:00–19:00' })), location: 'Cardiology OPD · Floor 2' },
  { doctorName: 'Dr. Arjun Patel', department: 'Orthopedics', weeklySlots: WEEKDAYS.map((day) => ({ day, morning: day === 'Sunday' ? 'Closed' : '10:00–13:00', afternoon: day === 'Sunday' ? 'Closed' : '13:00–15:00', evening: day === 'Wednesday' || day === 'Friday' ? '16:00–18:00' : 'Closed' })), location: 'Orthopedics OPD · Floor 1' },
  { doctorName: 'Dr. Kavita Rao', department: 'Pulmonology', weeklySlots: WEEKDAYS.map((day) => ({ day, morning: day === 'Sunday' ? 'Closed' : '08:30–11:30', afternoon: day === 'Sunday' ? 'Closed' : '13:00–15:00', evening: day === 'Tuesday' || day === 'Thursday' ? '15:00–17:00' : 'Closed' })), location: 'Pulmonology OPD · Floor 2' },
  { doctorName: 'Dr. Sameer Khan', department: 'General Medicine', weeklySlots: WEEKDAYS.map((day) => ({ day, morning: day === 'Sunday' ? 'Closed' : '09:00–13:00', afternoon: day === 'Sunday' ? 'Closed' : '13:00–15:00', evening: day === 'Sunday' ? 'Closed' : '16:00–18:00' })), location: 'General Medicine OPD · Floor 1' },
  { doctorName: 'Dr. Ananya Iyer', department: 'Gynecology', weeklySlots: WEEKDAYS.map((day) => ({ day, morning: day === 'Sunday' ? 'Closed' : day === 'Tuesday' || day === 'Thursday' ? '11:00–13:00' : 'Closed', afternoon: day === 'Sunday' ? 'Closed' : day === 'Monday' || day === 'Wednesday' || day === 'Friday' ? '14:00–16:00' : 'Closed', evening: day === 'Sunday' ? 'Closed' : day === 'Monday' || day === 'Thursday' || day === 'Saturday' ? '18:00–20:00' : 'Closed' })), location: 'Gynecology OPD · Floor 3' },
]

export const TEST_SCHEDULES: TestAvailability[] = [
  { testName: 'Heart tests', category: 'Cardiology', weeklySlots: WEEKDAYS.map((day) => ({ day, morning: day === 'Sunday' ? 'Closed' : '08:00–11:00', afternoon: day === 'Sunday' ? 'Closed' : '13:00–14:00', evening: day === 'Saturday' ? 'Closed' : '15:00–17:00' })), location: 'Diagnostics · Floor 1' },
  { testName: 'Orthopedic imaging', category: 'Orthopedics', weeklySlots: WEEKDAYS.map((day) => ({ day, morning: day === 'Sunday' ? 'Closed' : '09:00–13:00', afternoon: day === 'Sunday' ? 'Closed' : '13:00–14:00', evening: day === 'Sunday' ? 'Closed' : '14:00–16:00' })), location: 'Imaging Centre · Floor 1' },
  { testName: 'Lung tests', category: 'Pulmonology', weeklySlots: WEEKDAYS.map((day) => ({ day, morning: day === 'Sunday' ? 'Closed' : '10:00–12:00', afternoon: day === 'Sunday' ? 'Closed' : '14:00–15:00', evening: day === 'Tuesday' || day === 'Thursday' ? '16:00–18:00' : 'Closed' })), location: 'Pulmonary Lab · Floor 2' },
]

export type AuditEvent = {
  sessionId: string
  actor: 'patient' | 'agent' | 'system' | 'integration'
  toolName: string
  patientRef?: string
  outcome: 'success' | 'denied' | 'failure'
  metadata?: Record<string, string>
}

export const AUTOMATED_DISCLOSURE = 'You are speaking with Arogya Assist, an automated hospital information service. You can ask for a human at any time.'

export function redactedPatientRef(value: string) {
  const normalized = value.trim()
  return normalized.length < 4 ? 'redacted' : `${normalized.slice(0, 2)}•••${normalized.slice(-2)}`
}
