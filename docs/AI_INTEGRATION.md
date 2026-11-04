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
GEMINI_MODELS=gemini-3.5-flash-lite,gemini-3.6-flash,gemini-3.5-flash
```

The service requires the key and both flags set to `true`. `GEMINI_MODELS` sets the generation pool in order. An unsupported ID disables the pool. If the new setting is absent, existing `GEMINI_MODEL` and `GEMINI_LIGHT_MODEL` values form the pool for backward compatibility.

An atomic TiDB cursor selects the starting model for each action and wraps at the end of the pool. It advances once per action and is shared across server instances. On provider failure or invalid model output, HoloStack tries each remaining model in order, at most once per model and up to 25 seconds per attempt. The caller receives the first validated result or a single error when the pool is exhausted. A usage-storage failure stops before making an unrecorded provider request.

HoloStack imposes no personal, guest, or app-wide daily AI usage cap. It records usage counters for visibility and round-robin model selection. Short-window abuse protection still applies, and Google may enforce model-specific rate and free-tier quotas; if a model rejects a request, the server tries each remaining configured model once before returning a single error. The two AI routes allow up to 240 seconds to accommodate failover. Enable Fluid Compute on Vercel Hobby. [Vercel function duration](https://vercel.com/docs/functions/configuring-functions/duration)

Model IDs and structured-output support are checked against Google's current model and structured-output documentation at audit time: https://ai.google.dev/gemini-api/docs/models and https://ai.google.dev/gemini-api/docs/structured-output. A model's published free-tier pricing does not prove that a particular API project has access or a usable request quota. Confirm the selected project's billing state and model quota before enabling the opt-in flags. The app allow-list intentionally includes only models that can use the intended free Standard tier; it does not use paid Priority/Flex modes, tools, grounding, or automatic paid fallback.

Confirm in Google AI Studio that the project's tier is Free and no billing account is linked before enabling the flags. Project-specific quota and model access can vary. HoloStack contacts Gemini when a user submits a consented AI action or an operator explicitly runs a provider check.

The Google AI Studio free tier may use submitted content to improve Google products. HoloStack displays this before every AI action. Do not submit credentials, customer data, or confidential designs unless that data sharing is acceptable to you.

## Operational boundaries

- `GET /api/ai/status`, `GET /api/ai/conversation`, and `GET /api/ai/artifacts` do not call Google. They require an authenticated owner and scope all project data to the current workspace.
- `POST /api/ai/generate` and `POST /api/ai/assistant` require a session, owner/editor role, same-origin request, bounded Zod input, explicit consent, short-window rate limit, and transactionally recorded usage.
- No provider call is made from browser code. `server-only` protects the provider module.
- HoloStack validates JSON and graph integrity before saving a candidate. Invalid output can trigger a fallback to a different configured model.
- Model failures are recorded per attempt using sanitized codes. Individual failures stay out of the user response when a later model succeeds.
- No model calls run on load, autosave, canvas actions, template selection, report export, risk review, or slider movement. ScaleLab and deterministic review are local TypeScript operations; saving a scenario is an authenticated database write and does not invoke a model.
- Playwright disables live AI by default, even when local Gemini is enabled. The desktop smoke test requires `HOLOSTACK_LIVE_AI_SMOKE=true` as well as the key and both app opt-in flags. It submits one synthetic generation action that may use failover. Unit tests use a mocked SDK.

To run the focused smoke test in PowerShell after confirming the Google project tier:

```powershell
npm run build
$env:HOLOSTACK_LIVE_AI_SMOKE = "true"
try {
  npx playwright test tests/e2e/ai-live-smoke.spec.ts --project=desktop
} finally {
  Remove-Item Env:HOLOSTACK_LIVE_AI_SMOKE
}
```

## Current verification boundary

On 2026-11-04 the owner confirmed Free Tier with no billing account linked. The following tests used short synthetic inputs against the project's Gemini API key.

| Model | Live result | Routing |
|---|---|---|
| Gemini 3.1 Flash-Lite | HTTP 503 | Excluded |
| Gemini 3.5 Flash-Lite | Passed HoloStack's architecture schema | First in pool |
| Gemini 2.5 Flash-Lite | HTTP 404 from generation | Excluded |
| Gemini Embedding 1 | Returned an embedding vector | Embeddings only |
| Gemini Embedding 2 | Returned an embedding vector | Embeddings only |
| Gemini 3 Flash Preview | Basic JSON passed, architecture probe timed out | Excluded |
| Gemini 2.5 Flash | HTTP 404 from generation | Excluded |
| Gemini 3.6 Flash | Passed HoloStack's architecture schema | Second in pool |
| Gemini 3.8 Flash | HTTP 503 from generation; earlier app smoke recorded HTTP 504 | Excluded |
| Gemini 3.5 Flash | Passed HoloStack's architecture schema | Third in pool |
| Gemini 3.7 Flash | HTTP 503 | Excluded |

Initial app requests using the raw Zod-to-JSON-Schema output failed across the first pool. The provider now sends a simplified schema while the application enforces the original strict schema and graph integrity checks on the response. The model checks use the same simplified schema and validate each result with the full local schema. [Google structured output](https://ai.google.dev/gemini-api/docs/structured-output)

Four consecutive live requests against the local production build all returned validated HoloCanvas graphs. The TiDB attempt records showed starting models in this order: 3.5 Flash-Lite, 3.6 Flash, 3.5 Flash, then 3.5 Flash-Lite again. Two of the actions succeeded after fallback. Each configured model produced a valid app response at least once. The slowest of these four tests took about 60 seconds with failover and database operations.
