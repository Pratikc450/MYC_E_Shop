import { createHmac, timingSafeEqual } from 'node:crypto'
import { generateText } from 'ai'
import { detectEmergency, emergencyResponse } from '@/lib/healthcare/orchestrator'
import { sanitizeMessage, withTimeout } from '@/lib/security'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

function xmlEscape(value: string) {
  return value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&apos;')
}

function twiml(body: string) {
  return new Response(body, { headers: { 'Content-Type': 'text/xml; charset=utf-8', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' } })
}

function configured() {
  return Boolean(process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN && process.env.TWILIO_PHONE_NUMBER)
}

function isValidTwilioSignature(url: string, values: Record<string, string>, signature: string, authToken: string) {
  const payload = url + Object.keys(values).sort().map((key) => key + values[key]).join('')
  const expected = createHmac('sha1', authToken).update(payload).digest('base64')
  const received = Buffer.from(signature)
  const calculated = Buffer.from(expected)
  return received.length === calculated.length && timingSafeEqual(received, calculated)
}

export async function POST(request: Request) {
  if (!configured()) return twiml('<Response><Say>The phone service is not configured yet. Please use the web voice assistant.</Say><Hangup/></Response>')

  const form = await request.formData().catch(() => null)
  const signature = request.headers.get('x-twilio-signature')
  const authToken = process.env.TWILIO_AUTH_TOKEN
  const signatureUrl = process.env.TWILIO_WEBHOOK_URL || request.url
  const values = Object.fromEntries(Array.from(form?.entries() ?? []).map(([key, value]) => [key, typeof value === 'string' ? value : '']))
  if (!signature || !authToken || !isValidTwilioSignature(signatureUrl, values, signature, authToken)) {
    return new Response('Unauthorized', { status: 401 })
  }

  const speech = sanitizeMessage(form?.get('SpeechResult'))
  if (!speech) {
    return twiml('<Response><Gather input="speech" action="/api/twilio/voice" method="POST" speechTimeout="auto" language="en-IN"><Say>Welcome to Arogya Assist. Please tell me how I can help.</Say></Gather><Say>I did not hear a question. Goodbye.</Say><Hangup/></Response>')
  }

  let answer = detectEmergency(speech) ? emergencyResponse() : `I heard: ${speech}. `
  if (!detectEmergency(speech)) {
    try {
      const result = await withTimeout((signal) => generateText({
        model: 'openai/gpt-4o-mini',
        abortSignal: signal,
        system: 'You are Arogya Assist, a hospital information phone agent. Answer in one or two short spoken sentences. Help with registration, reception, doctor availability, appointments, tests, and pharmacy stock. Never diagnose, provide dosage, invent live availability, or expose private data. For emergencies tell the caller to contact local emergency services immediately.',
        prompt: speech,
        maxOutputTokens: 120,
        temperature: 0.35,
      }))
      answer = result.text
    } catch {
      answer += 'I can help with registration hours, doctors, tests, reception, or report status. Please say one of those topics.'
    }
  }

  return twiml(`<Response><Gather input="speech" action="/api/twilio/voice" method="POST" speechTimeout="auto" language="en-IN"><Say>${xmlEscape(answer)}</Say></Gather><Say>Thank you for calling Arogya Assist. Goodbye.</Say><Hangup/></Response>`)
}

export async function GET() {
  return Response.json({ enabled: configured(), intentModel: configured() ? 'realtime-phone' : 'web-fallback' }, { headers: { 'Cache-Control': 'no-store' } })
}

