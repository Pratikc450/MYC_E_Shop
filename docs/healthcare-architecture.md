# Arogya Assist healthcare backend

This design treats the voice agent as a safety-critical information gateway. It never invents live hospital data, exposes report contents to voice, or returns patient-specific data without a session-scoped identity token.

## Component diagram

```mermaid
flowchart LR
  PSTN[Telephony / PSTN] --> G[Channel Gateway]
  APP[Web / App voice] --> G
  G --> S[Session event stream\nDTMF, barge-in, consent]
  S --> ASR[Streaming ASR + language routing]
  ASR --> O[Emergency-first orchestrator]
  O --> ID[Identity & authorization]
  O --> D[Domain services]
  D --> HIS[HIS/EHR adapters]
  D --> PH[Pharmacy adapters]
  D --> DIR[Directory cache]
  O --> TTS[SSML TTS]
  TTS --> G
  O --> AUDIT[PHI audit log]
  G --> TRACE[Tracing + metrics]
```

## API contracts

All patient-specific endpoints require `Authorization: Bearer <session-scoped-token>`. Raw patient IDs are never accepted as authorization.

### Session and consent

`POST /api/healthcare/session`

```json
{ "channel": "web", "language": "en-IN", "consented": true }
```

Returns `{ session, consent }`, with a 30-minute expiry and the automated disclosure recorded against the session.

### Identity

`POST /identity/verify_patient` accepts `{ sessionId, patientId, secondaryIdentifier }`. It returns `{ verified, token, expiresAt }` only after verification. Two failed attempts lock the session; repeated failures are alerted as possible enumeration. Proxy access is a separate pre-enrolled credential flow.

### Scheduling

`GET /scheduling/doctors/:doctorId/availability` returns `{ doctorName, department, slots, location }`. The service reads the HIS adapter directly and includes a source trace. Booking and surgery lookup use the same adapter contract but require the identity token.

### Reports

`GET /reports/:reportId/status` returns only `{ reportId, status, expectedDate }`. The report service type has no `contents`, `diagnosis`, or document payload field, so report contents cannot reach the voice layer by contract.

### Pharmacy

`GET /pharmacy/:medicine/availability` returns `{ medicineName, locations: [{ name, available }] }`. It contains no dosage or medical-advice fields.

### Escalation

`POST /escalation` accepts a redacted session summary and priority (`emergency` or `routine`). It returns a warm-transfer status or callback queue position.

## Core sequences

### Doctor availability

```mermaid
sequenceDiagram
  participant P as Patient
  participant O as Orchestrator
  participant D as Scheduling service
  participant H as HIS adapter
  P->>O: "Is Dr. Mehta available today?"
  O->>O: Emergency check, then intent + slots
  O->>D: availability query
  D->>H: bounded timeout request
  H-->>D: live slots or typed failure
  D-->>O: sourced availability
  O-->>P: spoken slots with location
```

### Verified surgery schedule

```mermaid
sequenceDiagram
  participant P as Patient
  participant I as Identity service
  participant O as Orchestrator
  participant S as Scheduling service
  participant H as HIS
  P->>O: asks for surgery schedule
  O->>I: verify patient + secondary identifier
  I-->>O: expiring session token
  O->>S: surgery lookup with token
  S->>H: token-bound request
  H-->>S: schedule
  S-->>O: schedule + audit event
  O-->>P: schedule summary
```

### Emergency detected mid-call

```mermaid
sequenceDiagram
  participant P as Patient
  participant G as Gateway
  participant O as Orchestrator
  participant E as Escalation
  P->>G: "I cannot breathe"
  G->>O: normalized turn
  O->>O: emergency detector runs before intent classification
  O->>E: priority warm transfer with redacted context
  E-->>O: transfer accepted or callback queue
  O-->>P: urgent emergency instruction + transfer status
```

## Failure modes

| Component | Failure | Expected behavior |
|---|---|---|
| Telephony | Provider outage | Show app fallback, callback offer, and status page; never drop silently |
| Gateway | DTMF/voice mismatch | Offer press-1 fallback and repeat consent disclosure |
| ASR | Low confidence | Ask a short clarification; never call a domain tool |
| TTS | Degraded | Switch to text/DTMF and offer human transfer |
| Orchestrator | Timeout | Say the check is unavailable and offer reception/callback |
| Identity | Two failed attempts | Lock session; alert on repeated cross-session failures |
| HIS | Timeout or circuit open | Typed integration failure; no guessed availability |
| Pharmacy | API unavailable | Offer nearby reception callback; do not infer stock |
| Escalation | No agent available | Return queue position and callback offer |
| Audit | Write failure | Fail closed for PHI reads; surface operational alert |

## Suggested stack tradeoffs

- **Telephony:** Twilio Voice is fast for PSTN and DTMF; LiveKit is stronger for low-latency WebRTC and barge-in; a SIP provider offers more carrier control but increases operations.
- **ASR/TTS:** Deepgram plus ElevenLabs provides strong streaming and expressive SSML; Google Cloud Speech is a broad multilingual alternative; self-hosted models improve control but require GPU operations.
- **Orchestration:** A typed TypeScript state machine is easiest to audit; the AI SDK can generate natural language around deterministic tool results; a durable workflow engine is useful for callbacks and long-running escalation.
- **Event bus:** Vercel Workflow or a managed queue is simple for durable handoffs; Kafka is appropriate for high-volume replayable events but adds platform overhead.

## Security and operations

Use TLS for every hop, encrypted database storage, short-lived hashed session tokens, redacted observability payloads, structured audit events, and infrastructure TTL jobs for transcripts and identity attempts. Add distributed tracing keyed by session ID, alerts for emergency-transfer failures and ASR-confidence drops, circuit breakers with explicit timeout budgets, and contract tests that reject unsourced scheduling, pharmacy, or report-content responses.
