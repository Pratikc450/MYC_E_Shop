'use client'

import { useCallback, useRef, useState } from 'react'

type Message = { role: 'assistant' | 'user' | 'system'; text: string; time: string }

const initialMessages: Message[] = [
  { role: 'system', text: 'Session ready. Voice transport is available.', time: '—' },
  {
    role: 'assistant',
    text: 'Hi, I\'m Nova. I can see, hear, and reason with you in real time. What should we explore?',
    time: '—',
  },
]

function now() {
  return new Date().toLocaleTimeString([], { hour12: false })
}

export function useVoiceAgent() {
  const [messages, setMessages] = useState<Message[]>(initialMessages)
  const [isLoading, setIsLoading] = useState(false)
  const messagesRef = useRef(messages)
  const abortControllerRef = useRef<AbortController | null>(null)

  const sendMessage = useCallback(async (userMessage: string) => {
    const trimmedMessage = userMessage.trim()
    if (!trimmedMessage || isLoading) return

    const history = messagesRef.current
      .filter((message) => message.role !== 'system')
      .slice(-12)
      .map(({ role, text }) => ({ role, content: text }))
    const userEntry: Message = { role: 'user', text: trimmedMessage, time: now() }
    const nextMessages = [...messagesRef.current, userEntry]
    messagesRef.current = nextMessages
    setMessages(nextMessages)
    setIsLoading(true)
    abortControllerRef.current?.abort()
    const controller = new AbortController()
    abortControllerRef.current = controller

    let lastError: unknown
    try {
      for (let attempt = 0; attempt < 2; attempt += 1) {
        try {
          const timeout = window.setTimeout(() => controller.abort(), 18_000)
          const response = await fetch('/api/voice', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ message: trimmedMessage, conversationHistory: history }),
            signal: controller.signal,
          })
          window.clearTimeout(timeout)
          if (!response.ok) throw new Error('Voice response was unavailable')
          const data = await response.json()
          const assistantEntry: Message = {
            role: 'assistant',
            text: data.text || 'I\'m ready to continue our conversation.',
            time: data.timestamp || now(),
          }
          const updated = [...messagesRef.current, assistantEntry]
          messagesRef.current = updated
          setMessages(updated)
          return
        } catch (error) {
          lastError = error
          if (controller.signal.aborted || attempt === 1) throw error
          await new Promise((resolve) => window.setTimeout(resolve, 350))
        }
      }
    } catch (error) {
      if (error instanceof Error && error.name !== 'AbortError') {
        console.error('[v0] Voice agent error:', lastError || error)
        const fallback: Message = {
          role: 'assistant',
          text: 'I couldn\'t reach my reasoning service just now. Please try that again.',
          time: now(),
        }
        const updated = [...messagesRef.current, fallback]
        messagesRef.current = updated
        setMessages(updated)
      }
    } finally {
      setIsLoading(false)
    }
  }, [isLoading])

  const clearMessages = useCallback(() => {
    messagesRef.current = [initialMessages[0]]
    setMessages(messagesRef.current)
  }, [])

  const cancelRequest = useCallback(() => {
    abortControllerRef.current?.abort()
    setIsLoading(false)
  }, [])

  return { messages, isLoading, sendMessage, clearMessages, cancelRequest }
}
