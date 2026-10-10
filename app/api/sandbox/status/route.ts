import { getHospitalSystemHealth } from '@/lib/healthcare/hospital-system-adapter'
import { securityHeaders, requestId } from '@/lib/security'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

function configured(status: boolean, readyDetail: string, missingDetail: string) {
  return { status: status ? 'ready' as const : 'degraded' as const, detail: status ? readyDetail : missingDetail }
}

export function GET() {
  const id = requestId()
  const aiReady = Boolean(process.env.AI_GATEWAY_API_KEY || process.env.VERCEL_OIDC_TOKEN)
  const twilioReady = Boolean(process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN && process.env.TWILIO_PHONE_NUMBER)
  const databaseReady = Boolean(process.env.DATABASE_URL || process.env.POSTGRES_URL)
  const hospital = getHospitalSystemHealth()
  const hospitalDetail = hospital.configured ? 'Live hospital connector configured' : `Sandbox adapter active (${hospital.mode})`
  const response = Response.json({
    environment: process.env.VERCEL_ENV === 'production' ? 'production' : 'sandbox',
    version: process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) || 'local',
    checkedAt: new Date().toISOString(),
    services: [
      { name: 'Realtime API', ...configured(true, 'Health endpoint responding', 'Health endpoint unavailable') },
      { name: 'AI reasoning', ...configured(aiReady, 'Gateway credentials available', 'Using deterministic voice-safe fallback') },
      { name: 'Voice bridge', ...configured(twilioReady, 'Twilio transport configured', 'Browser voice available; phone bridge needs setup') },
      { name: 'Session data', ...configured(databaseReady, 'Database connection configured', 'Stateless sandbox session') },
      { name: 'Hospital systems', ...configured(hospital.configured, hospitalDetail, 'Demo adapter active; no live hospital connector') },
    ],
  }, { headers: { 'Cache-Control': 'no-store' } })
  return securityHeaders(response, id)
}
