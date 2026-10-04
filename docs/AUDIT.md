# Arogya Assist Voice Pipeline Audit

## Scope

This audit covers the current voice-pipeline web app before the requested production-grade rebuild. It is intentionally limited to assessment; no runtime implementation changes are included in this phase.

## What the app does

Arogya Assist is a healthcare information assistant with:

- A browser voice/text interface for questions about doctors, registration, reception, and diagnostic testing schedules.
- Client-side speech recognition and speech synthesis when supported by the browser.
- A text fallback that sends sanitized conversation history to `/api/voice`.
- A Twilio inbound voice webhook at `/api/twilio/voice` for the configured toll-free number.
- Directory-backed schedule answers for exact days, day ranges, shifts, departments, doctors, and tests, with weekly answers only when explicitly requested.
- AI fallback for questions that are not answered by the deterministic healthcare directory.

## Current architecture and data flow

### Browser path

1. `app/page.tsx` renders `components/voice-agent-console.tsx`.
2. `components/voice-agent-console.tsx` owns the voice UI, browser SpeechRecognition lifecycle, speech synthesis, partial transcript display, interruption behavior, language selection, text fallback, and schedule navigation.
3. `lib/use-voice-agent.ts` stores the in-memory conversation and POSTs messages to `/api/voice`.
4. The browser receives JSON and renders the assistant response, then uses `speechSynthesis` for playback.

### Text/API path

1. `lib/use-voice-agent.ts` sends `{ message, history }` to `app/api/voice/route.ts`.
2. `app/api/voice/route.ts` validates origin, content type, payload size, rate limit, and input length through `lib/security.ts`.
3. `lib/healthcare/orchestrator.ts` attempts deterministic schedule matching first.
4. If the directory cannot answer, the route calls the AI Gateway through the AI SDK and returns a bounded response.
5. The route returns JSON with request tracing headers and no-store caching.

### Phone path

1. Twilio posts form-encoded speech results to `app/api/twilio/voice/route.ts`.
2. The route validates Twilio's signature, applies payload/rate limits, and sanitizes the speech result.
3. It asks `lib/healthcare/orchestrator.ts` for a directory answer first.
4. It uses a bounded AI fallback when necessary, then returns escaped TwiML containing another speech gather prompt.
5. Twilio continues the call through the same webhook until the caller hangs up or the route returns a terminal response.

### Current persistence

There is no application database access layer, user/session persistence, transcript store, usage ledger, retention job, or delete-my-data flow in the current implementation. Environment configuration is supplied through Vercel project variables, including database and Twilio variables, but the app does not yet use a Postgres data model for voice sessions.

## Loopholes and risks, ranked

### Critical

1. **No real-time streaming pipeline.** Browser flow is request/response and browser speech APIs; Twilio uses webhook turns. There is no streaming STT -> streamed LLM -> chunked TTS path, so time-to-first-audio cannot be controlled. Files: `components/voice-agent-console.tsx`, `lib/use-voice-agent.ts`, `app/api/voice/route.ts`, `app/api/twilio/voice/route.ts`.
2. **No server-side session identity or durable session resume.** Conversations exist only in client memory and Twilio request turns. A refresh, reconnect, process restart, or device change loses context. Files: `lib/use-voice-agent.ts`, `app/api/voice/route.ts`, `app/api/twilio/voice/route.ts`.
3. **No consent, privacy, retention, or delete-my-data workflow.** Healthcare-related questions and transcripts can be sensitive, but there is no consent gate, privacy policy surface, retention setting, deletion action, or auditable data lifecycle. Files: `app/page.tsx`, `components/voice-agent-console.tsx`; no corresponding persistence/compliance module exists.
4. **Provider abstraction is missing.** AI fallback is coupled directly to a model string in route handlers, and browser speech is coupled directly to Web APIs. Swapping Claude, STT, or TTS providers requires route/UI changes. Files: `app/api/voice/route.ts`, `app/api/twilio/voice/route.ts`, `components/voice-agent-console.tsx`.

### High

5. **No authentication or per-user authorization.** The web endpoint relies on origin checks and IP/client-key rate limiting, not authenticated users or user-scoped data access. Files: `app/api/voice/route.ts`, `lib/security.ts`.
6. **No durable rate-limit or cost-control store.** The current rate limiter is process-local memory, which resets on deploy/restart and is not shared across instances. AI cost caps, per-user quotas, and usage accounting are absent. File: `lib/security.ts`.
7. **No observability pipeline.** There is request ID support, but no structured per-stage latency metrics, provider timings, error taxonomy, trace export, Sentry integration, or cost/session dashboard. Files: `lib/security.ts`, `app/api/voice/route.ts`, `app/api/twilio/voice/route.ts`.
8. **No offline/reconnect strategy.** The browser reports errors and offers text fallback, but there is no queued request policy, session resume token, backoff reconnect, or network-state UX. Files: `components/voice-agent-console.tsx`, `lib/use-voice-agent.ts`.
9. **No server-side request schema library.** Validation is hand-written. Zod schemas, typed API contracts, and consistent validation errors are not present. Files: `app/api/voice/route.ts`, `app/api/twilio/voice/route.ts`.
10. **The Twilio webhook is turn-based rather than media-stream based.** It cannot support true barge-in, continuous VAD, or sub-800ms first audio. File: `app/api/twilio/voice/route.ts`.
11. **Healthcare directory is static application data.** Schedule updates require code deployment; there is no admin workflow, effective-date/versioning model, audit trail, conflict detection, or source-of-truth import. Files: `lib/healthcare/contracts.ts`, `lib/healthcare/orchestrator.ts`.
12. **AI fallback can answer outside the deterministic directory.** Prompt guardrails exist, but there is no formal content safety classifier, confidence contract, citation/source metadata, or escalation policy. Files: `app/api/voice/route.ts`, `app/api/twilio/voice/route.ts`.

### Medium

13. **Speech support is browser-dependent.** Safari/iOS behavior varies and there is no device onboarding/check flow or server STT fallback. File: `components/voice-agent-console.tsx`.
14. **No push-to-talk or hands-free preference model.** Current voice interaction uses a single recognition flow; there is no explicit mode persistence or user preference. File: `components/voice-agent-console.tsx`.
15. **No transcript export/history UI.** Messages are in-memory only and disappear after reload. Files: `lib/use-voice-agent.ts`, `components/voice-agent-console.tsx`.
16. **No automated tests.** There is no unit, integration, Playwright, microphone-denied, offline, signature-validation, or latency test suite visible in the project manifest. File: `package.json`.
17. **No CI/CD quality gates or runbook.** The repository has no documented deployment checklist, rollback procedure, load-test target, or operational runbook. Files: repository documentation surface and `package.json`.
18. **Accessibility coverage is incomplete.** The UI has several good labels and live regions, but there is no automated WCAG audit, keyboard-flow test, focus restoration strategy, or reduced-motion verification suite. File: `components/voice-agent-console.tsx`.
19. **No explicit age-appropriate mode.** If minors may use the service, the product needs an age-appropriate disclosure/safety mode and guardian/privacy decisions.

### Low

20. **Analytics are absent.** There is no product analytics event model for activation, drop-off, question success, transfer/escalation, or feature usage.
21. **Health checks are shallow.** A health route can report configuration readiness, but there is no dependency probe, readiness/liveness separation, provider latency, or degraded-state classification.
22. **No versioned API contract or generated client.** Frontend and backend types are maintained manually, increasing drift risk.

## Performance assessment

The current architecture is suitable for a functional prototype and deterministic directory demo, but not for the requested real-time voice SLA. The critical path is serial: capture speech, wait for browser recognition, send a full request, wait for deterministic/AI response, then synthesize browser audio. The phone path is also serial across Twilio webhook turns. A production target should measure:

- Time to first transcript token.
- Directory lookup latency.
- LLM time to first token and completion latency.
- TTS time to first audio chunk.
- End-to-end time to first audio, with a target under 800ms for cached/directory answers.
- Barge-in detection latency.
- Reconnect success rate and session-resume rate.
- Cost per session and provider error rate.

## Recommended target architecture

- Next.js frontend remains the presentation layer and uses a typed client contract.
- A Node + TypeScript realtime voice service owns WebSocket/WebRTC sessions.
- Provider interfaces isolate streaming STT, Claude streaming LLM, and chunked TTS adapters.
- Postgres stores users, consent, sessions, transcript metadata, retention state, directory versions, and usage records.
- A shared durable rate-limit/usage mechanism protects both web and phone paths.
- Twilio Media Streams or an equivalent realtime media transport handles phone audio and barge-in.
- Deterministic directory answers remain the first, fastest path; Claude is a bounded fallback, never the source of schedule truth.
- Structured logs and traces carry `requestId`, `sessionId`, `userId` where authorized, provider, stage, latency, outcome, and cost metadata without storing secrets or unnecessary PHI.

## Phased implementation plan

### Phase 1 — Audit and decisions

Complete this document, confirm the canonical schedule source, decide the telephony/realtime transport, and define consent/privacy requirements.

### Phase 2 — Backend foundation

Add typed Zod contracts, provider interfaces, Postgres schema, authenticated sessions, consent/retention records, durable usage accounting, structured logs, health/readiness checks, and a shared error model.

### Phase 3 — Realtime voice

Add a streaming session service with STT, Claude token streaming, TTS chunking, VAD, barge-in, reconnect/session resume, provider timeouts, retries, and graceful text degradation. Keep current HTTP endpoints as compatibility fallbacks.

### Phase 4 — Frontend experience

Add the state machine for connecting/listening/thinking/speaking/error, mic onboarding, captions, push-to-talk and hands-free modes, transcript/history, controls, multilingual support, offline UX, and accessible error boundaries without breaking the existing workflow.

### Phase 5 — Trust and compliance

Add consent screen, privacy policy, retention settings, delete-my-data flow, safety filters, escalation language, and age-appropriate mode.

### Phase 6 — Quality and launch

Add unit/integration/Playwright tests, mic-denied/offline scenarios, signature tests, load/latency tests, CI gates, Sentry, analytics, dashboards, README, and an operational runbook.

## Decisions/questions that are truly blocking

1. **Canonical schedule source:** Should schedules remain a maintained directory in this app, or should they be imported from an existing hospital/diagnostic-center system? The realtime agent must not invent schedule data.
2. **Realtime transport:** Should browser voice use WebRTC/WebSocket and should phone use Twilio Media Streams? Twilio turn-based Gather cannot meet real-time barge-in and first-audio targets.
3. **Claude access:** Should Claude be reached through Vercel AI Gateway or a direct Anthropic integration? Recommendation: AI Gateway for provider abstraction and deployment ergonomics.
4. **Authentication scope:** Are callers/web users anonymous, authenticated patients, or both? This determines session identity, data access, and transcript retention.
5. **Compliance boundary:** Will the service handle PHI or only public operational information? If PHI is in scope, retention, vendor agreements, redaction, access controls, and audit requirements must be approved before storing transcripts.
6. **Retention policy:** What should the default transcript retention period be, and should users be able to delete sessions immediately?
7. **Minors:** Can patients under 18 use the service? If yes, define guardian/age-appropriate handling.
8. **Operational targets:** Confirm the target for time-to-first-audio, maximum concurrent calls, expected daily call volume, and acceptable degraded behavior when providers fail.

## Phase 1 conclusion

The existing app has a useful deterministic healthcare-directory core, a working browser fallback, and Twilio integration scaffolding. The largest gap is not visual; it is the lack of a durable, observable, streaming backend session architecture. The next implementation phase should establish the contracts, persistence, identity, and provider boundaries before adding realtime media, so the current frontend can remain compatible during the migration.
> EOF

# Remove accidental marker if present
sed -i '/^> EOF$/d' /vercel/share/v0-project/docs/AUDIT.md

