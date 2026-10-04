import { DOCTOR_SCHEDULES, REGISTRATION_HOURS, TEST_SCHEDULES, type DoctorAvailability, type RegistrationHours, type TestAvailability } from './contracts'

export type HospitalSystemSnapshot = {
  doctors: DoctorAvailability[]
  tests: TestAvailability[]
  registration: RegistrationHours[]
  source: string
  fetchedAt: string
}

export type HospitalSystemAdapter = {
  getOperationalSchedule(): HospitalSystemSnapshot
  health(): { configured: boolean; mode: 'adapter-stub' | 'external' }
}

/**
 * Stable boundary for the existing hospital system. Replace this implementation
 * with the hospital's authenticated API client without changing voice or UI code.
 */
class HospitalSystemAdapterStub implements HospitalSystemAdapter {
  getOperationalSchedule(): HospitalSystemSnapshot {
    return {
      doctors: DOCTOR_SCHEDULES,
      tests: TEST_SCHEDULES,
      registration: REGISTRATION_HOURS,
      source: 'hospital-system-adapter-stub',
      fetchedAt: new Date().toISOString(),
    }
  }

  health() {
    return { configured: false, mode: 'adapter-stub' as const }
  }
}

let adapter: HospitalSystemAdapter | undefined

export function getHospitalSystemAdapter(): HospitalSystemAdapter {
  adapter ??= new HospitalSystemAdapterStub()
  return adapter
}

export function getHospitalSystemHealth() {
  return getHospitalSystemAdapter().health()
}
