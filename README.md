# NdaY'Radoko

## Bringing assessment capability closer to mothers and young infants

NdaY'Radoko is a NdaY' Enterprise project developing a physician-supervised outreach service for infants aged 0-59 days in underserved communities in Madagascar.

The service vision is to reverse part of the journey to care: bring a portable, PCIMNE-guided assessment system closer to the household, connect collected evidence to a physician, and maintain referral and follow-up when needed. The intended architecture combines a digital clinical application, an onboard assessment platform, selected device and drone-mounted sensors (proposed for bench validation, not yet flown), and a connected data platform.

This repository documents the software prototype (package version 0.3.0). The integrated service vision must not be confused with functionality already demonstrated by this build.

> **Prototype safety notice.** Use synthetic demonstration data only. This application is a FemTech readiness demonstration, not a medical device, and is not clinically validated. Its role selection is a demonstration, not production authentication. No aircraft is flown by this application. A bench-test video pipeline exists (RTMP to HLS) for a DJI Mini 3, but no flight, autonomous sensor interpretation, or real-patient capture is implemented. Do not use it to decide whether a real infant or mother needs care.

## Contents

- [Technology and requirements](#technology-and-requirements)
- [Current implementation](#current-implementation)
- [Demo feature status](#demo-feature-status)
- [Getting started](#getting-started)
- [Live drone feed setup](#live-drone-feed-setup)
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
| Backend / Media Server | Express `^4.21.2`, CORS `^2.8.5`, Node Media Server `^2.7.4` |
| Server runtime | tsx `^4.19.2`, concurrently `^9.1.0` |
| Build tool | Vite `^6.2.0` with `@vitejs/plugin-react` `^5.0.0` |
| Language | TypeScript `~5.8.2` |
| Styling | Tailwind CSS `^3.4.17`, PostCSS, Autoprefixer |
| Declared licence | Apache-2.0 |

`"private": true` only prevents accidental publication to the npm registry. It says nothing about whether the Git repository is public or private.

The manifest declares no `test` or `lint` script. It declares `typecheck`, `build`, `verify` (typecheck + build + fixture self-check), `fixtures:list`, `fixtures:self-check`, `server`, `stream`, and `dev:all`. There is no runtime dependency for production authentication, a database, or a shared record service; a single optional Express server handles AI draft generation, physician-signing authorization, and the local drone video stream.

## Current implementation

This status reflects the current local working tree at commit `HEAD` (see `git rev-parse HEAD`) and the results of `npm run verify`. It is not a clinical evaluation, pilot, or release record.

| Component | Status in supplied source | Important boundary |
| --- | --- | --- |
| Infant and encounter registration | Synthetic encounter saved with caregiver consent and separate image-capture choice; location cascade; commune-linked CSB placeholder exercised | Synthetic records only; facility directory must be verified before operational use |
| Encounter workflow | Local queue, assessment state, evidence tab, AI draft tab, physician-review path, and "Drone capture view" toggle in the evidence panel | Demo state machine and roles only; no production authentication or facility transmission |
| Observations and assessment review | Structured catalogue with source, quality, and remote-feasibility flags; a type-level **drone capture requirements matrix**; deterministic classification comparison against source-mapped criteria | Training pack and criteria are explicitly non-medical; no approved clinical rule set or Madagascar protocol mapping is supplied |
| Proposed substitute (skin pinch) | `proposedSubstitute` field declares a caregiver-mediated camera-supervised pathway for the in-person-only skin pinch observation | Research question only; not implemented; no validation |
| Live Drone Feed (Bench) | New `DroneFeed` component ingests a local RTMP stream converted to HLS via `node-media-server`. Shows "Connecting", "Live", and "Offline" states based on stream availability. | No flight. No real patient. Synthetic target only. Proves video ingestion pipeline works. |
| AI assistance | Server-side draft endpoint (`/api/clinical/ai-draft`) calls a configured Gemini model; client falls back to a deterministic local template when the server is unavailable or the key is absent; every draft is labelled `simulated` or `live` | Provider key is never bundled into the browser; no live model in offline demo; no sensor interpretation in this build |
| Physician decisions | Async server-side authorization gate (`/api/clinical/sign-decision`) plus local state machine; sign requires a physician account at the encounter's facility | Not verified professional identity; no external referral network; no clinical sign-off |
| Drone capture requirements | Per-observation requirements matrix (standoff, resolution, frame rate, lighting, minimum duration, validity and invalidity conditions) exposed through a dedicated evidence-panel view | **Design intent only.** No aircraft is flown. Requirements are labelled "Proposed for bench validation" |
| Data persistence | Browser-local demonstration store (schema v4); stale encounters from earlier schemas are dropped defensively | No facility sharing; no secure offline synchronisation |
| Fixture self-check | 16 isolated checks against a standalone fixture-generation helper using a mock in-memory store; generates `docs/module-self-check-results.json` | Not application tests; not clinical tests; not performance measurements |

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

If there is no lockfile, use `npm install` and commit the generated `package-lock.json` so installs are reproducible.

### 3. Optional: configure the server-side AI

Copy `.env.example` to `.env` and fill in `GEMINI_API_KEY` if you want the live model path. The browser bundle is always built with empty provider-key values (`vite.config.ts`), so the key never leaves the server.

### 4. Run the scripts

| Command | Purpose |
| --- | --- |
| `npm run dev` | Start the development server (client only, port 4000) |
| `npm run server` | Start the optional Express backend (port 4001) |
| `npm run stream` | Start the local RTMP/HLS media server for the drone feed (port 1935/8000) |
| `npm run dev:all` | Start the web app, API server, and media server concurrently |
| `npm run build` | Create a production build |
| `npm run typecheck` | Run the TypeScript type check |
| `npm run fixtures:list` | Print the 12-scenario fixture catalogue |
| `npm run fixtures:self-check` | Run the 16 fixture-helper checks |
| `npm run verify` | `typecheck` + `build` + `fixtures:self-check` — the full verification pipeline |

Open `http://localhost:4000/NdaY-Radoko-3.0/` for the local development server.

---

## Live drone feed setup

To see the live feed from a DJI Mini 3 on your desk:
1. Start everything: `npm run dev:all`
2. Connect your iPhone to the DJI RC-N1 controller and open DJI Fly.
3. Go to **Transmission** → **Live Streaming** → **RTMP**.
4. Enter the URL: `rtmp://YOUR_MAC_IP:1935/live/drone` (find your IP with `ipconfig getifaddr en0`).
5. Tap **Start**.
6. Open the NdaY'Radoko app in **Safari** (required for native HLS support).
7. Navigate to an encounter → **Evidence** tab → **Drone capture view**. The live feed will appear at the top of the list.

If the stream is not connected, the app will show a red "Offline" state with instructions.

---

## Reviewer walkthrough

1. Start the app and read the synthetic-data and prototype notices.
2. Select the Field Officer demonstration account (Lova, Community Health Agent).
3. Register a synthetic infant. Try Faritany Fianarantsoa → Region Vatovavy → District Ifanadiana → Commune Ifanadiana; note that the CSB is a directory placeholder. Record consent and image permission separately.
4. Open the new encounter and review the concern prompts and evidence catalogue. Missing observations should remain "not assessed", not be interpreted as normal.
5. Click **Drone capture view** in the evidence panel. The panel shows the live video feed (if connected), the 12 feasible observations with their strict capture requirements (standoff, resolution, lighting), and a "Not feasible via drone" section (skin pinch, fontanelle, temperature, weight, etc.) with the reason for each. **No aircraft is flown. This is design intent and bench-test pipeline demonstration, not clinical capability.**
6. Review the physician decision screen. It uses source-mapped classification criteria and shows evaluation badges ("Observations suggest match" / "no match" / "Insufficient evidence") per rule. Do not sign a decision. The demo does not exercise signature.
7. Prepare a documentation draft. It should identify a deterministic local template or a live model call, list missing evidence, and say it is not a diagnosis.
8. Use the reset control to restore the seeded synthetic cases. Do not enter real names, dates of birth, contacts, household locations, images, or health records.

## Architecture

A React and TypeScript single-page application built with Vite, plus an optional Node.js server for AI draft generation, physician-signing authorization, and media streaming.

| Module or area | Responsibility |
| --- | --- |
| `App.tsx` | Application state, session handling, action wiring |
| `components/SignInPage` | Demonstration account selection and safety notice |
| `components/NewEncounterModal` | Infant and encounter registration |
| `components/ObservationPanel` | Observation entry, quality display, and **drone capture view** |
| `components/DroneFeed` | HLS video player with live/connecting/error states for the bench drone |
| `components/EncounterDetail` | Evidence review, decisions, referrals, follow-up, and history |
| `pages/CareQueuePage` | Encounter queue |
| `pages/EquipmentPage` | Equipment records and readiness limitations |
| `pages/GovernancePage` | Protocol, account and data-governance information |
| `pages/WorkflowPage` | Proposed local operating model |
| `pages/ProgramPage` | Programme roadmap and evidence presentation |
| `services/clinicalWorkflow` | Workflow permissions, validation, record transitions, and structured classification evaluation |
| `services/aiDraft` | Shared, client-safe draft helpers |
| `services/apiClient` | Authenticated fetch to the optional server; graceful fallback |
| `services/dataStore` | Persistence (schema v4), session, reset, export |
| `server.ts` | Express API entry point |
| `server/aiDraftServer.ts` | Server-only live Gemini draft preparation |
| `server/streamServer.mjs` | Node Media Server for RTMP to HLS ingestion |
| `fixtures/` & `scripts/` | 12 synthetic input fixtures and the 16-check self-test helper |

## AI behaviour and configuration

Two paths, both controlled by `services/apiClient.ts`:

1. **Server-side live** — the client posts a scrubbed payload to `/api/clinical/ai-draft`. The server scrubs again, builds a prompt, and calls `gemini-2.5-flash`. The returned draft has `simulated: false`.
2. **Client local fallback** — if the server is unreachable, or returns `503`, the client uses `services/aiDraft.buildLocalDraft`. The draft has `simulated: true` and includes the reason in the limitations block.

The physician-signing path additionally calls `/api/clinical/sign-decision`. The server enforces role, facility matching, and session claims.

**What no AI path does:** diagnose, classify severity, assign a probability, recommend treatment, or sign a decision.

## Clinical reference and governance

PCIMNE is the intended national clinical reference (IMCI in earlier English material). The project intends to use the young-infant pathway most recently adopted by Madagascar's Ministry of Health.

Before any patient-facing use, record: exact document title, edition and adoption reference, permission to reproduce, source-to-field mapping, which findings need in-person assessment, and the qualified reviewer.

Choosing a protocol is not validation of its digital translation, and it does not imply Ministry endorsement. The demonstration approval control is not a clinical approval. Urgent care must not wait for an AI draft, a connection or an aircraft.

## Data handling and security

The demonstration stores data in the browser, shares nothing with a facility, and has no authentication backend. Do not enter real names, images, health information or credentials.

A patient-facing deployment would need separately built and reviewed identity, access scoping, encryption, audit, retention, consent and data-processing arrangements.

## Testing and evidence

`npm run verify` runs three checks:

1. `npm run typecheck`
2. `npm run build`
3. `npm run fixtures:self-check` (16 isolated checks against the fixture-generation helper)

**What this does not prove:** application behaviour, UI behaviour, the physician signature gate end-to-end, clinical accuracy, AI accuracy, or drone flight. No React component is exercised by the 16 checks. No model is called. No aircraft is flown.

## Equipment, drone and sensor boundaries

The equipment page states that no aircraft is flown by this application, and the drone remains an unproven component. Readiness checks recorded in the interface are simulated.

The application contains a **drone capture requirements matrix**, accessible through the "Drone capture view" toggle. For each observation, the matrix declares whether it is plausibly capturable from a stabilised camera, the standoff range, resolution, lighting requirement, and validity/invalidity conditions.

Every entry is labelled **"Proposed for bench validation"**. The matrix is **design intent**, not capability. It is what the 12-month programme would test on a stationary bench. For the skin-pinch observation, a `proposedSubstitute` field declares a caregiver-mediated, camera-supervised pathway as a research question.

The video pipeline (RTMP to HLS) proves that a bench drone's camera can be securely ingested into the app. It does not prove clinical accuracy or flight safety.

## Prepared scenarios and helper self-check

12 synthetic input fixtures and a fixture-generation helper with 16 isolated checks. See [docs/SCENARIOS.md](docs/SCENARIOS.md), [docs/HELPER_SELF_CHECK.md](docs/HELPER_SELF_CHECK.md), and the generated [docs/module-self-check-results.json](docs/module-self-check-results.json).

## Roadmap

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

Discuss the scope of a change first and use synthetic-only examples. Keep recorded evidence, AI drafts and physician decisions separate. Label simulations explicitly. Do not weaken consent, missing-data or role checks.

## Licensing and ownership

`package.json` declares the licence as **Apache-2.0**. Make sure the repository contains a matching `LICENSE` file, and review the licences of all dependencies and bundled assets.

Do not imply UNICEF or Ministry endorsement or partnership without documented permission.

## Project lead

Nirina Yves Andrianaivojaona - NdaY'Radoko, a NdaY' Enterprise project.

## Maintainer publication checklist

- [ ] Run `npm ci` and `npm run verify` from a clean checkout.
- [ ] Confirm `.env.example` is present and `.env` is gitignored.
- [ ] Confirm the AI draft mode and where the key is used.
- [ ] Add the `LICENSE` file matching Apache-2.0.
- [ ] Verify the protocol edition and clinical review status.
- [ ] Make the repository, application text and demo video describe the same current capabilities.