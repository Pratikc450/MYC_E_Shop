'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { Activity, ArrowLeft, CalendarDays, CheckCircle2, Clock3, FlaskConical, Stethoscope, UserRound, Wifi } from 'lucide-react'
import { DOCTOR_SCHEDULES, REGISTRATION_HOURS, TEST_SCHEDULES } from '@/lib/healthcare/contracts'

type RuntimeStatus = { environment: string; version: string; checkedAt: string; services: Array<{ name: string; status: 'ready' | 'degraded' | 'offline'; detail: string }> }

type ActivityItem = { time: string; title: string; detail: string; status: 'Live' | 'Scheduled' | 'Closed'; icon: typeof UserRound }

const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']

function getCurrentDay() {
  return new Intl.DateTimeFormat('en-US', { weekday: 'long' }).format(new Date())
}

function getActivities(day: string): ActivityItem[] {
  const registration = REGISTRATION_HOURS.find((row) => row.day === day)
  const doctor = DOCTOR_SCHEDULES[0]?.weeklySlots.find((row) => row.day === day)
  const test = TEST_SCHEDULES[0]?.weeklySlots.find((row) => row.day === day)
  return [
    { time: registration?.morning ?? 'Closed', title: 'Registration and reception', detail: 'New patient registration, reception, and general enquiries', status: registration?.morning === 'Closed' ? 'Closed' : 'Live', icon: UserRound },
    { time: doctor?.morning ?? 'Closed', title: DOCTOR_SCHEDULES[0]?.doctorName ?? 'Doctor consultation', detail: `${DOCTOR_SCHEDULES[0]?.department ?? 'Outpatient'} appointments and consultations`, status: doctor?.morning === 'Closed' ? 'Closed' : 'Scheduled', icon: Stethoscope },
    { time: test?.morning ?? 'Closed', title: TEST_SCHEDULES[0]?.testName ?? 'Medical testing', detail: 'Diagnostic sample collection and test desk service', status: test?.morning === 'Closed' ? 'Closed' : 'Scheduled', icon: FlaskConical },
  ]
}

export default function ServiceDirectoryPage() {
  const [selectedDay, setSelectedDay] = useState(getCurrentDay())
  const [lastUpdated, setLastUpdated] = useState(new Date())
  const [runtime, setRuntime] = useState<RuntimeStatus | null>(null)
  const [apiOnline, setApiOnline] = useState(false)

  useEffect(() => {
    let active = true
    const refresh = async () => {
      const [health, sandbox] = await Promise.allSettled([
        fetch('/api/health', { cache: 'no-store' }),
        fetch('/api/sandbox/status', { cache: 'no-store' }),
      ])
      if (!active) return
      setApiOnline(health.status === 'fulfilled' && health.value.ok)
      if (sandbox.status === 'fulfilled' && sandbox.value.ok) setRuntime(await sandbox.value.json())
      setLastUpdated(new Date())
    }
    void refresh()
    const timer = window.setInterval(refresh, 5000)
    return () => { active = false; window.clearInterval(timer) }
  }, [])

  const activities = useMemo(() => getActivities(selectedDay), [selectedDay])
  const readyServices = runtime?.services.filter((service) => service.status === 'ready').length ?? 0

  return (
    <main className="nova-shell min-h-screen bg-background text-foreground">
      <header className="nova-header flex min-h-16 items-center justify-between border-b border-white/60 px-5 py-3 lg:px-8">
        <div className="flex items-center gap-3"><div className="nova-brand-mark flex size-9 items-center justify-center rounded-xl text-white"><Activity className="size-4" /></div><div><p className="font-mono text-[11px] font-semibold tracking-[0.2em] text-primary">AROGYA ASSIST / SERVICE DIRECTORY</p><p className="text-xs text-muted-foreground">Live centre operations and weekly availability</p></div></div>
        <Link href="/" className="flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-xs font-medium hover:bg-muted"><ArrowLeft className="size-3.5" /> Patient desk</Link>
      </header>

      <div className="mx-auto max-w-[1440px] p-5 lg:p-8">
        <section className="rounded-3xl border border-primary/20 bg-gradient-to-br from-primary/[0.1] via-card to-accent p-6 shadow-sm lg:p-8">
          <div className="flex flex-col justify-between gap-6 lg:flex-row lg:items-end"><div><p className="font-mono text-[10px] uppercase tracking-[0.22em] text-primary">Operations / live view</p><h1 className="nova-title mt-2 text-3xl font-semibold tracking-tight lg:text-5xl">Service directory</h1><p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">A single, real-time view of daily registration, doctor appointments, diagnostics, and reception activity across the centre.</p></div><div className="flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-medium text-emerald-700"><span className="size-2 animate-pulse rounded-full bg-emerald-500" /> {apiOnline ? 'Live updates connected' : 'Reconnecting to live updates'}</div></div>
          <div className="mt-7 grid gap-3 sm:grid-cols-3"><div className="rounded-2xl border border-white/70 bg-background/70 p-4"><Wifi className="size-4 text-primary" /><p className="mt-3 text-2xl font-semibold">{readyServices}/{runtime?.services.length ?? 4}</p><p className="text-xs text-muted-foreground">Runtime services ready</p></div><div className="rounded-2xl border border-white/70 bg-background/70 p-4"><CalendarDays className="size-4 text-primary" /><p className="mt-3 text-2xl font-semibold">7 days</p><p className="text-xs text-muted-foreground">Weekly activity coverage</p></div><div className="rounded-2xl border border-white/70 bg-background/70 p-4"><Clock3 className="size-4 text-primary" /><p className="mt-3 text-2xl font-semibold">5 sec</p><p className="text-xs text-muted-foreground">Status refresh interval</p></div></div>
        </section>

        <section className="mt-6 rounded-2xl border border-border bg-card p-4" aria-labelledby="daily-heading"><div className="flex flex-wrap items-start justify-between gap-3"><div><p className="font-mono text-[10px] uppercase tracking-[0.2em] text-primary">Daily service activity</p><h2 id="daily-heading" className="mt-1 text-lg font-semibold">Day-by-day centre status</h2></div><p className="text-xs text-muted-foreground" aria-live="polite">Updated {lastUpdated.toLocaleTimeString([], { hour12: false })}</p></div><div className="mt-5 flex gap-2 overflow-x-auto pb-1">{days.map((day) => <button key={day} onClick={() => setSelectedDay(day)} aria-pressed={selectedDay === day} className={`whitespace-nowrap rounded-full border px-3 py-2 text-xs font-medium transition ${selectedDay === day ? 'border-primary bg-primary text-primary-foreground' : 'border-border text-muted-foreground hover:border-primary hover:text-foreground'}`}>{day.slice(0, 3)}<span className="hidden sm:inline"> · {day === getCurrentDay() ? 'Today' : 'weekly view'}</span></button>)}</div><div className="mt-5 grid gap-3 lg:grid-cols-3">{activities.map((item) => { const Icon = item.icon; return <article key={item.title} className="rounded-2xl border border-border bg-muted/20 p-4"><div className="flex items-start justify-between gap-3"><div className="flex items-center gap-3"><div className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary"><Icon className="size-4" /></div><div><h3 className="text-sm font-semibold">{item.title}</h3><p className="mt-1 text-xs text-muted-foreground">{item.detail}</p></div></div><span className={`rounded-full px-2 py-1 text-[10px] font-medium ${item.status === 'Live' ? 'bg-emerald-100 text-emerald-700' : item.status === 'Scheduled' ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'}`}>{item.status}</span></div><div className="mt-5 flex items-center gap-2 border-t border-border/70 pt-3 text-xs"><Clock3 className="size-3.5 text-muted-foreground" /><span className="font-mono">{item.time}</span></div></article> })}</div></section>

        <section className="mt-6 grid gap-6 lg:grid-cols-[1.2fr_0.8fr]"><div className="rounded-2xl border border-border bg-card p-5"><div className="flex items-center justify-between"><div><p className="font-mono text-[10px] uppercase tracking-[0.2em] text-primary">Runtime control plane</p><h2 className="mt-1 text-base font-semibold">Connected service layers</h2></div><CheckCircle2 className="size-5 text-emerald-600" /></div><div className="mt-4 grid gap-2 sm:grid-cols-2">{(runtime?.services ?? []).map((service) => <div key={service.name} className="rounded-xl border border-border p-3"><div className="flex items-center gap-2 text-xs font-medium"><span className={`size-1.5 rounded-full ${service.status === 'ready' ? 'bg-emerald-500' : service.status === 'degraded' ? 'bg-amber-500' : 'bg-destructive'}`} />{service.name}</div><p className="mt-1 text-[11px] leading-4 text-muted-foreground">{service.detail}</p></div>)}</div><p className="mt-4 text-[10px] text-muted-foreground">Environment: {runtime?.environment ?? 'sandbox'} · version {runtime?.version ?? 'checking'} · polling every 5 seconds</p></div><div className="rounded-2xl border border-primary/20 bg-primary/5 p-5"><p className="font-mono text-[10px] uppercase tracking-[0.2em] text-primary">Patient-safe operations</p><h2 className="mt-2 text-base font-semibold">Ask the voice agent for any day</h2><p className="mt-2 text-xs leading-5 text-muted-foreground">The voice assistant can explain these schedules by day, department, doctor, or test. Personal records remain behind patient verification.</p><Link href="/" className="mt-5 inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-xs font-medium text-primary-foreground hover:bg-primary/90">Open voice assistant <ArrowLeft className="size-3.5 rotate-180" /></Link></div></section>
      </div>
    </main>
  )
}
