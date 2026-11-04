# AI integration and zero-budget controls

## Where AI is used

All Gemini calls originate in Node.js Route Handlers through the centralized server-only provider interface in `src/server/ai/provider.ts`. The authenticated workbench offers explicit architecture generation, question answering, typed graph-change proposals, and optimization proposals. A visitor can explore authored templates without Gemini. Opening a project, loading saved AI artifacts, moving the canvas, exporting a diagram, and editing a graph do not call Gemini.

Generation uses Google's structured JSON response mode, followed by Zod validation and the normal graph-integrity checks. The server supplies graph IDs, layout, and bounded starter capacity assumptions in TypeScript; it never treats those values as measurements. Copilot/optimization output consists of typed operations. HoloStack applies them to a private candidate in deterministic code, validates the complete graph, computes the before/after graph difference locally, and asks the user to apply or discard it. Applying an approved candidate uses the existing revision-aware project autosave and version snapshot.

Successful candidates and recent project chat are stored in tenant-scoped TiDB tables. Usage records store model, feature, status, time, and token counts when returned; they never store raw prompts in request logs. Conversation text and candidate graph data are persisted as project content and are visible in the signed-in project. The UI requires per-action consent and warns users not to send secrets or personal data.

## Explicit configuration

Copy settings into `.env.local` without putting the key in chat, source control, or a `NEXT_PUBLIC_*` variable:

```env
GEMINI_API_KEY=
GEMINI_ENABLED=false
GEMINI_FREE_TIER_CONFIRMED=false
GEMINI_MODEL=gemini-2.5-flash
GEMINI_LIGHT_MODEL=gemini-2.5-flash-lite
AI_DAILY_USER_LIMIT=3
AI_DAILY_GLOBAL_LIMIT=30
```

The service remains disabled unless the key, `GEMINI_ENABLED=true`, and `GEMINI_FREE_TIER_CONFIRMED=true` are all present. Supported models are deliberately allow-listed to Gemini 2.5 Flash and Flash-Lite. A setting outside that list fails closed. Limits may be lowered but cannot exceed three actions per authenticated user and thirty for the whole app per UTC day. Daily reservations use transaction-scoped row locks in TiDB; the rate limiter also limits each user to three AI actions per minute. Failed provider attempts consume an app action so retries cannot evade the budget. The Google SDK makes one attempt, with a 25-second timeout; retries require a new user action and another quota slot.

Do not enable the flags until the Google AI Studio project associated with the key shows free-tier access and has no billing account enabled. HoloStack cannot inspect the account's billing status. A free-tier model ID is not by itself a guarantee against charges if Google billing is enabled. Google documents Gemini API free-tier token pricing but actual model access and request quotas vary by project; check the project-specific quota page in AI Studio. The model/key is deliberately not probed on page load. The first explicit user action verifies whether the selected model is actually available to that key; an unavailable model produces a safe error and no automatic fallback.

The Google AI Studio free tier may use submitted content to improve Google products. HoloStack displays this before every AI action. Do not submit credentials, customer data, or confidential designs unless that data sharing is acceptable to you.

## Operational boundaries

- `GET /api/ai/status`, `GET /api/ai/conversation`, and `GET /api/ai/artifacts` do not call Google. They require an authenticated owner and scope all project data to the current workspace.
- `POST /api/ai/generate` and `POST /api/ai/assistant` require a session, owner/editor role, same-origin request, bounded Zod input, explicit consent, rate limit, and a transactionally reserved user/application quota slot.
- No provider call is made from browser code. `server-only` protects the provider module.
- Invalid, oversized, or graph-invalid model responses are rejected. No automatic JSON repair request is sent; the user may explicitly retry and see the next action consume quota.
- Provider 429, 503, missing-key, invalid-key, and unavailable-model errors map to safe user-facing messages. Raw provider messages and prompt content are not returned or logged.
- No model calls run on load, autosave, canvas actions, template selection, report export, risk review, or slider movement. ScaleLab and deterministic review are local TypeScript operations; saving a scenario is an authenticated database write and does not invoke a model.
- No production provider smoke test is run by default. `tests/e2e/ai-live-smoke.spec.ts` makes exactly one quota-metered generation request only when all explicit key/free-tier flags are set; otherwise it is skipped. Unit tests use a mocked SDK and never consume provider quota.

## Current verification boundary

The app schema migration is additive and the exact migration was exercised in a randomly named TiDB scratch schema before applying it. Eight concurrent reservations against the quota-counter logic allow exactly three requests for a test user. Whether this local Google AI Studio key can access the configured models can only be verified after the key and free-tier confirmation are configured; a successful first generation (or the explicitly enabled one-request smoke test) is the provider verification. Do not describe Gemini as verified before that succeeds.

ScaleLab, deterministic risk rules, architecture history comparison/restoration, and Markdown reporting are delivered in Module 5. AI optimization remains a user-requested proposal; deterministic validation and simulation run locally after it returns. No performance improvement is measured or promised.
