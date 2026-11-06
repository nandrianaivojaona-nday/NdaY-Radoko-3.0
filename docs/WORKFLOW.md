# Local workflow — Radoko × PIVOT × public health system

This is a workflow **for discussion** — not an agreed partnership and not an approved clinical protocol.

## Model

Radoko augments the existing community–health-centre–hospital network rather than creating a parallel
service: community workers help obtain reliable observations, Radoko organises and transmits them, and an
authorised physician makes the clinical decision.

## Eight encounter steps

1. Identify the household and the reason for contact (avoid duplicate registration).
2. Apply the approved initial safety screen (urgent care bypasses AI and drone).
3. Decide whether equipment or drone support is needed — record logistics separately from the clinical encounter.
4. Collect and quality-check observations (source, time, value, units, quality, collector, evidence reference).
5. Send a reviewable encounter using explicit delivery states (saved locally → under review).
6. Physician reviews and records a decision (accept/reject/amend the AI summary; never auto-valid).
7. Communicate with the mother or caregiver and check understanding.
8. Complete follow-up or referral and record the outcome.

## How this maps to the code

The prototype now implements the transmission states, a separate logistics mission, a physician
accept/reject/amend control for the AI summary, an evidence reference per observation, and an optional
existing-record reference on the patient. Remaining planned work: replace the browser-local store with an
authorised shared data service, and replace the demo sign-in with authenticated, facility-scoped access.

## First workshop with PIVOT

Produce an agreed service diagram, a named clinical lead, one encounter workflow, a current referral map,
a data-integration plan, a limited evaluation design, and written partner responsibilities. The compelling
proposition: Radoko is a bounded extension of an existing public care network — not an isolated AI drone.
