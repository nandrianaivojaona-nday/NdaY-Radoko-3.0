# Safety and privacy

## Safety controls

- **"Not assessed" ≠ "normal".** Each observation carries a quality flag; missing required
  observations block signature unless the physician acknowledges incompleteness with a reason.
- **Unusable evidence is labelled**, never silently converted to a normal finding.
- **Urgent referral bypasses the AI and the drone.** A field officer can record a same-day referral
  for a reported danger sign immediately.
- **Physician authority.** The AI draft cannot sign; a signed decision records physician identity,
  facility, timestamp, evidence fingerprint, and an amendment history.
- **Failure handling.** Connectivity, equipment, and unusable-measurement events are logged and the
  non-drone pathway remains usable.

## Privacy (prototype)

- All records are **synthetic** and stored only in the browser's local storage. No real patient data.
- The sign-in screen is a demonstration gate, not authentication. There is no encryption at rest, no
  backup, no retention or remote-wipe process, and no server-side audit log.

## Required before any pilot

Authorised shared data service with facility-scoped access, authenticated accounts, encryption in
transit and at rest, consent/retention/deletion processes, a data-processing agreement, incident
reporting, breach response, and an offline policy that does not create unmanaged copies.
