import { clinicScheduleResponse, emergencyResponse, reportStatusResponse } from '@/lib/healthcare/orchestrator'
import { isRateLimited, requestId } from '@/lib/security'

export const runtime = 'nodejs'

function xmlEscape(value: string) {
  return value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&apos;')
}

function twiml(message: string, gather = true) {
  const escaped = xmlEscape(message)
  const gatherBlock = gather
    ? `<Gather input="speech" language="en-IN" speechTimeout="auto" action="/api/twilio/voice" method="POST"><Say language="en-IN">You can ask about registration, reception, doctors, medical tests, or report status.</Say></Gather>`
    : ''
  return `<?xml version="1.0" encoding="UTF-8"?><Response><Say language="en-IN">${escaped}</Say>${gatherBlock}<Say language="en-IN">Thank you for calling the hospital voice assistant.</Say></Response>`
}

export async function POST(request: Request) {
  const id = requestId()
  const caller = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown'
  if (isRateLimited(`twilio:${caller}`)) {
    return new Response(twiml('Too many requests were received from this number. Please call again shortly.', false), { status: 429, headers: { 'content-type': 'text/xml; charset=utf-8', 'x-request-id': id } })
  }

  const form = await request.formData().catch(() => null)
  const speech = String(form?.get('SpeechResult') ?? '').trim()
  const message = speech || 'Welcome'
  const answer = message === 'Welcome'
    ? 'Welcome to the hospital voice assistant. Please tell me what information you need.'
    : /chest pain|cannot breathe|difficulty breathing|unconscious|severe bleeding|stroke|overdose/i.test(message)
      ? emergencyResponse()
      : reportStatusResponse(message) ?? clinicScheduleResponse(message) ?? 'I can help with hospital hours, doctor availability, medical testing, reception, registration, or report status. Please ask your question again.'

  return new Response(twiml(answer), { headers: { 'content-type': 'text/xml; charset=utf-8', 'x-request-id': id } })
}

export async function GET() {
  return new Response(twiml('Welcome to the hospital voice assistant. Please tell me what information you need.'), { headers: { 'content-type': 'text/xml; charset=utf-8' } })
}
