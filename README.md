# NdaY'Radoko

## Bringing assessment capability closer to mothers and young infants

NdaY'Radoko is a NdaY' Enterprise project developing a physician-supervised outreach service for infants aged 0-59 days in underserved communities in Madagascar.

The service vision is to reverse part of the journey to care: bring a portable, PCIMNE-guided assessment system closer to the household, connect collected evidence to a physician, and maintain referral and follow-up when needed. The intended architecture combines a digital clinical application, an onboard assessment platform, selected device and drone-mounted sensors (proposed for bench validation, not yet built), and a connected data platform.

This repository documents the software prototype (package version 0.3.0). The integrated service vision must not be confused with functionality already demonstrated by this build.

> **Prototype safety notice.** Use synthetic demonstration data only. This application is a FemTech readiness demonstration, not a medical device, and is not clinically validated. Its role selection is a demonstration, not production authentication. No aircraft is operated by this application. No drone-mounted camera or sensor pipeline exists in this build. Do not use it to decide whether a real infant or mother needs care.

## Contents

- [Technology and requirements](#technology-and-requirements)
- [Current implementation](#current-implementation)
- [Demo feature status](#demo-feature-status)
- [Getting started](#getting-started)
- [Reviewer walkthrough](#reviewer-walkthrough)
- [Architecture](#architecture)
- [AI behaviour and configuration](#ai-behaviour-and-configuration)
- [Clinical reference and governance](#clinical-reference-and-governance)
- [Data handling and security](#data-handling-and-security)
- [Testing and evidence](#testing-and-evidence)
- [Equipment, drone and sensor boundaries](#equipment-drone-and-sensor-boundaries)
- [Prepared scenarios and helper self-check](#prepared-scenarios-and-helper-self-check)
- [Roadmap](#roadmap)
- [Contributing](#contributing)
- [Licensing and ownership](#licensing-and-ownership)
- [Project lead](#project-lead)
- [Maintainer publication checklist](#maintainer-publication-checklist)

## Technology and requirements

These details come from `package.json`.

| Item | Declared value |
| --- | --- |
| Package name / version | `nday-radoko` / `0.3.0` |
| Module type | ES modules (`"type": "module"`) |
| Node.js | `>=20` |
| UI | React `^19.2.0`, React DOM `^19.2.0` |
| Charts | Recharts `^3.3.0` |
| AI SDK dependency | `@google/genai` `^1.26.0` |
| Backend (optional server) | Express `^4.21.2`, CORS `^2.8.5` |
| Server runtime | tsx `^4.19.2`, concurrently `^9.1.0` |
| Build tool | Vite `^6.2.0` with `@vitejs/plugin-react` `^5.0.0` |
| Language | TypeScript `~5.8.2` |
| Styling | Tailwind CSS `^3.4.17`, PostCSS, Autoprefixer |
| Declared licence | Apache-2.0 |

`"private": true` only prevents accidental publication to the npm registry. It says nothing about whether the Git repository is public or private.

The manifest declares no `test` or `lint` script. It declares `typecheck`, `build`, `verify` (which runs both plus the fixture self-check), `fixtures:list`, `fixtures:self-check`, `server`, and `dev:all`. There is no runtime dependency for authentication, a database, or a shared record service; a single optional Express server handles AI draft generation and physician-signing authorization.

## Current implementation

This status reflects the current local working tree at commit `HEAD` (see `git rev-parse HEAD`) and the results of `npm run verify` (typecheck, production build, 16-check fixture helper). It is not a clinical evaluation, pilot, or release record.

| Component | Status in supplied source | Important boundary |
| --- | --- | --- |
| Infant and encounter registration | Synthetic encounter saved with caregiver consent and separate image-capture choice; location cascade; commune-linked CSB placeholder exercised | Synthetic records only; facility directory must be verified before operational use |
| Encounter workflow | Local queue, assessment state, evidence tab, AI draft tab, physician-review path, and "Drone capture view" toggle in the evidence panel | Demo state machine and roles only; no production authentication or facility transmission |
| Observations and assessment review | Structured catalogue with source, quality, and remote-feasibility flags; a type-level **drone capture requirements matrix**; deterministic classification comparison against source-mapped criteria | Training pack and criteria are explicitly non-medical; no approved clinical rule set or Madagascar protocol mapping is supplied |
| Proposed substitute (skin pinch) | `proposedSubstitute` field declares a caregiver-mediated camera-supervised pathway for the in-person-only skin pinch observation | Research question only; not implemented; no validation |
| AI assistance | Server-side draft endpoint (`/api/clinical/ai-draft`) calls a configured Gemini model; client falls back to a deterministic local template when the server is unavailable or the key is absent; every draft is labelled `simulated` or `live` | Provider key is never bundled into the browser; no live model in offline demo; no sensor interpretation in this build |
| Physician decisions | Async server-side authorization gate (`/api/clinical/sign-decision`) plus local state machine; sign requires a physician account at the encounter's facility | Not verified professional identity; no external referral network; no clinical sign-off |
| Drone capture requirements | Per-observation requirements matrix (standoff, resolution, frame rate, lighting, minimum duration, validity and invalidity conditions) exposed through a dedicated evidence-panel view | **Design intent only.** No aircraft is operated. No camera or sensor pipeline exists. Requirements are labelled "Proposed for bench validation" |
| Referral and follow-up | Outcome recording and urgent-escalation workflow | Not evidence of a functioning external referral network |
| Data persistence | Browser-local demonstration store (schema v4); stale encounters from earlier schemas are dropped defensively | No facility sharing; no secure offline synchronisation |
| Governance | Protocol metadata, review information, and demonstration approval control | A demo approval action is not real clinical or Ministry approval |
| Equipment | Readiness records and simulated checks | Not airworthiness, flight, or clinical-device evidence |
| Fixture self-check | 16 isolated checks against a standalone fixture-generation helper using a mock in-memory store; generates `docs/module-self-check-results.json` | Not application tests; not clinical tests; not performance measurements |
| Integrated onboard system | Not demonstrated by the supplied components | Embedded execution and device acquisition need separate evidence |
| Maternal-needs and counselling modules | Part of the development roadmap | Not presented as completed |

## Demo feature status

Three supporting documents:

- [docs/DEMO_FEATURE_STATUS.md](docs/DEMO_FEATURE_STATUS.md) — detailed verified feature list and safe walkthrough
- [docs/SCENARIOS.md](docs/SCENARIOS.md) — the 12 prepared synthetic input fixtures
- [docs/HELPER_SELF_CHECK.md](docs/HELPER_SELF_CHECK.md) — the 16 isolated fixture-helper checks

The machine-readable version of the fixture check results is committed at [docs/module-self-check-results.json](docs/module-self-check-results.json).

## Getting started

### Requirements

- Node.js 20 or later.
- npm (or another package manager that respects your lockfile).
- The full repository checkout. The application imports services, shared types, data definitions, utilities and image assets that are not part of the component files alone.
- Optional, for the server-side AI path only: a Google Gemini API key set in `.env` as `GEMINI_API_KEY`. The demo runs without it — the client falls back to a deterministic local template.

### 1. Get the project

```sh
git clone https://github.com/nandrianaivojaona-nday/NdaY-Radoko-3.0.git
cd NdaY-Radoko-3.0
```

### 2. Install dependencies

If a `package-lock.json` is committed:

```sh
npm ci
```

If there is no lockfile, use `npm install` and commit the generated `package-lock.json` so installs are reproducible. If the repository holds `pnpm-lock.yaml` or `yarn.lock`, use that package manager instead. Do not mix lockfiles.

### 3. Optional: configure the server-side AI

Copy `.env.example` to `.env` and fill in `GEMINI_API_KEY` if you want the live model path. The browser bundle is always built with empty provider-key values (`vite.config.ts`), so the key never leaves the server.

If `.env` is absent or the key is empty:
- `npm run dev` — client sends fetch, gets a connection refusal, uses the deterministic local template
- `npm run dev:all` — server returns `503` with `fallbackRecommended`, client uses the local template

Either way, the app runs. Every draft is labelled.

### 4. Run the scripts

| Command | Purpose |
| --- | --- |
| `npm run dev` | Start the development server (client only, port 4000) |
| `npm run server` | Start the optional Express backend (port 4001) |
| `npm run dev:all` | Start both concurrently |
| `npm run build` | Create a production build |
| `npm run typecheck` | Run the TypeScript type check |
| `npm run preview` | Serve the production build locally |
| `npm run fixtures:list` | Print the 12-scenario fixture catalogue |
| `npm run fixtures:self-check` | Run the 16 fixture-helper checks; writes `docs/module-self-check-results.json` |
| `npm run verify` | `typecheck` + `build` + `fixtures:self-check` — the full verification pipeline |

Open `http://localhost:4000/NdaY-Radoko-3.0/` for the local development server.

Suggested verification before sharing the repository:

```sh
npm ci
npm run verify
```

Expected tail: `typecheck passed`, `build passed`, `Fixture helper self-check: 16/16 passed.` This does not establish clinical safety or production readiness.

## Reviewer walkthrough

1. Start the app and read the synthetic-data and prototype notices.
2. Select the Field Officer demonstration account (Lova, Community Health Agent).
3. Register a synthetic infant. Try Faritany Fianarantsoa → Region Vatovavy → District Ifanadiana → Commune Ifanadiana; note that the CSB is a directory placeholder. Record consent and image permission separately.
4. Open the new encounter and review the concern prompts and evidence catalogue. Missing observations should remain "not assessed", not be interpreted as normal.
5. Click **Drone capture view** in the evidence panel. The panel now shows only the observations whose `droneCaptureRequirements.feasible === true`, each with its standoff range, resolution, frame rate, lighting, validity and invalidity conditions, and the label "Proposed for bench validation". At the bottom, a "Not feasible via drone" section lists the excluded observations (skin pinch, fontanelle, temperature, weight, etc.) with the reason for each. **No drone is operated. No camera pipeline exists. This is design intent, not capability.**
6. Review the physician decision screen. It uses source-mapped classification criteria and shows evaluation badges ("Observations suggest match" / "no match" / "Insufficient evidence") per rule. Do not sign a decision. The demo does not exercise signature.
7. Prepare a documentation draft. It should identify a deterministic local template or a live model call, list missing evidence, and say it is not a diagnosis.
8. Use the reset control to restore the seeded synthetic cases. Do not enter real names, dates of birth, contacts, household locations, images, or health records.

Report problems with the build identifier, steps, expected result and actual result. Screenshots must contain synthetic data only.

## Architecture

A React and TypeScript single-page application built with Vite, plus an optional Node.js server for AI draft generation and physician-signing authorization.

Logical map based on imports, not a verified complete tree:

| Module or area | Responsibility |
| --- | --- |
| `App.tsx` | Application state, session handling, action wiring; calls `services/apiClient.prepareAiDraft` and `validateDecisionOnServer` |
| `components/SignInPage` | Demonstration account selection and safety notice |
| `components/NewEncounterModal` | Infant and encounter registration |
| `components/ObservationPanel` | Observation entry, quality and completeness display, and **drone capture view** (feasible + not-feasible lists) |
| `components/EncounterDetail` | Evidence review, decisions, referrals, follow-up, and history |
| `pages/CareQueuePage` | Encounter queue |
| `pages/EquipmentPage` | Equipment records and readiness limitations |
| `pages/GovernancePage` | Protocol, account and data-governance information |
| `pages/WorkflowPage` | Proposed local operating model |
| `pages/ProgramPage` | Programme roadmap and evidence presentation |
| `services/clinicalWorkflow` | Workflow permissions, validation, record transitions, and structured classification evaluation (`evaluateClassificationRules`) |
| `services/aiDraft` | Shared, client-safe draft helpers (`buildLocalDraft`, model names, prompt fragments) |
| `services/apiClient` | Authenticated fetch to the optional server; graceful fallback to the local template |
| `services/dataStore` | Persistence (schema v4), session, reset, export, and defensive filtering of stale encounters |
| `server.ts` | Express entry point: `/api/health`, `/api/clinical/ai-draft`, `/api/clinical/sign-decision` |
| `server/aiDraftServer.ts` | Server-only live Gemini draft preparation with identifier scrubbing |
| `fixtures/` | 12 synthetic input fixtures and a standalone fixture-generation helper |
| `scripts/fixtureSelfCheck.ts` | 16 isolated helper checks; writes `docs/module-self-check-results.json` |
| `scripts/listScenarios.ts` | Prints the 12-scenario catalogue |

A displayed control does not establish backend enforcement, protocol completeness or a secure integration. Review the service code alongside the interface.

## AI behaviour and configuration

Two paths, both controlled by `services/apiClient.ts`:

1. **Server-side live** — the client posts a scrubbed payload to `/api/clinical/ai-draft`. The server scrubs again, builds a prompt, and calls `gemini-2.5-flash`. The returned draft has `simulated: false`. Provider key is only read in `server/aiDraftServer.ts` and never bundled into the browser.

2. **Client local fallback** — if the server is unreachable, or returns `503` (`AI provider not configured` or model failure), the client uses `services/aiDraft.buildLocalDraft`. The draft has `simulated: true` and includes the reason ("Server unavailable in this session…") in the limitations block.

The physician-signing path additionally calls `/api/clinical/sign-decision`. The server enforces:
- Session claims present (`X-User-Id`, `X-User-Role`, `X-Facility-Id`)
- Role is `Physician`
- Facility on the session matches the encounter's `facilityId`

If the server is unreachable, the client falls back to local validation with the same guards.

**What no AI path does:** diagnose, classify severity, assign a probability or confidence score, recommend treatment, or sign a decision. Every draft carries a `limitations` string stating this. The `simulated` flag distinguishes offline from live.

## Clinical reference and governance

PCIMNE is the intended national clinical reference (IMCI in earlier English material). The project intends to use the young-infant pathway most recently adopted by Madagascar's Ministry of Health.

Before any patient-facing use, record:

- Exact document title, edition and adoption reference.
- Implemented sections and age group.
- Permission to reproduce the source material.
- Source-to-field and source-to-rule mapping.
- Which findings need trained in-person assessment.
- Qualified reviewer, review date and release status.
- The protocol version attached to each encounter.

Choosing a protocol is not validation of its digital translation, and it does not imply Ministry endorsement of this software. The demonstration approval control is not a clinical approval. Urgent care must not wait for an AI draft, a connection or an aircraft. No autonomous medication or invasive action is in scope.

## Data handling and security

The demonstration stores data in the browser, shares nothing with a facility, and has no authentication backend. Do not enter real names, images, health information or credentials.

- Browser persistence is not encrypted, synchronised offline storage.
- Client-side role checks are not server-side authorisation. The optional server adds a second check on the signing path; it is not production authentication.
- The history view is not a tamper-evident audit log.
- An external record reference field is not an integration.
- The AI integration can change data flows. The server scrubs identifiers from observation payloads before the model call, but this is not a data-processing agreement.

A patient-facing deployment would need separately built and reviewed identity, access scoping, encryption, audit, retention, consent and data-processing arrangements.

## Testing and evidence

`npm run verify` runs three checks:

| Check | What it proves |
| --- | --- |
| `npm run typecheck` | TypeScript compiles with no type errors |
| `npm run build` | Vite produces a production bundle |
| `npm run fixtures:self-check` | 16 isolated checks pass against the fixture-generation helper using a mock in-memory store |

The 16 checks are: scenarios build, IDs unique, synthetic flag, shape valid, clinical caveat present, mother-patient link, encounter-patient link, no AI draft, no physician decision, no drone equipment mode, fingerprint deterministic, fingerprint unique, store put/get, store list, store clear, safety-boundary cases.

**What this does not prove:** application behaviour, UI behaviour, the physician signature gate end-to-end, clinical accuracy, AI accuracy, or drone flight. No React component is exercised by the 16 checks. No model is called. No aircraft is operated. The output is committed at `docs/module-self-check-results.json` and can be regenerated at any commit.

Record each completed check:

| Field | Record |
| --- | --- |
| Build | Commit identifier and configuration |
| Test | Type check, build, fixture helper, functional, usability, protocol, hardware or flight |
| Method | Scenarios, expected results and reviewer |
| Date | When it was performed |
| Result | Passes, failures and denominators |
| Limitations | Gaps and unresolved defects |

## Equipment, drone and sensor boundaries

The equipment page states that no aircraft is operated by this application, and the drone remains an unproven component. Readiness checks recorded in the interface are simulated.

The application contains a **drone capture requirements matrix** (`DroneCaptureRequirements` type; `DRONE_REQUIREMENTS` map in `data/observations.ts`), accessible through the "Drone capture view" toggle in the evidence panel. For each observation, the matrix declares:

- Whether the observation is plausibly capturable from a stabilised camera (12 of 30 are marked feasible)
- Standoff range, minimum resolution, frame rate, lighting requirement, minimum duration
- Validity and invalidity conditions
- A required `notFeasibleReason` when `feasible === false`

Every entry in the view is labelled **"Proposed for bench validation"**. The matrix is **design intent**, not capability. It is what the 12-month programme would test on a stationary bench.

For the skin-pinch observation, a `proposedSubstitute` field declares a caregiver-mediated, camera-supervised pathway — the caregiver performs the pinch, the physician reviews the recording — together with a parallel note that a consumer wearable pulse sensor (PPG) is proposed for bench study. Neither substitute is implemented. Neither is validated. Both are research questions.

The operating model must still specify what is carried, who handles it, which observations are feasible, how data reaches a physician and how equipment is maintained. A delivery is not an assessment. Drone use must be compared with teleconsultation, existing outreach and facility visits, and needs qualified operators and permissions.

## Prepared scenarios and helper self-check

12 synthetic input fixtures and a fixture-generation helper with 16 isolated checks:

```sh
npm run fixtures:list        # print the 12-scenario catalogue
npm run fixtures:self-check  # run the 16 checks; write docs/module-self-check-results.json
```

**Scope:**

- Standalone helper + mock in-memory store — **not** application tests
- **Not** clinical tests; no clinical classification is evaluated
- **No** AI model is called; every fixture has `aiDraft: null`
- **No** physician decision is recorded; every fixture has `physicianDecision: null`
- **No** drone operation; no fixture references drone-assisted outreach

See [docs/SCENARIOS.md](docs/SCENARIOS.md), [docs/HELPER_SELF_CHECK.md](docs/HELPER_SELF_CHECK.md), and the generated [docs/module-self-check-results.json](docs/module-self-check-results.json).

## Roadmap

These are development directions, not completed features or confirmed partnerships:

1. Verify and version the national PCIMNE reference.
2. Complete prioritised infant rules and condition-specific follow-up.
3. Add bounded maternal-needs and reviewed counselling modules.
4. Evaluate one clearly defined, evidence-linked AI task.
5. Bench-test the drone camera and sensor capture requirements against a stationary synthetic target; document failure modes.
6. Draft the sensor-to-airframe requirements matrix with the clinical partner.
7. Prepare and submit the clinical validation protocol for the bench pipeline and the caregiver-mediated skin pinch.
8. Add production authentication, secure records and offline synchronisation.
9. Evaluate limited voice interaction where justified.
10. Run authorised drone feasibility with qualified operators.
11. Evaluate caregiver experience, referral outcomes, reliability and cost.
12. Publish reusable software, documentation and non-identifying progress evidence.

The proposed local context is Ranomafana-Ifanadiana, Vatovavy. That is planning, not a pilot agreement.

## Contributing

Discuss the scope of a change first and use synthetic-only examples.

- Keep recorded evidence, AI drafts and physician decisions separate.
- Label simulations explicitly.
- Do not weaken consent, missing-data or role checks.
- Keep clinical changes traceable to their source and subject to clinical review.
- Run `npm run verify` before submitting.
- Never commit patient data, secrets or unlicensed material.

Report security issues privately, not in public issues. Add a verified reporting contact before deployment.

## Licensing and ownership

`package.json` declares the licence as **Apache-2.0**. Make sure the repository contains a matching `LICENSE` file, and review the licences of all dependencies and bundled assets.

The declared licence does not settle ownership or content rights. Clarify these before release:

- The relationship between NdaY' Enterprise and any earlier AGIR work.
- Permission to reproduce national protocol content.
- Terms for AI models, images and any device or aircraft designs.

Do not imply UNICEF or Ministry endorsement or partnership without documented permission.

## Project lead

Nirina Yves Andrianaivojaona - NdaY'Radoko, a NdaY' Enterprise project.

Add verified contacts and contributor roles before publication. List clinical advisers and partners only with their actual, agreed role.

## Maintainer publication checklist

- [ ] Replace the repository URL and directory placeholders.
- [ ] Run `npm ci` and `npm run verify` from a clean checkout and record the results.
- [ ] Commit the lockfile that matches the package manager used.
- [ ] Confirm `.env.example` is present and `.env` is gitignored.
- [ ] Confirm the AI draft mode (server-live vs local-simulated) and where the key is used.
- [ ] Include every imported service, type, data file and image asset.
- [ ] Add the `LICENSE` file matching Apache-2.0 and a third-party notice.
- [ ] Verify the protocol edition and clinical review status.
- [ ] Add a private security contact.
- [ ] Make the repository, application text and demo video describe the same current capabilities.