import { clinicScheduleResponse, emergencyResponse, reportStatusResponse } from '@/lib/healthcare/orchestrator'
import { isRateLimited, requestId } from '@/lib/security'

export const runtime = 'nodejs'

function xmlEscape(value: string) {
  return value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&apos;')
}

function twiml(message: string, gather = true) {
  const escaped = xmlEscape(message)
  const gatherBlock = gather
    ? `<Gather input="speech" language="en-IN" speechTimeout="auto" action="/api/twilio/voice" method="POST" timeout="5" hints="registration, reception, doctor availability, medical test, report status, Monday, Tuesday, Wednesday, Thursday, Friday, Saturday, Sunday"><Say language="en-IN">You can ask one specific question about registration, reception, a doctor or department, medical testing, or a report. You can include a day and time, such as Wednesday at 3 p.m.</Say></Gather>`
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
    ? 'Welcome to Arogya Assist, the hospital information line. I can provide registration, reception, doctor and department availability, medical testing, and report-status information. For urgent symptoms, call your local emergency number immediately.'
    : /chest pain|cannot breathe|difficulty breathing|unconscious|severe bleeding|stroke|overdose|emergency/i.test(message)
      ? emergencyResponse()
      : /\b(human|operator|representative)\b/i.test(message)
        ? 'I can provide hospital information immediately. For a human representative, please call the hospital help desk using the toll-free number shown on the official hospital portal.'
        : reportStatusResponse(message) ?? clinicScheduleResponse(message) ?? 'I did not find that specific hospital detail. Please ask with the service, day, and time, for example: doctor availability on Wednesday at 3 p.m., or reception hours on Saturday morning.'

  return new Response(twiml(answer), { headers: { 'content-type': 'text/xml; charset=utf-8', 'x-request-id': id } })
}

export async function GET() {
  const id = requestId()
  return new Response(twiml('Welcome to RHO Assist. I can provide registration, reception, doctor and department availability, medical testing, and report-status information. Please ask one question with a day and time when needed.'), { headers: { 'content-type': 'text/xml; charset=utf-8', 'cache-control': 'no-store', 'x-request-id': id, 'x-content-type-options': 'nosniff' } })
}
