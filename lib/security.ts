import { randomUUID } from 'node:crypto'

const MAX_BODY_BYTES = 32_000
const MAX_MESSAGE_LENGTH = 1_200
const MAX_HISTORY_ITEMS = 12
const MAX_HISTORY_CONTENT_LENGTH = 1_000
const WINDOW_MS = 60_000
const MAX_REQUESTS_PER_WINDOW = 30
const requestBuckets = new Map<string, { count: number; resetAt: number }>()

export function requestId() {
  return randomUUID()
}

export function isPayloadTooLarge(request: Request) {
  const length = Number(request.headers.get('content-length') ?? 0)
  return Number.isFinite(length) && length > MAX_BODY_BYTES
}

export function isTrustedOrigin(request: Request) {
  const origin = request.headers.get('origin')
  const fetchSite = request.headers.get('sec-fetch-site')
  if (!origin || origin === 'null' || fetchSite === 'same-origin' || fetchSite === 'same-site') return true
  try {
    const originUrl = new URL(origin)
    const requestUrl = new URL(request.url)
    return originUrl.hostname === requestUrl.hostname || originUrl.hostname === 'localhost' || originUrl.hostname === '127.0.0.1' || originUrl.hostname.endsWith('.vercel.app')
  } catch {
    return false
  }
}

export function getClientKey(request: Request) {
  return request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || request.headers.get('x-real-ip') || 'unknown'
}

export function isRateLimited(key: string) {
  const now = Date.now()
  if (requestBuckets.size > 5_000) {
    for (const [bucketKey, bucket] of requestBuckets) {
      if (bucket.resetAt <= now) requestBuckets.delete(bucketKey)
    }
  }
  const boundedKey = key.slice(0, 160)
  const current = requestBuckets.get(boundedKey)
  if (!current || current.resetAt <= now) {
    requestBuckets.set(boundedKey, { count: 1, resetAt: now + WINDOW_MS })
    return false
  }
  current.count += 1
  return current.count > MAX_REQUESTS_PER_WINDOW
}

export function sanitizeMessage(value: unknown) {
  return typeof value === 'string' ? value.trim().slice(0, MAX_MESSAGE_LENGTH) : ''
}

export function sanitizeHistory(value: unknown): Array<{ role: 'user' | 'assistant'; content: string }> {
  if (!Array.isArray(value)) return []
  return value.slice(-MAX_HISTORY_ITEMS).flatMap((item) => {
    if (!item || typeof item !== 'object') return []
    const record = item as { role?: unknown; content?: unknown }
    const role = record.role === 'user' || record.role === 'assistant' ? record.role : null
    const content = typeof record.content === 'string' ? record.content.trim().slice(0, MAX_HISTORY_CONTENT_LENGTH) : ''
    return role && content ? [{ role, content }] : []
  })
}

export function securityHeaders(response: Response, id: string) {
  response.headers.set('Cache-Control', 'no-store')
  response.headers.set('X-Request-ID', id)
  response.headers.set('X-Content-Type-Options', 'nosniff')
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')
  response.headers.set('Permissions-Policy', 'camera=(), geolocation=(), payment=()')
  return response
}

export const limits = { MAX_BODY_BYTES, MAX_MESSAGE_LENGTH }

export function jsonError(message: string, status: number, id: string) {
  return securityHeaders(Response.json({ error: message, requestId: id }, { status }), id)
}

export function jsonOk(payload: unknown, id: string) {
  return securityHeaders(Response.json(payload), id)
}
