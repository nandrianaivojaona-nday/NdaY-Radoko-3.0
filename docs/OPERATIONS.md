# Operations

## Household operation diagram

```mermaid
flowchart LR
    H[Household:<br/>caregiver + infant] --> A[Trained field assistant]
    A --> D[Device measurements<br/>temperature, respiratory rate]
    A --> V[Consent-based visual<br/>observations]
    D --> E[Evidence record<br/>source · time · unit · quality]
    V --> E
    E --> AI[AI documentation draft]
    AI --> P[Physician review<br/>at facility]
    E --> P
    P --> S{Disposition}
    S -->|Home follow-up| F[Follow-up scheduled]
    S -->|In-person assessment| R[Referral]
    S -->|Urgent referral| R
    F --> O[Outcome recorded]
    R --> O
    H -. danger sign reported .-> U[Urgent same-day care<br/>AI and drone bypassed]
```

## Failure handling

- Flight not possible → community teleconsultation or facility visit.
- Connectivity loss → unusable measurements are recorded as unusable, not normal.
- Inadequate image quality → "Unable to assess"; arrange in-person review.
- Equipment failure → logged; the clinical pathway continues without the drone.

The drone must demonstrate added value against community teleconsultation, existing outreach visits,
and household travel before it is justified.
