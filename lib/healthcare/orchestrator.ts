import { DOCTOR_SCHEDULES, REGISTRATION_HOURS, TEST_SCHEDULES, WEEKDAYS, generatePatientId, type Intent, type RegistrationHours, type ReportStatus, type SafeResult, type WeeklyHours } from './contracts'

function formatClockRange(value: string) {
  if (value === 'Closed') return 'closed'
  const [start, end] = value.split('–')
  const formatTime = (time: string) => {
    const [hours, minutes] = time.split(':').map(Number)
    const suffix = hours >= 12 ? 'p.m.' : 'a.m.'
    const hour = hours % 12 || 12
    return `${hour}:${String(minutes).padStart(2, '0')} ${suffix}`
  }
  return `${formatTime(start)} to ${formatTime(end)}`
}

const weekdayPattern = /(Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday)/i

function requestedDay(text: string) {
  if (/\b(?:monday\s*(?:to|through|-|–)\s*sunday|whole\s*week|entire\s*week|all\s*week|weekly)\b/i.test(text)) return undefined
  const match = text.match(weekdayPattern)
  return match ? WEEKDAYS.find((day) => day.toLowerCase() === match[1].toLowerCase()) : undefined
}

const departmentAliases: Record<string, string[]> = {
  Cardiology: ['cardiology', 'cardiologist', 'cardiac', 'heart'],
  Orthopedics: ['orthopedic', 'orthopaedic', 'orthopedics', 'bone'],
  Pulmonology: ['pulmonology', 'pulmonologist', 'pulmonary', 'lung', 'lungs'],
  Gynecology: ['gynecology', 'gynaecology', 'gynecologist', 'gynaecologist', 'women’s health', 'womens health'],
  'General Medicine': ['general medicine', 'general physician', 'medicine'],
}

function matchesDepartment(text: string, department: string) {
  const normalized = text.toLowerCase()
  return departmentAliases[department]?.some((alias) => normalized.includes(alias)) ?? false
}

function requestedDoctors(text: string) {
  const normalized = text.toLowerCase()
  return DOCTOR_SCHEDULES.filter((doctor) => {
    const nameParts = doctor.doctorName.toLowerCase().replace('dr. ', '').split(' ')
    const nameMatch = nameParts.some((part) => part.length > 2 && normalized.includes(part))
    return nameMatch || matchesDepartment(text, doctor.department)
  })
}

function requestedTests(text: string) {
  return TEST_SCHEDULES.filter((test) => matchesDepartment(text, test.category))
}

function formatWeeklyHours(label: string, schedule: RegistrationHours[], day?: typeof WEEKDAYS[number], shift?: ReturnType<typeof requestedShift>, hour?: ReturnType<typeof requestedHour>) {
  const rows = day ? schedule.filter((row) => row.day === day) : schedule
  const scope = day ? `${day} only` : 'Monday through Sunday'
  if (hour) {
    const matches = rows.flatMap((row) => (['morning', 'afternoon', 'evening'] as const).filter((period) => rangeContains(row[period], hour.minutes)).map((period) => `${row.day} ${period} at ${hour.label}: available (${formatClockRange(row[period])})`))
    return `${label}, ${scope}, ${hour.label}: ${matches.length ? matches.join('. ') : 'not available at that exact time'}.`
  }
  return `${label}, ${scope}: ${rows.map((row) => `${row.day}: ${shift ? `${shift} ${formatClockRange(row[shift])}` : `morning ${formatClockRange(row.morning)}; afternoon ${formatClockRange(row.afternoon)}; evening ${formatClockRange(row.evening)}`}`).join('. ')}.`
}

function requestedShift(text: string) {
  if (/\b(morning|a\.m\.?|am)\b/i.test(text)) return 'morning' as const
  if (/\b(afternoon)\b/i.test(text)) return 'afternoon' as const
  if (/\b(evening|p\.m\.?|pm)\b/i.test(text)) return 'evening' as const
  return undefined
}

function requestedHour(text: string) {
  const match = text.match(/\b(1[0-2]|0?[1-9])\s*(?::|\.)?\s*(00|15|30|45)?\s*(a\.?m\.?|p\.?m\.?|am|pm)\b/i)
  if (!match) return undefined
  let hour = Number(match[1])
  if (/p/i.test(match[3]) && hour < 12) hour += 12
  if (/a/i.test(match[3]) && hour === 12) hour = 0
  return { minutes: hour * 60 + Number(match[2] ?? 0), label: `${match[1]}${match[2] ? `:${match[2]}` : ''} ${match[3].replaceAll('.', '').toUpperCase()}` }
}

function rangeContains(range: string, requestedMinutes: number) {
  const match = range.match(/(\d{1,2}):(\d{2})[–-](\d{1,2}):(\d{2})/)
  if (!match) return false
  const start = Number(match[1]) * 60 + Number(match[2])
  const end = Number(match[3]) * 60 + Number(match[4])
  return requestedMinutes >= start && requestedMinutes <= end
}

function formatDetailedSchedule(schedule: WeeklyHours[], day?: typeof WEEKDAYS[number], shift?: ReturnType<typeof requestedShift>, hour?: ReturnType<typeof requestedHour>) {
  const rows = day ? schedule.filter((row) => row.day === day) : schedule
  if (hour) {
    const matches = rows.flatMap((row) => (['morning', 'afternoon', 'evening'] as const).filter((period) => rangeContains(row[period], hour.minutes)).map((period) => `${row.day} ${period} at ${hour.label}: available (${formatClockRange(row[period])})`))
    return matches.length ? matches.join('. ') : `${day ?? 'The requested day'} at ${hour.label}: not available`
  }
  return rows.map((row) => {
    const ranges = shift ? `${shift} ${formatClockRange(row[shift])}` : `morning ${formatClockRange(row.morning)}; afternoon ${formatClockRange(row.afternoon)}; evening ${formatClockRange(row.evening)}`
    return `${row.day}: ${ranges}`
  }).join('. ')
}

function formatDoctorSchedule(doctor: typeof DOCTOR_SCHEDULES[number], day?: typeof WEEKDAYS[number], shift?: ReturnType<typeof requestedShift>, hour?: ReturnType<typeof requestedHour>) {
  return `${doctor.doctorName}, ${doctor.department}, at ${doctor.location}. ${formatDetailedSchedule(doctor.weeklySlots, day, shift, hour)}`
}

const DEMO_REPORTS: Record<string, ReportStatus> = {
  pra19: { reportId: 'RPT-PRA19', patientId: 'pra19', patientName: 'Pratik', testDate: '19 September 2026', status: 'ready', testName: 'Heart tests', reportTime: 'Monday at 6:00 p.m.' },
  ada22: { reportId: 'RPT-ADA22', patientId: 'ada22', patientName: 'Adams', testDate: '22 September 2026', status: 'ready', testName: 'Orthopedic imaging', reportTime: 'Thursday at 3:00 p.m.' },
  pra25: { reportId: 'RPT-PRA25', patientId: 'pra25', patientName: 'Pratik', testDate: '25 September 2026', status: 'ready', testName: 'Heart tests', reportTime: 'Monday at 6:00 p.m.' },
  zub16: { reportId: 'RPT-ZUB16', patientId: 'zub16', patientName: 'Zubeda', testDate: '16 July 2026', status: 'ready', testName: 'Orthopedic imaging', reportTime: 'Thursday at 3:00 p.m.' },
  arp19: { reportId: 'RPT-ARP19', patientId: 'arp19', patientName: 'Orpon', testDate: '19 August 2026', status: 'ready', testName: 'Lung tests', reportTime: 'Wednesday at 3:00 p.m.' },
  nik09: { reportId: 'RPT-NIK09', patientId: 'nik09', patientName: 'Nikita', testDate: '9 July 2026', status: 'pending', testName: 'Lung tests', expectedDate: 'Tuesday at 11:00 a.m.' },
  par16: { reportId: 'RPT-PAR16', patientId: 'par16', patientName: 'Parul', testDate: '16 December 2026', status: 'ready', testName: 'Orthopedic imaging', reportTime: 'Thursday at 3:00 p.m.' },
  58317: { reportId: 'RPT-58317', patientId: '58317', status: 'ready', testName: 'Orthopedic imaging', reportTime: 'Wednesday at 3:00 p.m.' },
  90462: { reportId: 'RPT-90462', patientId: '90462', status: 'pending', testName: 'Heart tests', expectedDate: 'Friday at 5:00 p.m.' },
  13795: { reportId: 'RPT-13795', patientId: '13795', status: 'ready', testName: 'Heart tests', reportTime: 'Monday at 6:00 p.m.' },
  24681: { reportId: 'RPT-24681', patientId: '24681', status: 'ready', testName: 'Lung tests', reportTime: 'Tuesday at 11:00 a.m.' },
  31572: { reportId: 'RPT-31572', patientId: '31572', status: 'ready', testName: 'Orthopedic imaging', reportTime: 'Tuesday at 4:00 p.m.' },
  42863: { reportId: 'RPT-42863', patientId: '42863', status: 'ready', testName: 'Heart tests', reportTime: 'Wednesday at 2:00 p.m.' },
  57104: { reportId: 'RPT-57104', patientId: '57104', status: 'ready', testName: 'Lung tests', reportTime: 'Thursday at 5:00 p.m.' },
  63928: { reportId: 'RPT-63928', patientId: '63928', status: 'ready', testName: 'Orthopedic imaging', reportTime: 'Thursday at 3:00 p.m.' },
  70419: { reportId: 'RPT-70419', patientId: '70419', status: 'ready', testName: 'Heart tests', reportTime: 'Friday at 10:00 a.m.' },
  82635: { reportId: 'RPT-82635', patientId: '82635', status: 'ready', testName: 'Lung tests', reportTime: 'Friday at 6:00 p.m.' },
  91847: { reportId: 'RPT-91847', patientId: '91847', status: 'ready', testName: 'Orthopedic imaging', reportTime: 'Saturday at 1:00 p.m.' },
  35290: { reportId: 'RPT-35290', patientId: '35290', status: 'ready', testName: 'Heart tests', reportTime: 'Saturday at 5:00 p.m.' },
  68027: { reportId: 'RPT-68027', patientId: '68027', status: 'ready', testName: 'Lung tests', reportTime: 'Sunday at 12:00 p.m.' },
}

const REPORT_HELP_LINE = '1800-123-4567'

function requestedPatientId(text: string) {
  const match = text.match(/(?:patient\s*(?:id|number|reference)|id|number|ref(?:erence)?)?\s*[:#-]?\s*([a-z]{3}\d{2}|\d{5})\b/i)
  return match?.[1]?.toLowerCase()
}

export function reportStatusResponse(text: string, conversationHistory: Array<{ role?: string; content?: string }> = []): string | null {
  const hasReportContext = conversationHistory.some((message) => /report|lab result|test result|patient id/i.test(message.content ?? ''))
  if (!/report|lab result|test result/i.test(text) && !hasReportContext) return null
  const patientId = requestedPatientId(text)
  if (!patientId) return `To check a test report, please provide the patient ID from your test receipt. It is generated from the first three letters of the patient name in capital letters plus the two-digit test date: ${generatePatientId('Pratik', '2026-09-19')} or ${generatePatientId('Parul', '2026-12-09')}. Dates from the first through ninth are zero-padded. For privacy, I can only discuss report status after ID verification.`
  const displayId = patientId.toUpperCase()
  const report = DEMO_REPORTS[patientId]
  // The voice flow exposes only two patient-facing outcomes: ready or pending.
  // Unknown IDs stay in the pending state rather than revealing whether a record exists.
  if (!report) return `Report update for patient ID ${displayId}: your report is still pending. For test report verification, call the toll-free number ${REPORT_HELP_LINE}.`
  if (report.status === 'ready') return `Report update for patient ID ${displayId}: your ${report.testName} report is ready and available ${report.reportTime} Please bring your ID to the reports desk. For any report verification help, call the toll-free number ${REPORT_HELP_LINE}.`
  return `Report update for patient ID ${displayId}: your ${report.testName} report is still pending. It is expected ${report.expectedDate} For test report verification, call the toll-free number ${REPORT_HELP_LINE}.`
}

export function clinicScheduleResponse(text: string): string | null {
  const day = requestedDay(text)
  const shift = requestedShift(text)
  const hour = requestedHour(text)
  const asksRegistration = /registration/i.test(text)
  const asksReception = /reception|front desk/i.test(text)
  const asksDoctor = /doctor|dr\.?\s+[a-z]|specialist|physician|availab(?:le|ility)/i.test(text)
  const asksTesting = /test|diagnostic|heart|cardiac|orthopedic|orthopaedic|bone|lung|lungs|pulmonary/i.test(text)

  if (asksRegistration && (asksDoctor || asksTesting || asksReception)) {
    const registration = formatWeeklyHours('Registration hours', REGISTRATION_HOURS, day, shift, hour)
    const additional = clinicScheduleResponse(text.replace(/registration/gi, ''))
    return additional ? `${registration} ${additional}` : registration
  }
  if (asksRegistration) {
    return formatWeeklyHours('Registration hours', REGISTRATION_HOURS, day, shift, hour)
  }
  if (asksReception) {
    return formatWeeklyHours('Reception hours', REGISTRATION_HOURS, day, shift, hour)
  }
  if (/test|diagnostic|heart|cardiac|orthopedic|orthopaedic|bone|lung|lungs|pulmonary/i.test(text)) {
    const scope = day ? `${day}` : 'Monday through Sunday'
    const matches = requestedTests(text)
    const tests = matches.length > 0 ? matches : TEST_SCHEDULES
    const focus = matches.length > 0 ? ` for ${matches.map((test) => test.category).join(' and ')}` : ''
    return `Medical testing schedule${focus} for ${scope}: ${tests.map((test) => `${test.testName} at ${test.location}: ${formatDetailedSchedule(test.weeklySlots, day, shift, hour)}`).join(' Next test: ')}`
  }
  if (/doctor|dr\.?\s+[a-z]|specialist|physician|availab(?:le|ility)/i.test(text)) {
    const scope = day ? `${day}` : 'Monday through Sunday'
    const matches = requestedDoctors(text)
    const doctors = matches.length > 0 ? matches : DOCTOR_SCHEDULES
    const focus = matches.length > 0 ? ` for ${matches.map((doctor) => doctor.doctorName).join(' and ')}` : ''
    return `Doctor availability${focus} for ${scope}: ${doctors.map((doctor) => formatDoctorSchedule(doctor, day, shift, hour)).join(' Next doctor: ')}`
  }
  return null
}

const emergencyPatterns = [
  /chest pain/i,
  /can't breathe|cannot breathe|difficulty breathing/i,
  /unconscious|not conscious/i,
  /severe bleeding/i,
  /stroke/i,
  /suicid|overdose/i,
]

export function detectEmergency(text: string) {
  return emergencyPatterns.some((pattern) => pattern.test(text))
}

export function classifyIntent(text: string): Intent {
  if (/doctor|dr\.?\s+[a-z]|specialist|department|availab(?:le|ility)|timing/i.test(text)) return 'schedule'
  if (/appointment|book|reschedule|checkup/i.test(text)) return 'appointment'
  if (/surgery|operation/i.test(text)) return 'surgery'
  if (/report|lab result|test result/i.test(text)) return 'report_status'
  if (/medicine|medication|pharmacy|stock/i.test(text)) return 'pharmacy'
  if (/registration|reception|hours|location|address/i.test(text)) return 'directory'
  return 'unknown'
}

export function confidenceFor(text: string) {
  return text.trim().length < 8 ? 0.42 : 0.91
}

export function safeFailure<T>(message: string, code: 'INTEGRATION_TIMEOUT' | 'INTEGRATION_UNAVAILABLE' | 'LOW_CONFIDENCE' | 'NOT_AUTHORIZED' | 'NOT_FOUND'): SafeResult<T> {
  return { ok: false, error: { code, message, retryable: code !== 'NOT_AUTHORIZED' && code !== 'NOT_FOUND' } }
}

export function emergencyResponse() {
  return 'This may be an emergency. Please call your local emergency number now, or say “human” for an immediate priority transfer. I will not continue with routine information while you may need urgent care.'
}

export function lowConfidenceResponse() {
  return 'I want to make sure I understood you correctly. Could you repeat that in a few words, such as doctor timing, registration, test availability, or medicine stock?'
}

export function integrationFailureResponse() {
  return 'I cannot check that live hospital system right now. I can connect you with reception or arrange a callback instead.'
}
