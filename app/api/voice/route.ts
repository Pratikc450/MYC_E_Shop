import { generateText } from 'ai'
import { clinicScheduleResponse, classifyIntent, confidenceFor, detectEmergency, emergencyResponse, lowConfidenceResponse, reportStatusResponse } from '@/lib/healthcare/orchestrator'
import { getClientKey, isPayloadTooLarge, isRateLimited, isTrustedOrigin, jsonError, jsonOk, requestId, sanitizeHistory, sanitizeMessage } from '@/lib/security'

export const runtime = 'nodejs'

export async function POST(request: Request) {
  const id = requestId()
  try {
    if (request.method !== 'POST' || !isTrustedOrigin(request)) return jsonError('Request not allowed', 403, id)
    if (isPayloadTooLarge(request)) return jsonError('Request payload is too large', 413, id)
    if (isRateLimited(`voice:${getClientKey(request)}`)) return jsonError('Too many requests. Please try again shortly.', 429, id)

    const body = await request.json().catch(() => null) as { message?: unknown; conversationHistory?: unknown } | null
    const message = sanitizeMessage(body?.message)
    const conversationHistory = sanitizeHistory(body?.conversationHistory)
    if (!message) return jsonError('Missing or invalid message', 400, id)

    if (detectEmergency(message)) {
      return jsonOk({
        text: emergencyResponse(),
        intent: 'emergency',
        priority: 'urgent',
        timestamp: new Date().toLocaleTimeString([], { hour12: false }),
      }, id)
    }

    const normalizedMessage = message.trim()
    const intent = classifyIntent(normalizedMessage)
    const history = Array.isArray(conversationHistory) ? conversationHistory : []
    const reportAnswer = reportStatusResponse(message, history)
    if (reportAnswer) {
      return jsonOk({
        text: reportAnswer,
        intent: 'report_status',
        priority: 'routine',
        timestamp: new Date().toLocaleTimeString([], { hour12: false }),
      }, id)
    }

    const scheduleAnswer = clinicScheduleResponse(message)
    if (scheduleAnswer) {
      return jsonOk({
        text: scheduleAnswer,
        intent,
        priority: 'routine',
        timestamp: new Date().toLocaleTimeString([], { hour12: false }),
      }, id)
    }

    if (confidenceFor(normalizedMessage) < 0.65) {
      return jsonOk({
        text: lowConfidenceResponse(),
        intent: 'unknown',
        priority: 'routine',
        timestamp: new Date().toLocaleTimeString([], { hour12: false }),
      }, id)
    }

    // Build conversation context from history
    const messages = [
      ...(conversationHistory || []),
      {
        role: 'user' as const,
        content: message,
      },
    ]

    let text: string

    try {
      const result = await generateText({
        model: 'openai/gpt-4o-mini',
        messages,
        system: `You are Arogya Assist, a warm, professional hospital information assistant. Help patients with registration hours, reception, doctor availability, appointments, surgery scheduling, medical testing status, and pharmacy stock. Speak in one or two short sentences suitable for voice. Never provide diagnosis, dosage, report contents, or invented live availability. If a request needs patient-specific data, explain that identity verification is required. If a request is unclear, ask one focused clarification question.`,
        temperature: 0.65,
        maxOutputTokens: 120,
      })
      text = result.text
    } catch (modelError) {
      // Keep the voice loop usable in previews when the Gateway account is not unlocked yet.
      console.warn('[v0] AI Gateway unavailable, using voice-safe fallback:', modelError)
      text = `I heard you say, “${message.trim()}” — I’m ready to help with that.`
    }

    return jsonOk({
      text,
      intent,
      priority: 'routine',
      timestamp: new Date().toLocaleTimeString([], { hour12: false }),
    }, id)
  } catch (error) {
    console.error('[v0] Voice API error:', error)
    return jsonError('Unable to process the request', 500, id)
  }
}
