# HoloStack AI — Known Limitations

**Last audited:** 2026-11-04. Provider terms, limits, model access, and plans change; recheck the linked official sources before a release.

## Release and hosting

- A zero-cost local/public demo is feasible with AI disabled, but an end-to-end **zero-cost commercial production SaaS is not verified or promised**. TiDB PostgreSQL-compatible Starter is preview/no-SLA, Vercel Hobby is personal/non-commercial, and Gemini project quotas/billing remain unverified.
- **No production deployment has been performed.** There is no verified Vercel production environment, deployment URL, or post-deploy acceptance run.
- **TiDB PostgreSQL-compatible Starter is a public preview without a production SLA** as of the audit snapshot. The local instance passes application connection and schema checks, but that is not a production availability commitment. See the [TiDB PG-compatible FAQ](https://docs.pingcap.com/tidbcloud/pg-faq/).
- **Vercel Hobby is documented for personal/non-commercial use.** It is not a suitable default plan for operating a commercial SaaS. Review the current [Hobby plan](https://vercel.com/docs/plans/hobby), [function limits](https://vercel.com/docs/functions/limitations), and [region list](https://vercel.com/docs/regions).
- External uptime/error monitoring and alert ownership are not configured. `GET /api/health` checks liveness; `GET /api/ready` checks database and application-schema readiness, but neither is monitored externally.
- A synthetic application-level recovery rehearsal passed. A TiDB/provider-managed backup restore into a separate instance has not been performed, and no production recovery objective has been accepted.
- Browser integration runs reported intermittent TiDB `ECONNRESET` events that recovered and passed. The provider/network cause, rate under sustained load, and alert threshold have not been established.
- The development dependency tree has 16 moderate npm audit findings in the ESLint/minimatch chain. Production dependencies report zero vulnerabilities. The suggested force fix introduces an incompatible ESLint downgrade and was not applied.

## Gemini and data handling

- Gemini remains off unless a server-side key and both explicit opt-in flags are configured. No live Gemini request was sent during this audit.
- The actual Google AI Studio project's model access, free quota, billing state, regional availability, and data controls are unverified. Model pricing information alone does not prove a project can use the model at no cost. Consult the current [model catalog](https://ai.google.dev/gemini-api/docs/models), [structured output documentation](https://ai.google.dev/gemini-api/docs/structured-output), and [pricing](https://ai.google.dev/gemini-api/docs/pricing).
- The free tier may use submitted content to improve provider products. User consent is requested per AI action, but users must still avoid secrets and confidential/customer data unless the provider terms are acceptable.
- App caps are 3 AI actions per user per UTC day, 30 per application per UTC day, and 3 AI actions per user/address per minute. These are server-side application limits, not Google's quota guarantees.
- HoloStack no longer imposes a daily cap on AI usage. Short-window abuse protection and Google's model-specific quotas still apply. Each configured model is tried at most once per request; live-provider availability can vary and can fail when the provider has no available quota.

## Product scope

- Guest projects are kept in browser `sessionStorage`; a normal tab close ends that session, and guest data is not available on another device. Browser session-restore features may restore a closed tab's session, depending on browser settings. Create an account and save work to TiDB for durable cross-session access.
- The seven starter architectures are authored templates. Capacity figures are assumptions and should not be treated as benchmarks, production load plans, cost estimates, or guarantees.
- Guest AI keeps HMAC-hashed usage counters for display, with no daily usage cap. Guest project data and prompt/results are not stored by HoloStack, though Google AI Studio may retain/use request content under its applicable terms.
- The public prepared cache comparison is an authored local graph transformation with a visible illustrative 65% hit-rate assumption. It is not AI optimization, not applied to the canvas, and not measured performance improvement.
- Risk review uses named deterministic graph/text heuristics. Findings show evidence and assumptions; absence of a finding does not prove safety, while a missing text label does not prove that a control is absent from implementation.
- The capacity simulator propagates requests through the modeled graph and bounds cyclic paths. It does not account for real latency distributions, queueing behavior, autoscaling, shared resource contention, provider rate limits, regional failure, cloud pricing, or measured cache behavior.
- Browser checks verified sample graph import at 10/50/100 components and rejection at 200 because the graph limit is 100. A single production-browser file-selection-to-status sample measured 605/702/1,120 ms for 10/50/100 and 728 ms to reject 200; it includes automation/browser handoff and is not a render benchmark. No repeated timed render, sustained browser-memory, concurrent-user, throughput, or load test has been performed.
- Private projects and intelligence scenarios persist in TiDB with revision-aware writes and tenant scoping. Project binary file uploads/object storage are not implemented.
- Email verification, password recovery, account deletion, team membership administration, custom role management, public share links, billing/subscriptions, and customer support tooling are not implemented.
- Product modules listed in the build brief beyond current milestones remain roadmap work; see `docs/ARCHITECTURE.md` and `docs/MILESTONES.md` for implemented boundaries.

## Audit scope

- This audit includes typecheck, lint, unit tests, production build, desktop/mobile browser scenarios, static code-path review, and actual TiDB capability/schema probes.
- It is not an independent penetration test, formal threat model review, compliance certification, accessibility certification, browser/device matrix certification, provider SLA test, or production-scale load test.
- UI screenshots were checked at 375, 768, 1440, and 1920 CSS pixels for layout/overflow. The check does not cover every browser, zoom factor, assistive technology, or network latency.
- No credentials were printed or committed. The local `.env.local` must remain private and ignored; rotate any credential previously disclosed outside the intended secret store before broader sharing or deployment.
