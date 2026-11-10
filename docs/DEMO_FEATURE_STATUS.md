# Demo Feature Status

Reviewed 8 November 2026 against the local application at Git HEAD `7a8a234` plus uncommitted working-tree changes. The existing TypeScript check and production build passed. This register describes a synthetic demonstration; it is not evidence of clinical validity, a pilot, or production readiness.

## Working in the current demonstrator

| Capability | What was observed | Boundary |
|---|---|---|
| Demonstration sign-in | Field Officer demo account opens the application | Role selection is not production authentication or verified professional identity |
| New encounter | Synthetic infant and caregiver details save as an encounter | Browser-local demonstration store only; never enter real patient data |
| Location cascade | Faritany → Region → District → Commune selection works for Fianarantsoa → Vatovavy → Ifanadiana → Ifanadiana | This is a geography selector, not a verified health-facility directory |
| Commune-linked CSB | A CSB option is enabled after choosing a commune | The selected entry is labelled as a directory placeholder; verify every facility before any real-world use |
| Consent choices | Caregiver consent and image-capture permission are distinct | A recorded choice does not establish a production consent or privacy system |
| Observation capture | Structured young-infant observations include evidence-quality choices; concern prompts prioritize questions | The concern checklist is navigation only. Observation references still say exact chart citation pending |
| Assess/Classify review screen | Source includes a clinician review panel and deterministic comparison workflow, now exposed from the encounter screen; the bundled pack contains two synthetic training patterns | Training fixture is explicitly not IMCI/PCIMNE. It does not demonstrate a clinically valid classification, Ministry-approved protocol, or AI interpretation of camera/audio data. Integration was not build-verified in this update |
| Completeness | Required missing evidence is shown explicitly; a new encounter showed 0/19 and stated missing is not normal | This is completeness tracking, not clinical interpretation |
| Documentation draft | With live provider-key injection disabled, the app creates a deterministic local template labelled simulated | It does not diagnose, classify, score, or recommend treatment; physician review remains necessary |
| Encounter history | Draft generation is recorded separately from physician decision and disposition | This is a local demo state machine, not facility transmission or an external referral |

## Simulated or placeholder content

| Capability | How it is represented |
|---|---|
| Clinical staff accounts and roles | Seeded demonstration users; no identity verification |
| Facilities and referral chain | Demonstration records and explicit directory placeholders; not a verified service directory |
| Protocol metadata | Draft reference material exists in source, but the live demonstration encounter has no approved protocol attached |
| AI | Local deterministic template only; no live provider call in this browser build |
| Drone/equipment readiness | Demonstration records only; no aircraft is operated and no flight has occurred |
| Pilot locality and service partnerships | Proposed only; no site or partner authorization is established |

## Planned or not implemented in the demonstrated workflow

- Exact source/page citation for every observation and approved chart item.
- Complete WHO/UNICEF young-infant chart mapping and qualified review.
- Madagascar protocol contextualization and approval, including documented reconciliation of WHO 2019 and 2024 differences.
- The full **ASK / LOOK / FEEL / MEASURE → ASSESS → CLASSIFY → TREAT / REFER / COUNSEL** sequence in the encounter.
- A clinically approved, complete rule-based comparison of observations against the applicable chart. The current software comparison is limited to a non-medical synthetic training pack; clinical rules, source/page mapping and qualified review are not provided.
- Matching free text only to existing clinical chart criteria, with unmatched text retained for professional review. The training demo's matching behavior must not be presented as medical interpretation.
- Protocol-derived colour classification and linked actions. Current colours/classes/actions are not available as a live classification flow.
- Production authentication, protected server infrastructure, secure multi-user data storage, HMIS/DHIS2 integration, external referral transmission, public live metrics, camera/audio interpretation, and drone operation.
- Clinical pilot results, diagnostic accuracy, travel-time savings, clinical outcomes, and market-readiness evidence.

## Safe reviewer walkthrough

1. Start the local app and select the Field Officer demonstration account.
2. Register a synthetic infant. Use Fianarantsoa → Vatovavy → Ifanadiana → Ifanadiana to see the cascade and CSB placeholder.
3. Record synthetic consent and image choices, open the encounter, and review the evidence catalogue and 0/19 completeness state.
4. Open Assess / classify (demo) and use only its bundled, non-medical training rules. Confirm the screen labels them as not IMCI/PCIMNE and shows review/confirmation gates.
5. Prepare the documentation draft. Confirm it identifies the deterministic local template and lists missing information.
6. Do not use the application to classify, treat, refer, or make care decisions for a real person.
7. Reset local demonstration data after the walkthrough.

## Build and credential boundary

On 8 November 2026, `npm run typecheck` and `npm run build` passed with the provider key unset. A redacted check confirmed the local key value was not present in the generated JavaScript bundle. Vite now supplies empty provider-key values to browser code; any future live AI integration must use a protected server-side endpoint. The build emitted non-blocking warnings for stale Browserslist data and a JavaScript chunk above 500 kB.

The exact working tree used for this review was not committed or checked for reviewer access. Freeze and share the evaluated source revision before using a video or application statement that refers to a specific release.

## Assess/Classify source integration note

The encounter UI now includes a route to `features/protocolReview/ClinicianReviewPanel.tsx`. The panel compares a synthetic encounter with the bundled training fixture and gates its placeholder outputs behind demonstration clinician review. This integration was not built or browser-verified as part of the pitch review. It does not implement the pitch's drone-based AI, camera/microphone interpretation, or medically valid IMCI/PCIMNE rules.

## Prepared scenarios and helper self-check (10 November 2026)

The repository now ships 12 synthetic input fixtures under `fixtures/`, a
standalone fixture-generation helper whose 16 isolated checks pass using a
mock store, and a generated artifact at `docs/module-self-check-results.json`.

**What this proves.** The helper builds shape-valid, synthetic-only scenario
records that satisfy the safety boundaries enforced in this build: no AI
draft, no physician decision, no drone equipment mode.

**What this does not prove.** Application behaviour, UI behaviour, the
physician sign gate, clinical accuracy, AI behaviour, or drone flight.

Regenerate with `npm run fixtures:self-check`.
