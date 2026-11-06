# NdaY'Radoko

## Bringing assessment capability closer to mothers and young infants

NdaY'Radoko is a NdaY' Enterprise project developing a physician-supervised outreach service for infants aged 0-59 days in underserved communities in Madagascar.

The service vision is to reverse part of the journey to care: bring a portable, PCIMNE-guided assessment system closer to the household, connect collected evidence to a physician, and maintain referral and follow-up when needed. The intended architecture combines a digital clinical application, onboard computing and selected assessment equipment, drone-assisted deployment, and a connected data platform.

This repository documents the software prototype (package version 0.3.0). The integrated service vision must not be confused with functionality already demonstrated by this build.

> **Prototype safety notice.** Use synthetic demonstration data only. This application is a FemTech readiness demonstration, not a medical device, and is not clinically validated. Its role selection is a demonstration, not production authentication. No aircraft is operated by this application. Do not use it to decide whether a real infant or mother needs care.

## Contents

- [Technology and requirements](#technology-and-requirements)
- [Current implementation](#current-implementation)
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

This status describes the supplied source snapshot. It is a source-level description, not a report that all functions have been executed or independently tested. Update it when implementation or evidence changes.

| Component | Status in supplied source | Important boundary |
| --- | --- | --- |
| Infant registration | Form for infants aged 0-59 days, caregiver details, receiving facility and consent | Synthetic records only |
| Encounter workflow | Encounter selection, queue and action wiring | Full runtime verification requires the complete repository |
| Observations | Structured entry, quality labels and completeness indicators | Entries are not proof that a clinical measurement was performed correctly |
| AI assistance | Draft-preparation service call and review workflow | Confirm whether the build uses live generation or simulated output |
| Physician decisions | Facility/role checks, decision recording and amendments | Demonstration controls, not verified professional identity |
| Referral and follow-up | Outcome recording and urgent-escalation workflow | Not evidence of a functioning external referral network |
| Data persistence | Browser-local demonstration store | No demonstrated facility sharing or secure offline synchronisation |
| Governance | Protocol metadata, review information and demonstration approval control | A demo approval action is not real clinical or Ministry approval |
| Equipment | Readiness records and simulated checks | Not airworthiness, flight or clinical-device evidence |
| Integrated onboard system | Not demonstrated by the supplied components | Embedded execution and device acquisition need separate evidence |
| Maternal-needs and counselling modules | Part of the development roadmap | Not presented as completed |

## Getting started

### Requirements

- Node.js 20 or later.
- npm (or another package manager that respects your lockfile).
- The full repository checkout. The application imports services, shared types, data definitions, utilities and image assets (for example under `/assets/images/`) that are not part of the component files alone.

### 1. Get the project

```sh
git clone <REPOSITORY_URL>
cd <REPOSITORY_DIRECTORY>
```

### 2. Install dependencies

If a `package-lock.json` is committed:

```sh
npm ci
```

If there is no lockfile, use `npm install` and commit the generated `package-lock.json` so installs are reproducible. If the repository holds `pnpm-lock.yaml` or `yarn.lock`, use that package manager instead. Do not mix lockfiles.

### 3. Configure environment (only if the AI draft needs it)

The project depends on `@google/genai`, so the AI-draft service may call the Google Gen AI API. The service implementation was not supplied, so the variable name, where the call runs and what the app does without a key are not documented here.

Check `services/aiDraft` and `vite.config.*`, then record the exact variable names in a committed `.env.example` with placeholder values only. Never commit a real key.

> Caution: Vite bundles code that runs in the browser. A key read by browser code can be extracted by any visitor. For anything beyond a synthetic-data demo, move the call to a server-side function and keep the key there.

### 4. Run the scripts

| Command | Script in `package.json` | Purpose |
| --- | --- | --- |
| `npm run dev` | `vite` | Start the development server |
| `npm run build` | `vite build` | Create a production build |
| `npm run typecheck` | `tsc --noEmit` | Run the TypeScript type check |
| `npm run preview` | `vite preview` | Serve the production build locally |

Open the address printed by `npm run dev`. Vite's default is `http://localhost:5173`, but `vite.config.*` may change it.

Suggested verification before sharing the repository:

```sh
npm ci
npm run typecheck
npm run build
```

Record the actual outcome and date in the testing section. No result is claimed here because these commands have not been run for this README.

## Reviewer walkthrough

1. Start the app and read the prototype/synthetic-data notice.
2. Select a field-officer demonstration account, if one is seeded.
3. Open a synthetic encounter or register a synthetic infant aged 0-59 days. Record caregiver consent and image permission separately.
4. Enter observations and inspect the quality states (not assessed, reported-unverified, measured, remotely observed, in person, unusable).
5. Save and inspect completeness. A missing or unusable finding must not be read as normal.
6. Prepare an AI draft if the build supports it, and check whether it is labelled as simulated.
7. Sign out and select the facility-matched physician demonstration account.
8. Review the evidence and draft, and request more information if needed.
9. Record a demonstration decision, then a referral or follow-up outcome.
10. Review the encounter history, protocol governance and equipment status. Simulated readiness is not flight evidence.
11. Use the reset control to restore the seeded synthetic cases.

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

No diagnostic-accuracy figure, validated retrieval method or onboard inference is claimed. AI text must not invent observations or act as a clinical decision.

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
