# HoloStack AI UI redesign audit

**Date:** 2026-11-04
**Scope:** Complete light-theme UI refresh and usability pass. This is one Next.js App Router application; no separate frontend/backend deployment was introduced.

## Design and interaction system

The prior dark dashboard styling has been replaced by a light editorial system built around warm white and pale neutral surfaces, ink-colored text, orange emphasis, thin neutral borders, and readable typography. Shared styles define consistent buttons, inputs, focus rings, cards, navigation, panels, and mobile behavior. Reduced-motion preferences are respected. The architecture studio retains its React Flow interaction model and uses light graph surfaces and legible selected/active states. Exported diagram SVG/PNG styling follows the same light treatment.

The landing page now explains the product's entry paths and main capabilities with an interactive preview based on real authored templates, an interactive deterministic capacity estimate, and clear guest/sign-in/sign-up actions. These controls use local deterministic code. Moving the capacity slider does not call Gemini. There are no invented customer logos or testimonials.

## Route-by-route audit

| Route | Updated experience | Functionality and verification |
| --- | --- | --- |
| `/` | Editorial hero, responsive public navigation, real architecture preview, template gallery, workflow/capability sections, local capacity simulation, FAQ, and clear CTAs. | Preview tabs change the displayed real template graph. Slider recomputes deterministic `simulateCapacity` output locally. Browser checks cover 375/768/1024/1440/1920 CSS-pixel widths, mobile menu, slider and no AI POST. |
| `/login`, `/signup` | Shared light authentication shell, clearer field presentation, show/hide password control, and matching-password confirmation for signup. | Signup labels and password controls were browser-checked at mobile and desktop widths. Existing server authentication and project authorization flow is unchanged. |
| `/guest` | Guest onboarding and project dashboard in the shared light workspace shell, with a route to start from a selected authored template. | Deep-linked `?template=ai-saas` selection opens the create flow, creates an editable guest project, and hands off to its studio. Guest project persistence remains browser `sessionStorage`; it does not call authenticated project persistence APIs. |
| `/guest/projects/[id]` | Responsive light architecture studio, navigation, inspector, canvas, and analysis/AI/details tools. | Browser suite creates a guest project and confirms an editable canvas, no horizontal document overflow at all five target widths, and no AI POST from opening the AI tab. Existing React Flow CRUD and deterministic checks remain local. |
| `/dashboard` | Authenticated overview and project workspace using the same navigation, card, and responsive design system. | Existing authenticated dashboard/project persistence remains TiDB-backed and protected. This focused visual suite did not create a new signed-in DB session; see earlier acceptance results in `MILESTONES.md`. |
| `/projects/[id]` | Authenticated project editor, with consistent light studio panels, canvas, dialogs, analysis, and history styling. | The project editor's save/conflict/history and canvas workflows were preserved. Prior desktop/mobile DB-backed acceptance evidence is recorded in `MILESTONES.md`; this redesign suite tests the guest counterpart. |
| `/settings` | Light account settings and session-management layout. Confirmation uses an accessible in-app dialog rather than an immediate browser confirm. | Authentication, account and session service calls remain server-side. A dedicated settings interaction was not part of the focused visual browser run. |
| `/setup` | Light operational setup/readiness presentation. | Readiness remains a live database/application-schema check with sanitized status. No schema, database, or migration was changed by this redesign. Prior readiness browser/unit evidence is recorded in `MILESTONES.md`. |
| error/not-found states | Shared typography, spacing, focus, and light surfaces across boundaries. | Build generated the app's not-found route. No forced server error or database outage was introduced solely for screenshot testing. |

Template browsing currently lives on the marketing page and dashboard/guest dashboard sections; there is no standalone `/templates` route. This matches the existing route structure and keeps links pointed at working entry points.

## Feature preservation and AI boundary

- Guest projects remain temporary browser-session data. Signed-in project data remains tenant-scoped TiDB persistence.
- Canvas drawing, selecting, dragging, CRUD, connecting, importing/exporting, diagram rendering, and visualization remain local React Flow/TypeScript operations.
- ScaleLab and rule-based risk findings remain deterministic TypeScript. The landing-page slider uses the same simulation engine with explicit authored-template assumptions.
- Gemini remains an explicit user-action feature through the server-side provider/service layer; routine page loads, preview changes, canvas interactions, and deterministic analysis do not invoke the provider.
- The earlier requested removal of HoloStack daily AI action/model caps remains in place. Short-window abuse/rate protections and provider-owned quotas remain; this UI pass did not change AI quota or retry behavior.
- Destructive/unsaved-work confirmations are presented through a shared accessible dialog. The browser's `beforeunload` guard remains for tab close/reload.

## Responsive and visual verification

Focused Playwright suite: `tests/e2e/ui-redesign.spec.ts`.

- Desktop and mobile Playwright projects: **4/4 tests passed**.
- Marketing, auth, and guest studio document overflow was checked at **375, 768, 1024, 1440, and 1920 CSS pixels**.
- Mobile navigation, marketing preview switching, the local capacity slider, signup fields, guest template deep link, guest project creation, canvas visibility, and the AI tab's no-provider-call behavior were exercised.
- Full-page marketing and studio screenshots at **375px and 1440px** were inspected visually.
- `npm run typecheck`, `npm run lint`, `npm test` (**58 tests**), and `npm run build` all passed after the redesign.
- The test used only local authored templates and synthetic guest data. It issued no Gemini request, database migration, deployment, or push.

## Remaining coverage and known limits

- The focused visual suite does not sign in and recreate a DB-backed user; dashboard, private editor persistence, and settings retain their earlier real-browser acceptance results in `MILESTONES.md`.
- Password recovery is not presented as an implemented feature because no recovery flow exists.
- Product usage remains subject to provider quotas and short-window abuse limits even though the app's daily AI action/model caps were removed.
- The landing simulation is an estimate based on labeled, authored template assumptions, not measured production telemetry.
- No standalone template route, live infrastructure monitoring, or deployment control panel was added.
