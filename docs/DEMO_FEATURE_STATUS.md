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
- Rule-based comparison of structured observations against chart criteria, including safe handling of missing, conflicting, ambiguous, or unassessable evidence.
- Matching free text only to existing chart criteria, with unmatched text retained for professional review.
- Protocol-derived colour classification and linked actions. Current colours/classes/actions are not available as a live classification flow.
- Production authentication, protected server infrastructure, secure multi-user data storage, HMIS/DHIS2 integration, external referral transmission, public live metrics, camera/audio interpretation, and drone operation.
- Clinical pilot results, diagnostic accuracy, travel-time savings, clinical outcomes, and market-readiness evidence.

## Safe reviewer walkthrough

1. Start the local app and select the Field Officer demonstration account.
2. Register a synthetic infant. Use Fianarantsoa → Vatovavy → Ifanadiana → Ifanadiana to see the cascade and CSB placeholder.
3. Record synthetic consent and image choices, open the encounter, and review the evidence catalogue and 0/19 completeness state.
4. Prepare the draft. Confirm it identifies the deterministic local template, lists missing information, and says no approved protocol is attached.
5. Do not use the application to classify, treat, refer, or make care decisions for a real person.
6. Reset local demonstration data after the walkthrough.

## Build and credential boundary

On 8 November 2026, `npm run typecheck` and `npm run build` passed with the provider key unset. A redacted check confirmed the local key value was not present in the generated JavaScript bundle. Vite now supplies empty provider-key values to browser code; any future live AI integration must use a protected server-side endpoint. The build emitted non-blocking warnings for stale Browserslist data and a JavaScript chunk above 500 kB.

The exact working tree used for this review was not committed or checked for reviewer access. Freeze and share the evaluated source revision before using a video or application statement that refers to a specific release.
