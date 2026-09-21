import { randomUUID } from 'node:crypto'
import { AUTOMATED_DISCLOSURE, type Channel, type Consent, type Session } from '@/lib/healthcare/contracts'
import { isPayloadTooLarge, isRateLimited, isTrustedOrigin, jsonError, jsonOk, requestId } from '@/lib/security'

export const runtime = 'nodejs'

export async function POST(request: Request) {
  const id = requestId()
  if (!isTrustedOrigin(request)) return jsonError('Request not allowed', 403, id)
  if (isPayloadTooLarge(request)) return jsonError('Request payload is too large', 413, id)
  if (isRateLimited(`session:${request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown'}`)) return jsonError('Too many requests. Please try again shortly.', 429, id)
  const body = await request.json().catch(() => ({})) as { channel?: Channel; language?: Session['language']; consented?: boolean }
  const channel = body.channel === 'phone' || body.channel === 'app' ? body.channel : 'web'
  const session: Session = {
    id: randomUUID(),
    channel,
    language: body.language === 'hi-IN' || body.language === 'mr-IN' ? body.language : 'en-IN',
    state: body.consented ? 'ready' : 'consent_required',
    createdAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
  }
  const consent: Consent = { sessionId: session.id, disclosure: AUTOMATED_DISCLOSURE, consented: body.consented === true, capturedAt: new Date().toISOString() }
  return jsonOk({ session, consent }, id)
}
