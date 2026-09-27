import { generateText } from 'ai'
import { clinicScheduleResponse, detectEmergency, emergencyResponse, lowConfidenceResponse } from '@/lib/healthcare/orchestrator'

export const runtime = 'nodejs'

function xml(value: string) {
  return value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&apos;')
}

function twiml(body: string) {
  return new Response(`<?xml version="1.0" encoding="UTF-8"?><Response>${body}</Response>`, {
    headers: { 'Content-Type': 'text/xml; charset=utf-8', 'Cache-Control': 'no-store' },
  })
}

const TOLL_FREE_NUMBER = '1800-123-4567'

function gather(prompt: string) {
  return `<Gather input="speech" action="/api/twilio/voice" method="POST" speechTimeout="auto" language="en-IN" actionOnEmptyResult="true"><Say language="en-IN" voice="Polly.Aditi">${xml(prompt)}</Say></Gather>`
}

async function isValidTwilioRequest(request: Request, params: URLSearchParams) {
  const token = process.env.TWILIO_AUTH_TOKEN
  const signature = request.headers.get('x-twilio-signature')
  if (!token || !signature) return process.env.NODE_ENV !== 'production'

  const url = new URL(request.url)
  const data = [...params.entries()].sort(([a], [b]) => a.localeCompare(b)).reduce((value, [key, item]) => value + key + item, url.toString())
  const crypto = await import('node:crypto')
  const expected = crypto.createHmac('sha1', token).update(data).digest('base64')
  const received = Buffer.from(signature)
  const calculated = Buffer.from(expected)
  return received.length === calculated.length && crypto.timingSafeEqual(received, calculated)
}

async function answerFor(message: string) {
  if (detectEmergency(message)) return emergencyResponse()
  const scheduleAnswer = clinicScheduleResponse(message)
  if (scheduleAnswer) return scheduleAnswer
  if (message.trim().length < 8) return lowConfidenceResponse()

  try {
    const result = await generateText({
      model: 'openai/gpt-4o-mini',
      system: `You are Arogya Assist, the 24/7 inbound phone agent for the diagnostic center at ${TOLL_FREE_NUMBER}. Callers may be patients, family members, or members of the public calling from outside the hospital. Give one or two short, clear sentences using only the directory schedule for registration, reception, doctors, appointments, and medical testing across Monday through Sunday and morning, afternoon, and evening. Never diagnose, give dosage, disclose private records, or invent live availability. Ask one focused clarification when needed. For emergencies, direct the caller to local emergency services.`,
      prompt: message,
      maxOutputTokens: 120,
    })
    return result.text
  } catch {
    return 'I can help with doctor schedules, registration, reception, and medical testing. Please say which service and day you need.'
  }
}

export async function POST(request: Request) {
  const params = new URLSearchParams(await request.text())
  if (!(await isValidTwilioRequest(request, params))) return new Response('Forbidden', { status: 403 })

  const speech = params.get('SpeechResult')?.trim()
  if (!speech) {
    return twiml(`${gather(`Welcome to Arogya Assist on ${TOLL_FREE_NUMBER}. I am available twenty-four hours a day, every day, for hospital information. Please ask about doctor availability, registration hours, reception timing, or medical testing for any day from Monday through Sunday, in the morning, afternoon, or evening.`)}`)
  }

  const answer = await answerFor(speech)
  if (detectEmergency(speech)) return twiml(`<Say language="en-IN" voice="Polly.Aditi">${xml(answer)}</Say><Hangup/>`)
  return twiml(`<Say language="en-IN" voice="Polly.Aditi">${xml(answer)}</Say>${gather('You can ask another question, or say goodbye to end the call.')}`)
}

export async function GET() {
  return twiml(gather(`Welcome to Arogya Assist on ${TOLL_FREE_NUMBER}. Please ask about doctor availability, registration, reception, or medical testing schedules.`))
}

export async function HEAD() {
  return new Response(null, { status: 204 })
}
