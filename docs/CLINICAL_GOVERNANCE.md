# Clinical governance

## Protocol

Each protocol record carries a source, version, clinical-approval status, approver, import date, and
review date. The seeded Madagascar protocol is deliberately **"Draft — not reviewed"**. The
"Record demo clinical approval" button is a demonstration control, not a real sign-off.

## Roles and facilities

- **Physician** — reviews evidence and signs the disposition for encounters at their facility.
- **Field Officer** — creates encounters, records observations, triggers urgent escalation, records outcomes.
- **Program Admin** — manages protocols, team, facilities, and data; cannot sign clinical decisions.

## Signature record

A signed decision records physician identity, facility, timestamp, evidence fingerprint, whether
incomplete evidence was acknowledged, caregiver instructions, safety netting, and an append-only
amendment history. The AI draft is stored separately and cannot sign.
