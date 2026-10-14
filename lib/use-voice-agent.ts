'use client'

import { useCallback, useEffect, useRef, useState, type Dispatch, type MutableRefObject, type SetStateAction } from 'react'

const REQUEST_TIMEOUT_MS = 12_000
const MAX_RETRIES = 2
const RETRY_DELAYS_MS = [250, 600]

type Message = { role: 'assistant' | 'user' | 'system'; text: string; time: string }
type TransportStatus = 'connecting' | 'connected' | 'fallback' | 'offline'
type VoiceReply = { text?: string; timestamp?: string; error?: string }

const initialMessages: Message[] = [
  { role: 'system', text: 'Session ready. Realtime transport is available.', time: '—' },
  { role: 'assistant', text: "Hi, I'm Nova. I can see, hear, and reason with you in real time. What should we explore?", time: '—' },
]
function now() { return new Date().toLocaleTimeString([], { hour12: false }) }
function appendReply(setMessages: Dispatch<SetStateAction<Message[]>>, messagesRef: MutableRefObject<Message[]>, data: VoiceReply) {
  const updated = [...messagesRef.current, { role: 'assistant' as const, text: data.text || "I'm ready to continue our conversation.", time: data.timestamp || now() }]
  messagesRef.current = updated
  setMessages(updated)
}

export function useVoiceAgent() {
  const [messages, setMessages] = useState<Message[]>(initialMessages)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [transportStatus, setTransportStatus] = useState<TransportStatus>('connecting')
  const messagesRef = useRef(messages)
  const socketRef = useRef<WebSocket | null>(null)
  const pendingRef = useRef(new Map<string, (reply: VoiceReply) => void>())
  const abortControllerRef = useRef<AbortController | null>(null)

  useEffect(() => {
    const configuredUrl = process.env.NEXT_PUBLIC_VOICE_WS_URL
    if (!configuredUrl) { setTransportStatus('fallback'); return }
    let reconnectTimer: number | null = null
    let stopped = false
    const connect = () => {
      if (stopped) return
      setTransportStatus('connecting')
      const socket = new WebSocket(configuredUrl)
      socketRef.current = socket
      socket.onopen = () => setTransportStatus('connected')
      socket.onmessage = (event) => {
        try {
          const payload = JSON.parse(event.data) as { id?: string; type?: string; reply?: VoiceReply }
          if (payload.id && payload.reply) pendingRef.current.get(payload.id)?.(payload.reply)
          if (payload.id) pendingRef.current.delete(payload.id)
        } catch { setError('Realtime response was invalid. Falling back to HTTP.') }
      }
      socket.onclose = () => {
        socketRef.current = null
        pendingRef.current.forEach((resolve) => resolve({ error: 'Realtime connection closed' }))
        pendingRef.current.clear()
        if (!stopped) { setTransportStatus('fallback'); reconnectTimer = window.setTimeout(connect, 3000) }
      }
      socket.onerror = () => socket.close()
    }
    connect()
    return () => { stopped = true; if (reconnectTimer) window.clearTimeout(reconnectTimer); socketRef.current?.close() }
  }, [])

  const sendMessage = useCallback(async (userMessage: string) => {
    const trimmedMessage = userMessage.trim()
    if (!trimmedMessage || isLoading) return
    setError(null)
    const history = messagesRef.current.filter((message) => message.role !== 'system').slice(-12).map(({ role, text }) => ({ role, content: text }))
    const userEntry: Message = { role: 'user', text: trimmedMessage, time: now() }
    const nextMessages = [...messagesRef.current, userEntry]
    messagesRef.current = nextMessages
    setMessages(nextMessages)
    setIsLoading(true)
    abortControllerRef.current?.abort()
    const sessionController = new AbortController()
    abortControllerRef.current = sessionController
    try {
      if (socketRef.current?.readyState === WebSocket.OPEN) {
        const id = crypto.randomUUID()
        const reply = await new Promise<VoiceReply>((resolve, reject) => {
          const timeout = window.setTimeout(() => { pendingRef.current.delete(id); reject(new Error('Realtime request timed out')) }, REQUEST_TIMEOUT_MS)
          pendingRef.current.set(id, (data) => { window.clearTimeout(timeout); resolve(data) })
          socketRef.current?.send(JSON.stringify({ type: 'voice.request', id, message: trimmedMessage, conversationHistory: history }))
          sessionController.signal.addEventListener('abort', () => { window.clearTimeout(timeout); pendingRef.current.delete(id); reject(new DOMException('Request cancelled', 'AbortError')) }, { once: true })
        })
        if (reply.error) throw new Error(reply.error)
        appendReply(setMessages, messagesRef, reply)
        return
      }
      for (let attempt = 0; attempt <= MAX_RETRIES; attempt += 1) {
        const controller = new AbortController()
        const timeout = window.setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS)
        try {
          const response = await fetch('/api/voice', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ message: trimmedMessage, conversationHistory: history }), signal: controller.signal })
          const data = await response.json().catch(() => null) as VoiceReply | null
          if (!response.ok) throw new Error(data?.error || 'Voice response was unavailable')
          appendReply(setMessages, messagesRef, data || {})
          return
        } catch (requestError) {
          if (attempt === MAX_RETRIES) throw requestError
          await new Promise((resolve) => window.setTimeout(resolve, RETRY_DELAYS_MS[attempt]))
        } finally { window.clearTimeout(timeout) }
      }
    } catch (requestError) {
      if (!(requestError instanceof Error && requestError.name === 'AbortError')) {
        console.error('[v0] Voice agent error:', requestError)
        setError(requestError instanceof Error && requestError.message.includes('Too many') ? requestError.message : 'I couldn\'t reach the reasoning service. Check your connection and try again.')
      }
    } finally {
      if (abortControllerRef.current === sessionController) abortControllerRef.current = null
      setIsLoading(false)
    }
  }, [isLoading])

  const clearMessages = useCallback(() => { messagesRef.current = [initialMessages[0]]; setMessages(messagesRef.current); setError(null) }, [])
  const cancelRequest = useCallback(() => { abortControllerRef.current?.abort(); setIsLoading(false) }, [])
  return { messages, isLoading, error, sendMessage, clearMessages, cancelRequest, transportStatus }
}

export type { Message, TransportStatus }
