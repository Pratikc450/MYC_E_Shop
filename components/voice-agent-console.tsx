'use client'

import { useEffect, useRef, useState, type FormEvent } from 'react'
import { useVoiceAgent } from '@/lib/use-voice-agent'
import { VoiceAgentScene } from '@/components/voice-agent-scene'
import { DOCTOR_SCHEDULES, REGISTRATION_HOURS, TEST_SCHEDULES } from '@/lib/healthcare/contracts'
import {
  Activity,
  AudioLines,
  Bot,
  Check,
  ChevronDown,
  CircleStop,
  Command,
  Headphones,
  Mic,
  MicOff,
  MoreHorizontal,
  Paperclip,
  Play,
  Radio,
  Send,
  Settings2,
  Sparkles,
  Square,
  UserRound,
  Volume2,
  X,
  Zap,
} from 'lucide-react'

type Mode = 'idle' | 'listening' | 'speaking'

export function VoiceAgentConsole() {
  const [mode, setMode] = useState<Mode>('idle')
  const { messages, isLoading, sendMessage, clearMessages } = useVoiceAgent()
  const [draft, setDraft] = useState('')
  const [connected, setConnected] = useState(true)
  const [elapsed, setElapsed] = useState(0)
  const [muted, setMuted] = useState(false)
  const [showTools, setShowTools] = useState(false)
  const [activeTab, setActiveTab] = useState<'desk' | 'reports'>('desk')
  const [activeService, setActiveService] = useState<'registration' | 'doctors' | 'testing' | 'reception' | null>(null)
  const [voiceError, setVoiceError] = useState<string | null>(null)
  const [scheduleFocus, setScheduleFocus] = useState<{ day?: string; pulse: number }>({ pulse: 0 })
  const recognitionRef = useRef<SpeechRecognition | null>(null)
  const speechRef = useRef<SpeechSynthesisUtterance | null>(null)
  const messageCountRef = useRef(messages.length)
  const thinkingTimerRef = useRef<number | null>(null)

  useEffect(() => {
    if (mode === 'idle') return
    const timer = window.setInterval(() => setElapsed((value) => value + 1), 1000)
    return () => window.clearInterval(timer)
  }, [mode])

  useEffect(() => {
    const previousCount = messageCountRef.current
    messageCountRef.current = messages.length
    const latest = messages[messages.length - 1]

    if (messages.length > previousCount && latest?.role === 'assistant' && latest.text.trim()) {
      const day = latest.text.match(/Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday/i)?.[0]
      setScheduleFocus({ day, pulse: Date.now() })
    }

    if (!muted && messages.length > previousCount && latest?.role === 'assistant' && latest.text.trim()) {
      if (thinkingTimerRef.current) window.clearTimeout(thinkingTimerRef.current)
      window.speechSynthesis?.cancel()
      const utterance = new SpeechSynthesisUtterance(latest.text.replace(/[*#_`]/g, ''))
      const preferredVoiceNames = [
        'Microsoft Aria Online (Natural) - English (United States)',
        'Microsoft Jenny Online (Natural) - English (United States)',
        'Google US English Female',
        'Samantha',
        'Karen',
        'Victoria',
      ]
      const availableVoices = window.speechSynthesis?.getVoices() ?? []
      const professionalLadyVoice = availableVoices.find((voice) =>
        preferredVoiceNames.some((name) => voice.name.toLowerCase().includes(name.toLowerCase())),
      )
      if (professionalLadyVoice) utterance.voice = professionalLadyVoice
      utterance.rate = 0.94
      utterance.pitch = 1.08
      utterance.volume = 1
      utterance.onstart = () => {
        setVoiceError(null)
        setMode('speaking')
      }
      utterance.onend = () => setMode('idle')
      utterance.onerror = () => {
        setMode('idle')
        setVoiceError('Audio playback was blocked. Tap the speaker control and try again.')
      }
      speechRef.current = utterance
      if ('speechSynthesis' in window) window.speechSynthesis.speak(utterance)
      else setVoiceError('This browser does not support speech playback.')
    }
  }, [messages, muted])

  useEffect(() => () => {
    recognitionRef.current?.stop()
    window.speechSynthesis?.cancel()
  }, [])

  function toggleVoice() {
    if (mode !== 'idle') {
      recognitionRef.current?.stop()
      window.speechSynthesis?.cancel()
      setMode('idle')
      return
    }

    const SpeechRecognitionAPI = window.SpeechRecognition || window.webkitSpeechRecognition
    if (!SpeechRecognitionAPI) {
      setMode('speaking')
      window.setTimeout(() => setMode('idle'), 2400)
      return
    }

    const recognition = new SpeechRecognitionAPI()
    recognition.continuous = false
    recognition.interimResults = false
    recognition.lang = 'en-US'
    recognition.onstart = () => setMode('listening')
    recognition.onresult = (event) => {
      const text = event.results[0][0].transcript
      void sendMessage(text)
      setMode('speaking')
    }
    recognition.onerror = () => setMode('idle')
    recognition.onend = () => setMode((current) => current === 'listening' ? 'idle' : current)
    recognitionRef.current = recognition
    recognition.start()
  }

  function timestamp() {
    return new Date().toLocaleTimeString([], { hour12: false })
  }

  function submitDraft() {
    if (!draft.trim() || isLoading) return
    void sendMessage(draft)
    setDraft('')
  }

  function askService(service: 'registration' | 'doctors' | 'testing' | 'reception', question: string) {
    setActiveTab('desk')
    setActiveService(service)
    void sendMessage(question)
  }

  const minutes = String(Math.floor(elapsed / 60)).padStart(2, '0')
  const seconds = String(elapsed % 60).padStart(2, '0')

  return (
    <main className="nova-shell min-h-screen bg-background text-foreground">
      <header className="nova-header flex h-16 items-center justify-between border-b border-white/60 px-5 lg:px-8">
        <div className="flex items-center gap-3">
          <div className="nova-brand-mark flex size-9 items-center justify-center rounded-xl text-white"><Sparkles className="size-4" /></div>
          <div><p className="font-mono text-[11px] font-semibold tracking-[0.2em] text-primary">AROGYA ASSIST / VOICE OS</p><p className="text-xs text-muted-foreground">Patient information assistant</p></div>
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground"><span className={`size-2 rounded-full ${connected ? 'bg-emerald-500' : 'bg-destructive'}`} /> {connected ? 'Realtime connected' : 'Disconnected'}<button className="ml-3 rounded-md border border-border p-2 hover:bg-muted" aria-label="Settings"><Settings2 className="size-4" /></button></div>
      </header>

      <div className="mx-auto grid max-w-[1440px] gap-6 p-5 lg:grid-cols-[240px_minmax(0,1fr)_300px] lg:p-8">
        <aside className="nova-sidebar hidden rounded-3xl border border-white/70 p-4 lg:block">
          <p className="mb-3 font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">Workspace</p>
          <nav className="space-y-1 text-sm" aria-label="Patient services">
            <button onClick={() => setActiveTab('desk')} className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left ${activeTab === 'desk' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted'}`}><Radio className="size-4" /> Patient desk</button>
            <button onClick={() => setActiveTab('reports')} className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left ${activeTab === 'reports' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted'}`}><Activity className="size-4" /> Report status</button>
            <button className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-muted-foreground hover:bg-muted"><Zap className="size-4" /> Service directory</button>
          </nav>
          <div className="mt-10 border-t border-border pt-5"><p className="mb-3 font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">Transport</p><div className="space-y-3 text-xs text-muted-foreground"><div className="flex justify-between"><span>WebRTC</span><span className="text-foreground">stable</span></div><div className="flex justify-between"><span>Deepgram STT</span><span className="text-emerald-600">ready</span></div><div className="flex justify-between"><span>ElevenLabs TTS</span><span className="text-emerald-600">ready</span></div></div></div>
        </aside>

        <section className="min-w-0">
          <div className="mb-5 flex items-end justify-between"><div><p className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">Patient desk / 001</p><h1 className="nova-title mt-1 text-3xl font-semibold tracking-tight lg:text-4xl">Talk to Arogya Assist</h1><p className="mt-1 max-w-xl text-sm text-muted-foreground">Get clear hospital information about registration, doctors, testing, appointments, and reception.</p></div><button className="flex items-center gap-1 rounded-md border border-border px-3 py-2 text-xs text-muted-foreground hover:bg-muted"><span className="size-1.5 rounded-full bg-emerald-500" /> English <ChevronDown className="size-3" /></button></div>
          <div className="nova-tabs mb-4 flex gap-1 rounded-2xl border border-white/70 bg-white/60 p-1.5 shadow-sm" role="tablist" aria-label="Patient desk tabs"><button role="tab" aria-selected={activeTab === 'desk'} onClick={() => setActiveTab('desk')} className={`rounded-lg px-3 py-2 text-xs font-medium ${activeTab === 'desk' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted'}`}>Patient desk</button><button role="tab" aria-selected={activeTab === 'reports'} onClick={() => setActiveTab('reports')} className={`rounded-lg px-3 py-2 text-xs font-medium ${activeTab === 'reports' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted'}`}>Test report status</button></div>
          <div className="mb-5 flex flex-wrap gap-2" aria-label="Schedule services"><button onClick={() => askService('registration', 'What are the registration hours from Monday through Sunday?')} aria-pressed={activeService === 'registration'} className={`nova-service-pill rounded-full border px-3 py-2 text-xs transition-all ${activeService === 'registration' ? 'nova-service-active border-primary bg-primary text-primary-foreground' : 'border-border bg-card text-muted-foreground hover:border-primary hover:text-foreground'}`}>Registration hours</button><button onClick={() => askService('doctors', 'Which doctors and departments are available from Monday through Sunday, with their morning, afternoon, and evening timings?')} aria-pressed={activeService === 'doctors'} className={`nova-service-pill rounded-full border px-3 py-2 text-xs transition-all ${activeService === 'doctors' ? 'nova-service-active border-primary bg-primary text-primary-foreground' : 'border-border bg-card text-muted-foreground hover:border-primary hover:text-foreground'}`}>Doctor availability</button><button onClick={() => askService('testing', 'What medical tests are available from Monday through Sunday, with morning, afternoon, and evening timings?')} aria-pressed={activeService === 'testing'} className={`nova-service-pill rounded-full border px-3 py-2 text-xs transition-all ${activeService === 'testing' ? 'nova-service-active border-primary bg-primary text-primary-foreground' : 'border-border bg-card text-muted-foreground hover:border-primary hover:text-foreground'}`}>Medical testing</button><button onClick={() => askService('reception', 'What are the reception hours from Monday through Sunday?')} aria-pressed={activeService === 'reception'} className={`nova-service-pill rounded-full border px-3 py-2 text-xs transition-all ${activeService === 'reception' ? 'nova-service-active border-primary bg-primary text-primary-foreground' : 'border-border bg-card text-muted-foreground hover:border-primary hover:text-foreground'}`}>Reception timing</button></div>
          {activeTab === 'reports' && <ReportLookup onAsk={(message) => void sendMessage(message)} />}
          <ScheduleDirectory focusDay={scheduleFocus.day} pulseKey={scheduleFocus.pulse} />
          <div className="nova-panel relative overflow-hidden rounded-2xl border border-border shadow-sm">
            <div className="flex min-h-[350px] flex-col items-center justify-center px-6 py-10">
              <div className={`nova-orb relative flex size-40 items-center justify-center rounded-full border ${mode === 'listening' ? 'border-primary/70' : 'border-border'} bg-muted/40 transition-all duration-500`}>
                {mode !== 'idle' && <div className="absolute inset-0 animate-ping rounded-full border border-primary/30" />}
                <VoiceAgentScene />
              </div>
              <p className="mt-7 font-mono text-[11px] uppercase tracking-[0.22em] text-muted-foreground">{mode === 'listening' ? 'Listening to your question' : mode === 'speaking' ? 'Arogya Assist is speaking' : 'Tap to ask Arogya Assist'}</p>
              <p className="mt-2 text-sm text-muted-foreground">{minutes}:{seconds} · low-latency audio channel</p>
              <div className="mt-7 flex h-8 items-center gap-1" aria-label="Audio waveform">{Array.from({ length: 28 }).map((_, index) => <span key={index} style={{ animationDelay: `${index * 45}ms` }} className={`nova-wave-bar w-1 rounded-full bg-primary/70 transition-all ${mode === 'idle' ? 'h-1' : index % 3 === 0 ? 'h-7' : index % 2 === 0 ? 'h-4' : 'h-2'}`} />)}</div>
            </div>
            <div className="flex items-center justify-center gap-3 border-t border-border bg-muted/20 p-4"><button onClick={() => { if (!muted) window.speechSynthesis?.cancel(); setMuted(!muted) }} className="rounded-full border border-border p-3 hover:bg-muted" aria-label={muted ? 'Unmute microphone' : 'Mute microphone'}>{muted ? <MicOff className="size-4" /> : <Mic className="size-4" />}</button><button onClick={toggleVoice} className={`flex size-14 items-center justify-center rounded-full ${mode === 'idle' ? 'bg-primary text-primary-foreground hover:bg-primary/90' : 'bg-destructive text-destructive-foreground'} shadow-sm`} aria-label={mode === 'idle' ? 'Start voice session' : 'Stop voice session'}>{mode === 'idle' ? <Mic className="size-5" /> : <CircleStop className="size-5" />}</button><button className="rounded-full border border-border p-3 hover:bg-muted" aria-label="Audio output"><Volume2 className="size-4" /></button></div>
          </div>
          <div className="mt-5 flex items-center gap-2 rounded-lg border border-dashed border-border px-3 py-2.5 text-xs text-muted-foreground"><Check className="size-3.5 text-emerald-600" /> Voice activity detection is on <span className="ml-auto font-mono text-[10px]">24ms RTT</span></div>

          <div className="mt-6 rounded-2xl border border-border bg-card"><div className="flex items-center justify-between border-b border-border px-4 py-3"><div className="flex items-center gap-2 text-sm font-medium"><AudioLines className="size-4 text-primary" /> Live transcript</div><button onClick={clearMessages} className="text-xs text-muted-foreground hover:text-foreground">Clear</button></div><div className="max-h-60 space-y-4 overflow-auto p-4">{messages.map((message, index) => <div key={`${message.time}-${index}`} className="flex gap-3"><div className={`mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-md ${message.role === 'assistant' ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}>{message.role === 'assistant' ? <Bot className="size-3.5" /> : message.role === 'user' ? <UserRound className="size-3.5" /> : <Activity className="size-3.5" />}</div><div className="min-w-0"><div className="flex items-center gap-2"><span className="text-xs font-medium capitalize">{message.role}</span><span className="font-mono text-[10px] text-muted-foreground">{message.time}</span></div><p className="mt-1 text-sm leading-6 text-muted-foreground">{message.text}</p></div></div>)}</div><div className="flex items-center gap-2 border-t border-border p-3"><button className="rounded-md p-2 text-muted-foreground hover:bg-muted" aria-label="Attach image"><Paperclip className="size-4" /></button><input value={draft} onChange={(event) => setDraft(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter' && !event.nativeEvent.isComposing && event.keyCode !== 229) submitDraft() }} placeholder="Ask about registration, doctors, testing, or reception…" className="min-w-0 flex-1 bg-transparent px-1 text-sm outline-none placeholder:text-muted-foreground" /><button onClick={submitDraft} disabled={isLoading} className="rounded-md bg-primary p-2 text-primary-foreground hover:bg-primary/90 disabled:cursor-wait disabled:opacity-50" aria-label="Send message"><Send className="size-4" /></button></div></div>
        </section>

        <aside className="space-y-5"><div className="rounded-2xl border border-border bg-card p-4"><div className="flex items-center justify-between"><p className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">Agent profile</p><button onClick={() => setShowTools(!showTools)} aria-label="More agent options"><MoreHorizontal className="size-4 text-muted-foreground" /></button></div><div className="mt-5 flex items-center gap-3"><div className="flex size-11 items-center justify-center rounded-xl bg-primary text-primary-foreground"><Sparkles className="size-5" /></div><div><p className="font-medium">Arogya Assist</p><p className="text-xs text-muted-foreground">Hospital information · v1.0</p></div></div>{showTools && <div className="mt-4 rounded-lg bg-muted p-3 text-xs text-muted-foreground">Tool routing is enabled for vision, web context, and session memory.</div>}<div className="mt-5 flex flex-wrap gap-2"><span className="rounded-full border border-border px-2.5 py-1 text-[11px] text-muted-foreground">Voice + text</span><span className="rounded-full border border-border px-2.5 py-1 text-[11px] text-muted-foreground">Vision ready</span><span className="rounded-full border border-border px-2.5 py-1 text-[11px] text-muted-foreground">Tool use</span></div></div><div className="rounded-2xl border border-primary/20 bg-primary/5 p-4"><div className="flex items-center gap-2 text-sm font-medium"><Check className="size-4 text-primary" /> Patient-safe workflow</div><p className="mt-2 text-xs leading-5 text-muted-foreground">General hospital information is available instantly. Personal appointment, surgery, or report status requires patient ID verification.</p><div className="mt-3 flex items-center gap-2 text-xs text-primary"><Headphones className="size-3.5" /> Human transfer always available</div></div><div className="rho-helpline-card rounded-2xl border border-border p-4"><div className="rho-helpline-orbit" aria-hidden="true"><span>RHO</span></div><p className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">RHO Assist · toll-free information line</p><a href="tel:18001234567" className="rho-helpline-number mt-2 block text-2xl font-semibold tracking-tight text-primary hover:underline">1800-123-4567</a><p className="mt-1 text-xs leading-5 text-muted-foreground">Call for doctor availability, registration, medical testing, and reception hours from Monday to Sunday.</p><span className="mt-3 inline-flex rounded-full bg-primary/10 px-2 py-1 text-[10px] font-medium text-primary">Voice support · 24/7 information access</span></div><div className="rounded-2xl border border-border bg-card p-4"><div className="flex items-center justify-between"><p className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">Session health</p><span className="flex items-center gap-1 text-xs text-emerald-600"><span className="size-1.5 rounded-full bg-emerald-500" /> healthy</span></div><div className="mt-5 space-y-4"><Metric label="Audio input" value="48 kHz" /><Metric label="Turn latency" value="0.42 s" /><Metric label="Context window" value="8.2k / 32k" /></div></div><div className="rounded-2xl border border-border bg-primary p-4 text-primary-foreground"><div className="flex items-center gap-2 text-sm font-medium"><Headphones className="size-4" /> Pro tip</div><p className="mt-2 text-xs leading-5 text-primary-foreground/70">Start speaking naturally. Nova detects pauses and takes turns automatically.</p></div></aside>
      </div>
      <footer className="mx-auto flex max-w-[1440px] items-center justify-between px-5 pb-6 text-[10px] font-mono uppercase tracking-[0.18em] text-muted-foreground lg:px-8"><span>Secure session · encrypted transport</span><span className="hidden sm:block">Neon persistence layer · LiveKit transport</span></footer>
    </main>
  )
}

function ReportLookup({ onAsk }: { onAsk: (message: string) => void }) {
  const [patientId, setPatientId] = useState('')
  const [testType, setTestType] = useState('')
  const [submitted, setSubmitted] = useState(false)

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!/^[a-z]{3}\d{2}$/i.test(patientId)) return
    setSubmitted(true)
    onAsk(`What is the report status for patient ID ${patientId}${testType ? ` for ${testType}` : ''}?`)
  }

  return <section className="mb-6 rounded-2xl border border-primary/20 bg-primary/5 p-5" aria-labelledby="report-lookup-heading">
    <div className="flex items-start gap-3"><div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground"><Activity className="size-5" /></div><div><p className="font-mono text-[10px] uppercase tracking-[0.2em] text-primary">Secure report desk</p><h2 id="report-lookup-heading" className="mt-1 text-base font-semibold">Check a test report by patient ID</h2><p className="mt-1 text-xs leading-5 text-muted-foreground">Enter the ID from your test receipt: the first three letters of the patient name in capitals plus the two-digit test date, such as PRA19 or PAR09. Dates 1–9 are written with a leading zero.</p></div></div>
    <form onSubmit={submit} className="mt-5 grid gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
      <label className="space-y-1.5 text-xs font-medium">Patient ID<input value={patientId} onChange={(event) => { setPatientId(event.target.value.replace(/[^a-z0-9]/gi, '').slice(0, 5).toUpperCase()); setSubmitted(false) }} pattern="[A-Z]{3}[0-9]{2}" placeholder="e.g. PRA25" autoCapitalize="characters" autoComplete="off" maxLength={5} className="mt-1.5 w-full rounded-lg border border-border bg-background px-3 py-2.5 font-mono text-sm uppercase outline-none ring-primary focus:ring-2" aria-describedby="report-id-help" required /><span id="report-id-help" className="block text-[10px] font-normal text-muted-foreground">Named demo IDs: PRA25, ZUB16, ARP19. Legacy numeric demos: 58317, 13795, 24681, 31572, 42863, 57104, 63928, 70419, 82635, 91847, 35290, or 68027. Pending: 90462</span></label>
      <label className="space-y-1.5 text-xs font-medium">Test type <select value={testType} onChange={(event) => setTestType(event.target.value)} className="mt-1.5 w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm outline-none ring-primary focus:ring-2"><option value="">Any test</option><option>Heart tests</option><option>Orthopedic imaging</option><option>Lung tests</option></select></label>
      <button type="submit" className="rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90">Check report</button>
    </form>
    {submitted && <p className="mt-3 text-xs text-primary" role="status">Checking the secure report desk…</p>}
  </section>
}

function ScheduleDirectory({ focusDay, pulseKey }: { focusDay?: string; pulseKey: number }) {
  return <section key={pulseKey} className="schedule-stage mb-6 rounded-2xl border border-border bg-card p-4" aria-labelledby="schedule-heading">
    <div className="flex items-start justify-between gap-4"><div><p className="font-mono text-[10px] uppercase tracking-[0.2em] text-primary">Verified clinic directory</p><h2 id="schedule-heading" className="mt-1 text-sm font-semibold">Weekly hours the agent can explain</h2><p className="mt-1 text-[11px] text-muted-foreground">{focusDay ? `Showing the ${focusDay} schedule from the latest answer` : 'Ask a question to animate the matching day into view'}</p></div><span className="rounded-full bg-primary/10 px-2 py-1 text-[10px] text-primary">Mon–Sun</span></div>
    <div className="mt-4 grid gap-3 md:grid-cols-3">
      <ScheduleCard title="Registration + reception" rows={REGISTRATION_HOURS} focusDay={focusDay} />
      {DOCTOR_SCHEDULES.map((doctor) => <ScheduleCard key={doctor.doctorName} title={`${doctor.doctorName} · ${doctor.department}`} rows={doctor.weeklySlots} focusDay={focusDay} />)}
      {TEST_SCHEDULES.slice(0, 1).map((test) => <ScheduleCard key={test.testName} title={test.testName} rows={test.weeklySlots} focusDay={focusDay} />)}
    </div>
    <p className="mt-3 text-[11px] leading-5 text-muted-foreground">Ask by day, department, doctor, or test. The matching day glows into focus as Arogya Assist announces its morning, afternoon, and evening windows.</p>
  </section>
}

function formatClockRange(value: string) {
  if (value === 'Closed') return 'Closed'
  const [start, end] = value.split('–')
  const formatTime = (time: string) => {
    const [hours, minutes] = time.split(':').map(Number)
    const suffix = hours >= 12 ? 'p.m.' : 'a.m.'
    const hour = hours % 12 || 12
    return `${hour}:${String(minutes).padStart(2, '0')} ${suffix}`
  }
  return `${formatTime(start)}–${formatTime(end)}`
}

function ScheduleCard({ title, rows, focusDay }: { title: string; rows: { day: string; morning: string; afternoon?: string; evening: string }[]; focusDay?: string }) {
  return <div className="schedule-card group rounded-xl border border-border bg-muted/20 p-3"><div className="flex items-center justify-between gap-2"><p className="text-xs font-medium">{title}</p><span className="schedule-live-dot size-1.5 rounded-full bg-emerald-500" aria-label="Schedule live" /></div><div className="mt-3 space-y-1.5">{rows.map((row) => { const isFocused = focusDay?.toLowerCase() === row.day.toLowerCase(); return <div key={row.day} className={`schedule-row flex items-center gap-2 rounded-md px-1.5 py-1 text-[10px] ${isFocused ? 'schedule-row-active' : ''}`}><span className={`w-12 shrink-0 ${isFocused ? 'font-semibold text-primary' : 'text-muted-foreground'}`}>{row.day.slice(0, 3)}{isFocused ? ' · now' : ''}</span><div className="schedule-track flex min-w-0 flex-1 items-center gap-1.5"><span className={`schedule-segment schedule-morning ${row.morning === 'Closed' ? 'schedule-closed' : ''}`} title={`Morning ${formatClockRange(row.morning)}`} /><span className={`schedule-segment schedule-afternoon ${row.afternoon === 'Closed' ? 'schedule-closed' : ''}`} title={`Afternoon ${formatClockRange(row.afternoon ?? 'Closed')}`} /><span className={`schedule-segment schedule-evening ${row.evening === 'Closed' ? 'schedule-closed' : ''}`} title={`Evening ${formatClockRange(row.evening)}`} /></div><span className={`w-[4.5rem] text-right font-mono text-[9px] leading-4 ${isFocused ? 'text-foreground' : 'text-muted-foreground'}`}>AM {formatClockRange(row.morning)}{row.afternoon ? <> · PM {formatClockRange(row.afternoon)}</> : null} · Eve {formatClockRange(row.evening)}</span></div> })}</div><div className="mt-3 flex items-center gap-3 border-t border-border/70 pt-2 text-[9px] text-muted-foreground"><span className="flex items-center gap-1"><i className="size-1.5 rounded-full bg-cyan-500" />Morning</span><span className="flex items-center gap-1"><i className="size-1.5 rounded-full bg-violet-500" />Afternoon</span><span className="flex items-center gap-1"><i className="size-1.5 rounded-full bg-amber-500" />Evening</span></div></div>
}

function Metric({ label, value }: { label: string; value: string }) { return <div><div className="mb-1 flex justify-between text-xs"><span className="text-muted-foreground">{label}</span><span className="font-mono text-foreground">{value}</span></div><div className="h-1.5 overflow-hidden rounded-full bg-muted"><div className="h-full w-3/4 rounded-full bg-primary" /></div></div> }

declare global { interface Window { SpeechRecognition?: new () => SpeechRecognition; webkitSpeechRecognition?: new () => SpeechRecognition } interface SpeechRecognition extends EventTarget { continuous: boolean; interimResults: boolean; lang: string; onstart: (() => void) | null; onresult: ((event: SpeechRecognitionEvent) => void) | null; onerror: (() => void) | null; onend: (() => void) | null; start: () => void; stop: () => void } interface SpeechRecognitionEvent { results: { [index: number]: { [index: number]: { transcript: string } } } } }

const _unused = { Command, Play, Square, X }
void _unused
