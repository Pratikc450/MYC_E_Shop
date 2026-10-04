import { getHospitalSystemHealth } from '@/lib/healthcare/hospital-system-adapter'
import { securityHeaders, requestId } from '@/lib/security'

export const runtime = 'nodejs'

export function GET() {
  const id = requestId()
  const response = Response.json({
    ok: true,
    service: 'arogya-assist-api',
    timestamp: new Date().toISOString(),
    dependencies: {
      aiGateway: Boolean(process.env.AI_GATEWAY_API_KEY || process.env.VERCEL_OIDC_TOKEN),
      twilio: Boolean(process.env.TWILIO_AUTH_TOKEN && process.env.TWILIO_PHONE_NUMBER),
      database: Boolean(process.env.DATABASE_URL),
      hospitalSystem: getHospitalSystemHealth(),
    },
  }, { headers: { 'Cache-Control': 'no-store' } })
  return securityHeaders(response, id)
}

export function HEAD() {
  return new Response(null, { status: 204 })
}

export const dynamic = 'force-dynamic'
