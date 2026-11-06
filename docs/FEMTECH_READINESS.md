# FemTech readiness

## From prototype to evidence

NdaY'Radoko's strongest Femtech application is **not** "an AI drone replacing health workers". It is a
physician-supervised service that brings young-infant assessment closer to remote households, reduces
avoidable travel for recovering mothers and infants, and preserves timely referral when in-person care
is necessary. That maps directly to the UNICEF Femtech Ventures first pillar (antenatal and postnatal
support, newborn and child health, primary/community care).

This repository implements a disciplined transition from prototype to evidence:

| Area | Status in this repository |
| --- | --- |
| Patient workflow | Working: encounters, observations, AI draft, physician review, disposition, follow-up/referral |
| AI reporting | Working: separate AI draft vs signed decision, with model and protocol provenance |
| Protocol management | Working: source, version, clinical-approval status, review date |
| Drone operations | Simulated/planned: readiness records only; no aircraft is operated |
| Performance | Honest: no accuracy or clinical-outcome claims are made |
| Identity | Working (demo): roles bound to accounts and facilities; not production auth |
| Persistence | Planned: browser-local demo store only; not a shared health record |

## Core application message

> NdaY'Radoko addresses the distance between remote households and qualified young-infant care. Our
> proposed service combines structured assessment support, AI-assisted documentation, and a defined
> drone-enabled outreach pathway, with clinical decisions retained by physicians at participating
> health facilities.

## What must be true before 4 November 2026

1. Eligibility evidence (legal entity, registration, ownership, team).
2. Reproducible demonstration with simulated parts labelled.
3. Clinical partnership with written responsibilities and named expertise.
4. Household operation diagram (see `docs/OPERATIONS.md`).
5. Women-centred problem statement grounded in consultations or clearly stated evidence gaps.
6. Honest results record (what was tested, with whom, what was learned).
7. Feasible work plan and budget.
8. Risk and privacy plan.
9. Repository and release plan.

Do **not** invent pilot users, partner commitments, accuracy, travel savings, or clinical outcomes.
