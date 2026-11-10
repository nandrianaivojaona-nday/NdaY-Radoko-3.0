# NdaY'Radoko

## Bringing assessment capability closer to mothers and young infants

NdaY'Radoko is a NdaY' Enterprise project developing a physician-supervised outreach service for infants aged 0-59 days in underserved communities in Madagascar.

The service vision is to reverse part of the journey to care: bring a portable, PCIMNE-guided assessment system closer to the household, connect collected evidence to a physician, and maintain referral and follow-up when needed. The intended architecture combines a digital clinical application, onboard computing and selected assessment equipment, drone-assisted deployment, and a connected data platform.

This repository documents the software prototype (package version 0.3.0). The integrated service vision must not be confused with functionality already demonstrated by this build.

> **Prototype safety notice.** Use synthetic demonstration data only. This application is a FemTech readiness demonstration, not a medical device, and is not clinically validated. Its role selection is a demonstration, not production authentication. No aircraft is operated by this application. Do not use it to decide whether a real infant or mother needs care.

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
- [Equipment and drone boundaries](#equipment-and-drone-boundaries)
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
| Build tool | Vite `^6.2.0` with `@vitejs/plugin-react` `^5.0.0` |
| Language | TypeScript `~5.8.2` |
| Styling | Tailwind CSS `^3.4.17`, PostCSS, Autoprefixer |
| Node type definitions | `@types/node` `^22.14.0` |
| Declared licence | Apache-2.0 |

`"private": true` only prevents accidental publication to the npm registry. It says nothing about whether the Git repository is public or private.

The manifest declares no `test` or `lint` script, and no runtime dependency for authentication, a database or a backend. This README makes no claim about those capabilities.

## Current implementation

This status reflects a synthetic browser walkthrough and the existing TypeScript check and production build completed on 8 November 2026 for the current local working tree (HEAD `7a8a234`, with uncommitted changes). It is not a clinical evaluation, pilot, or release record.

| Component | Status in supplied source | Important boundary |
| --- | --- | --- |
| Infant and encounter registration | Synthetic encounter saved with caregiver consent and separate image-capture choice; location cascade and commune-linked CSB placeholder exercised | Synthetic records only; facility directory must be verified before operational use |
| Encounter workflow | Local queue, assessment state, evidence tab, draft tab and physician-review path are present | Demo state machine and roles only; no production authentication or facility transmission |
| Observations and assessment review | Structured catalogue, evidence-quality controls, completeness counter, and an Assess/Classify review screen using deterministic comparison against a synthetic training pack | Training pack is explicitly non-medical; no approved clinical rule set, Madagascar protocol mapping, or patient-care classification is supplied |
| AI assistance | Documentation draft uses a deterministic local template and is labelled simulated | Provider key injection is disabled in Vite; no live model integration, sensor interpretation, or drone control in this build |
| Physician decisions | Demonstration decision, review and outcome controls are present | Not verified professional identity, clinical sign-off, or an external referral network |
| Referral and follow-up | Outcome recording and urgent-escalation workflow | Not evidence of a functioning external referral network |
| Data persistence | Browser-local demonstration store | No demonstrated facility sharing or secure offline synchronisation |
| Governance | Protocol metadata, review information and demonstration approval control | A demo approval action is not real clinical or Ministry approval |
| Equipment | Readiness records and simulated checks | Not airworthiness, flight or clinical-device evidence |
| Integrated onboard system | Not demonstrated by the supplied components | Embedded execution and device acquisition need separate evidence |
| Maternal-needs and counselling modules | Part of the development roadmap | Not presented as completed |

## Demo feature status

The detailed verified feature list and safe walkthrough are in [docs/DEMO_FEATURE_STATUS.md](docs/DEMO_FEATURE_STATUS.md).

## Getting started

### Requirements

- Node.js 20 or later.
- npm (or another package manager that respects your lockfile).
- The full repository checkout. The application imports services, shared types, data definitions, utilities and image assets (for example under `/assets/images/`) that are not part of the component files alone.

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

### 3. AI draft behavior

No API key is needed. The current browser build always uses a deterministic local documentation template and labels it simulated. Vite intentionally injects empty provider-key values into the client bundle. Do not restore a provider secret to browser code; any future live model integration must use a protected server-side endpoint and undergo privacy and clinical-safety review.

### 4. Run the scripts

| Command | Script in `package.json` | Purpose |
| --- | --- | --- |
| `npm run dev` | `vite` | Start the development server |
| `npm run build` | `vite build` | Create a production build |
| `npm run typecheck` | `tsc --noEmit` | Run the TypeScript type check |
| `npm run preview` | `vite preview` | Serve the production build locally |

Open `http://localhost:4000/NdaY-Radoko-3.0/` for the local development server.

Suggested verification before sharing the repository:

```sh
npm ci
npm run typecheck
npm run build
```

On 8 November 2026, `npm run typecheck` and `npm run build` passed with the provider key unset. The build reported a stale Browserslist database and a JavaScript chunk above 500 kB; these warnings did not stop the build. This does not establish clinical safety or production readiness.

## Reviewer walkthrough

1. Start the app and read the synthetic-data and prototype notices.
2. Select the Field Officer demonstration account.
3. Register a synthetic infant. Try Faritany Fianarantsoa → Region Vatovavy → District Ifanadiana → Commune Ifanadiana; note that the CSB is a directory placeholder. Record consent and image permission separately.
4. Open the new encounter and review the concern prompts and evidence catalogue. Missing observations should remain “not assessed,” not be interpreted as normal.
5. Open Assess / classify (demo) to inspect the deterministic comparison and clinician-review gates using only the non-medical synthetic training pack. Do not import clinical rules or use real patient information.
6. Prepare the documentation draft. It should identify a deterministic local template, list missing evidence, and say it is not a diagnosis. The training comparison is not a clinical classification or treatment recommendation.
7. Use the reset control to restore the seeded synthetic cases. Do not enter real names, dates of birth, contacts, household locations, images, or health records.

Report problems with the build identifier, steps, expected result and actual result. Screenshots must contain synthetic data only.

## Architecture

A React and TypeScript single-page application built with Vite. `App.tsx` coordinates state, demonstration sessions, page selection and encounter actions.

This is a logical map based on imports, not a verified complete tree:

| Module or area | Responsibility |
| --- | --- |
| `App.tsx` | Application state, session handling and action wiring |
| `components/SignInPage` | Demonstration account selection and safety notice |
| `components/NewEncounterModal` | Infant and encounter registration |
| `components/ObservationPanel` | Observation entry and quality/completeness display |
| `components/EncounterDetail` | Evidence review, decisions, referrals, follow-up and history |
| `pages/CareQueuePage` | Encounter queue |
| `pages/EquipmentPage` | Equipment records and readiness limitations |
| `pages/GovernancePage` | Protocol, account and data-governance information |
| `pages/WorkflowPage` | Proposed local operating model |
| `pages/ProgramPage` | Programme roadmap and evidence presentation |
| `services/clinicalWorkflow` | Workflow permissions, validation and record transitions |
| `services/aiDraft` | AI-draft preparation |
| `services/dataStore` | Persistence, session, reset and export |

A displayed control does not establish backend enforcement, protocol completeness or a secure integration. Review the service code alongside the interface.

## AI behaviour and configuration

`App.tsx` calls `prepareAiDraft` with the encounter, patient, protocol and language. The interface keeps the draft separate from the physician's recorded decision and states that it is not a diagnosis.

Before claiming a working AI integration, document:

- Whether the build uses live generation, simulated output or both.
- The model and provider, and the variable that supplies credentials.
- Where the call runs (browser or server) and what data leaves the device.
- How protocol content is passed to the model.
- Timeout, failure and missing-key behaviour.
- Completed evaluation results and known failure modes.

The Assess/Classify screen demonstrates software gates against a synthetic non-medical fixture only. No diagnostic-accuracy figure, validated retrieval method, clinical rule engine, sensor interpretation or onboard inference is claimed. AI text must not invent observations or act as a clinical decision.

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

The demonstration stores data in the browser, shares nothing with a facility and has no authentication backend. Do not enter real names, images, health information or credentials.

- Browser persistence is not encrypted, synchronised offline storage.
- Client-side role checks are not server-side authorisation.
- The history view is not a tamper-evident audit log.
- An external record reference field is not an integration.
- The AI integration can change data flows. Inspect it before use.

A patient-facing deployment would need separately built and reviewed identity, access scoping, encryption, audit, retention, consent and data-processing arrangements.

## Testing and evidence

This README is not a test report. The manifest defines `typecheck` and `build` only; there is no automated test or lint script. No completed test counts, accuracy figures or flight results are claimed.

Record each completed check:

| Field | Record |
| --- | --- |
| Build | Commit identifier and configuration |
| Test | Type check, build, functional, usability, protocol, hardware or flight |
| Method | Scenarios, expected results and reviewer |
| Date | When it was performed |
| Result | Passes, failures and denominators |
| Limitations | Gaps and unresolved defects |

Planned targets (for example synthetic-scenario counts or pilot sites) belong in the roadmap, not in results.

## Equipment and drone boundaries

The equipment page states that no aircraft is operated by this application and that the drone remains an unproven component. Readiness checks recorded in the interface are simulated.

The operating model must still specify what is carried, who handles it, which observations are feasible, how data reaches a physician and how equipment is maintained. A delivery is not an assessment. Drone use must be compared with teleconsultation, existing outreach and facility visits, and needs qualified operators and permissions.

## Roadmap

These are development directions, not completed features or confirmed partnerships:

1. Verify and version the national PCIMNE reference.
2. Complete prioritised infant rules and condition-specific follow-up.
3. Add bounded maternal-needs and reviewed counselling modules.
4. Evaluate one clearly defined, evidence-linked AI task.
5. Demonstrate portable/onboard execution and selected equipment integration.
6. Add production authentication, secure records and offline synchronisation.
7. Evaluate limited voice interaction where justified.
8. Run authorised drone feasibility with qualified operators.
9. Evaluate caregiver experience, referral outcomes, reliability and cost.
10. Publish reusable software, documentation and non-identifying progress evidence.

The proposed local context is Ranomafana-Ifanadiana, Vatovavy. That is planning, not a pilot agreement.

## Contributing

Discuss the scope of a change first and use synthetic-only examples.

- Keep recorded evidence, AI drafts and physician decisions separate.
- Label simulations explicitly.
- Do not weaken consent, missing-data or role checks.
- Keep clinical changes traceable to their source and subject to clinical review.
- Run `npm run typecheck` and `npm run build` before submitting.
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
- [ ] Run `npm ci`, `npm run typecheck` and `npm run build` from a clean checkout and record the results.
- [ ] Commit the lockfile that matches the package manager used.
- [ ] Add `.env.example` with placeholder variable names for the AI service.
- [ ] Confirm the AI draft mode and where the key is used.
- [ ] Include every imported service, type, data file and image asset.
- [ ] Add the `LICENSE` file matching Apache-2.0 and a third-party notice.
- [ ] Verify the protocol edition and clinical review status.
- [ ] Add a private security contact.
- [ ] Make the repository, application text and demo video describe the same current capabilities.

## Prepared scenarios and helper self-check

12 synthetic input fixtures + a fixture-generation helper with 16 isolated
checks. Run:

```sh
npm run fixtures:list        # 12-scenario catalogue
npm run fixtures:self-check  # 16 helper checks + JSON output
Scope: standalone helper + mock store — not application tests, not clinical
tests, no AI model called, no physician decision recorded, no drone operation.
