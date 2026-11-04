# HoloStack AI — AI Usage Audit

This report records the original audit snapshot. For current model routing, failover, and live verification, see [AI integration](docs/AI_INTEGRATION.md).

**Audit snapshot:** 2026-11-04
**Live Gemini calls made during audit:** 0
**Current provider verification:** Not performed; project-specific credentials, billing state, model availability, and quota were not inspected.

## Decision rule

Gemini is used only for a user-requested task that requires natural-language understanding or architectural reasoning. Graph rendering/editing, simulation, rule checks, validation, persistence, exports, version comparisons, and routine UI behavior stay in deterministic TypeScript and SQL. There are no provider requests on page load or hidden/background calls.

## Provider call map

| User-visible action | Route | Provider? | Model selection | Local work around the call |
|---|---|---:|---|---|
| Generate an architecture from requirements | `POST /api/ai/generate` | Yes, one explicit request | `GEMINI_MODEL` (default `gemini-3.8-flash`) | Request/auth/quota validation before call; strict response schema, graph-integrity checks, deterministic layout, and persistence after the call. |
| Ask an open-ended architecture question | `POST /api/ai/assistant` in `ask` mode | Yes, one explicit request | `GEMINI_LIGHT_MODEL` (default `gemini-3.5-flash-lite`) | Project context is tenant-scoped; response and conversation record are schema-checked/persisted. |
| Request a natural-language architecture change | `POST /api/ai/assistant` in change/proposal mode | Yes, one explicit request | `GEMINI_MODEL` | AI returns a typed proposal. TypeScript applies it to a candidate, validates the full graph, calculates its diff, and requires the user to apply or discard. |
| Request optimization or trade-off reasoning | `POST /api/ai/assistant` in optimize mode | Yes, one explicit request | `GEMINI_MODEL` | Proposal is validated and simulated locally; comparison is explicit; it is not automatically applied. |
| Load usage status, saved conversation, or saved artifacts | `GET /api/ai/status`, `/api/ai/conversation`, `/api/ai/artifacts` | **No** | — | Authenticated database reads only. |

The model names above are defaults. The server allow-list also supports Gemini 2.5 Flash and Flash-Lite only for projects that still have access. Unsupported or unavailable models fail closed; the service does not silently switch to a different or paid model.

## Deterministic-only actions

The following paths make **zero Gemini requests**:

- Loading or reopening a project and reading saved AI results.
- Selecting a template, adding/moving/deleting/connecting nodes, zooming, panning, fitting, arranging, or rendering HoloCanvas.
- Undo/redo, JSON/PNG/report export, strict graph validation, local graph diffs, and approved graph application.
- ScaleLab slider movement, preset selection, capacity propagation, bottleneck calculation, cycle bounds, and deterministic report generation.
- Risk/review rules, architecture-version comparison/restoration, and project persistence.
- The public sample panel and prepared cache-variant comparison.

The public sample E2E test observed zero requests to `/api/ai/` while changing sliders, reviewing rules, exporting a report, and opening the prepared comparison. Offline studio E2E coverage also confirms page loading and ordinary editor activity do not issue generation calls. Provider calls exist only in the server-side provider module at `src/server/ai/provider.ts`; no browser component imports the Google SDK or invokes its API.

## Usage tracking and safeguards

- AI is disabled unless a server-only key and both opt-in flags are set: `GEMINI_ENABLED=true` and `GEMINI_FREE_TIER_CONFIRMED=true`.
- HoloStack daily caps: **none** for signed-in users, guests, or total provider attempts. Database counters are usage telemetry and support round-robin selection, not enforcement.
- Short-window rate limits remain to curb bursts and abuse; Google's own model-specific quotas and availability still apply.
- Every mutation requires a valid session where applicable, owner/editor authorization, same-origin validation, bounded request body, strict Zod validation, explicit consent, short-window rate limit, and transactionally recorded usage.
- Concurrent duplicate request IDs are suppressed with a database lock/unique constraint. The existing isolated DB probe admitted exactly one winner among eight identical concurrent in-flight attempts.
- The server rotates the starting model, then tries each remaining configured model once on eligible provider/model-output failures; individual errors are hidden if a later model succeeds. No automatic retry repeats the same model.
- Generation and assistant output token limits are bounded; response text size and generated graph schema/integrity are validated. Provider details and prompts are not returned in raw errors or logged as raw prompts.
- Prompts, assistant responses, and architecture artifacts are project content persisted in TiDB. Users see a per-action warning/consent prompt; they should avoid secrets and sensitive/customer data unless the provider data terms are acceptable.

## Cost policy and current models

No requests were made to estimate or verify cost. The configured models are chosen for the app's intended Standard/free-tier mode, and the backend does not select paid Priority/Flex modes, paid grounding/tools, or a paid fallback. The selected Google AI Studio project's own model access, free quota, billing status, and data controls must be checked directly before enabling the flags. A published zero-price tier does not prove a particular project can use a model without charge.

Google's current model catalog, structured-output support, and pricing should be rechecked when enabling the provider: [models](https://ai.google.dev/gemini-api/docs/models), [structured output](https://ai.google.dev/gemini-api/docs/structured-output), and [pricing](https://ai.google.dev/gemini-api/docs/pricing). As of the audit snapshot, new projects should use the current stable models; access to the 2.5 models may be restricted to projects that previously used them. Provider documentation and quotas can change.

## Verification and open items

- Unit tests mock the SDK and cover model selection, structured-output parsing, safe failures, request bounds, and quota behavior; they consume no Google quota.
- `tests/e2e/ai-offline.spec.ts` passed on desktop and mobile.
- `tests/e2e/ai-live-smoke.spec.ts` was skipped on desktop and mobile because explicit live-provider opt-in is absent. This was intentional; no live Gemini request was made.
- The actual API key, Google project billing, per-model quota, region availability, provider terms, and successful live structured response remain **unverified**.
- A live smoke test requires an explicit opt-in and consumes Google's provider quota; HoloStack no longer applies a daily action cap. Reaudit provider usage after the action.

## Reproducible source map

- Provider and single request site: `src/server/ai/provider.ts`.
- Auth/consent and route entry points: `src/app/api/ai/generate/route.ts`, `src/app/api/ai/assistant/route.ts`.
- Usage tracking, model rotation, and duplicate suppression: `src/server/ai/quota.ts`.
- Structured actions and local candidate handling: `src/server/ai/service.ts`, `src/domain/ai`.
- Deterministic simulation/review: `src/domain/intelligence/engine.ts`.
- Configuration and user-facing notices: `docs/AI_INTEGRATION.md`.

## Guest workspace follow-up — 2026-11-04

Guest Gemini requests use separate same-origin Route Handlers and the server-only Gemini service. They require explicit consent, validated requests, HMAC-hashed usage counters, and short-window rate limiting; there is no guest daily cap or shared app-wide model-attempt ceiling. The raw address is not stored in the counter key, and guest prompt, graph, conversation, and candidate payloads are not written to HoloStack server storage. Successful guest results stay in tab `sessionStorage`. Visiting guest AI fetches usage/provider status but never sends a Gemini request. The focused desktop/mobile guest E2E observed no AI POST before user submission. We did not issue a new live guest model request during this follow-up.

The client now waits for the configured model pool's bounded retry window before classifying a request as timed out. This corrects the earlier 30-second browser abort against sequential 25-second model attempts. It adds no model calls or retries; request routing/failover remains server-side. A local unit test verifies timeout errors are distinguished from actual fetch/network errors.
