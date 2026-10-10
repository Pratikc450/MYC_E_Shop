'use client'

import { useCallback, useEffect, useRef, useState } from 'react'

const REQUEST_TIMEOUT_MS = 12_000
const MAX_RETRIES = 2
const RETRY_DELAYS_MS = [250, 600]

type Message = { role: 'assistant' | 'user' | 'system'; text: string; time: string }

const initialMessages: Message[] = [
  { role: 'system', text: 'Session ready. Voice transport is available.', time: '—' },
  { role: 'assistant', text: "Hi, I'm Nova. I can see, hear, and reason with you in real time. What should we explore?", time: '—' },
]
function now() { return new Date().toLocaleTimeString([], { hour12: false }) }

export function useVoiceAgent() {
  const [messages, setMessages] = useState<Message[]>(initialMessages)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const messagesRef = useRef(messages)
  const abortControllerRef = useRef<AbortController | null>(null)

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
    let lastError: unknown

    try {
      for (let attempt = 0; attempt <= MAX_RETRIES; attempt += 1) {
        if (sessionController.signal.aborted) throw new DOMException('Request cancelled', 'AbortError')
        const attemptController = new AbortController()
        const onCancel = () => attemptController.abort()
        sessionController.signal.addEventListener('abort', onCancel, { once: true })
        const timeout = window.setTimeout(() => attemptController.abort(), REQUEST_TIMEOUT_MS)
        try {
          const response = await fetch('/api/voice', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ message: trimmedMessage, conversationHistory: history }), signal: attemptController.signal })
          if (!response.ok) { const detail = await response.json().catch(() => null); throw new Error(detail?.error || 'Voice response was unavailable') }
          const data = await response.json()
          const assistantEntry: Message = { role: 'assistant', text: data.text || 'I\'m ready to continue our conversation.', time: data.timestamp || now() }
          const updated = [...messagesRef.current, assistantEntry]
          messagesRef.current = updated
          setMessages(updated)
          return
        } catch (requestError) {
          lastError = requestError
          if (sessionController.signal.aborted || attempt === MAX_RETRIES) throw requestError
          await new Promise((resolve) => window.setTimeout(resolve, RETRY_DELAYS_MS[attempt]))
        } finally {
          window.clearTimeout(timeout)
          sessionController.signal.removeEventListener('abort', onCancel)
        }
      }
    } catch (requestError) {
      if (!(requestError instanceof Error && requestError.name === 'AbortError')) {
        const message = requestError instanceof Error ? requestError.message : 'Network error. Please try again.'
        console.error('[v0] Voice agent error:', lastError || requestError)
        setError(message.includes('Too many') ? message : 'I couldn\'t reach the reasoning service. Check your connection and try again.')
      }
    } finally {
      if (abortControllerRef.current === sessionController) abortControllerRef.current = null
      setIsLoading(false)
    }
  }, [isLoading])

  const clearMessages = useCallback(() => { messagesRef.current = [initialMessages[0]]; setMessages(messagesRef.current); setError(null) }, [])
  const cancelRequest = useCallback(() => { abortControllerRef.current?.abort(); setIsLoading(false) }, [])
  return { messages, isLoading, error, sendMessage, clearMessages, cancelRequest }
}

export type { Message }
