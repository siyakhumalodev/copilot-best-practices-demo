---
name: claims-rules
description: Simplified Contoso Insurance claims rulebook (R1-R10) for ClaimsDesk - policy cover, claimed amount, dates and required fields, excess and settlement estimate, fast-track triage, referral, standard review, claim lifecycle, personal data and service level. Use when analysing a claims story, implementing or reviewing anything in ClaimsDesk.Domain or the claims API or UI, writing claims tests, or checking an AI-generated change against the business rules.
---

# Claims rulebook (simplified)

> **Simplified rules for demonstration only - not real insurance terms.** Fictional company, synthetic data.
> If this rulebook is silent, ask the product owner - never invent a rule.

## Where things live

| What | Where |
|---|---|
| Policy cover (R1) | `src/ClaimsDesk.Domain/Policies/Policy.cs` -> `CoversIncidentOn` |
| Validation (R1-R3) | `src/ClaimsDesk.Domain/Claims/ClaimValidator.cs`, error codes in `ErrorCodes.cs` |
| Money helpers | `src/ClaimsDesk.Domain/Money.cs` (`RoundGbp`, `HasAtMostTwoDecimalPlaces`, `FormatGbp`) |
| Problem details | `src/ClaimsDesk.Api/Infrastructure/ProblemResults.cs` |
| Seed data | `src/ClaimsDesk.Api/Data/SeedData.cs` (dates relative to today) |

**Today** is the UTC date from the injected `TimeProvider`. **Money** is GBP `decimal`, 2 dp - never `float` or `double`.

## Rules

| ID | Rule | Notes |
|---|---|---|
| **R1** | **Policy cover.** A claim is covered only if the incident date is on or between the policy start and end dates (inclusive) **and** the policy is not Cancelled. A Lapsed policy still covers incidents that happened while it was in force. | Unknown policy -> `POLICY_NOT_FOUND` (field `policyNumber`), skip policy checks. Not covered -> `POLICY_NOT_IN_FORCE` (field `incidentDate`). |
| **R2** | **Claimed amount.** Greater than £0.00, at most 2 decimal places, and no more than the policy cover limit (inclusive). | `AMOUNT_OUT_OF_RANGE` (field `claimedAmount`). |
| **R3** | **Dates and required fields.** The incident date cannot be in the future. The reported date is the submission date and is set by the server. `policyNumber`, `peril`, `incidentDate` and `claimedAmount` are required. Description: 1-2,000 characters, not blank. Claimant name not blank; email contains `@`. | `INVALID_DATES`; `FIELD_REQUIRED` (field = the missing field); `DESCRIPTION_REQUIRED`; `CLAIMANT_DETAILS_REQUIRED` (field `claimantName` or `claimantEmail`). |
| **R4** | **Excess and settlement estimate.** Total excess = the policy excess **plus £250.00** when the peril is **Escape of water**. Estimated settlement = claimed amount - total excess, **never below £0.00**. | Story CLM-100. Domain calculation, not UI arithmetic. |
| **R5** | **Fast-track.** A claim is fast-track when **all** of these hold: (a) claimed amount <= the fast-track limit (default **£2,500.00**, configured as `Triage:FastTrackMaxAmount`, inclusive); (b) reported within **30 days** of the incident (inclusive); (c) **fewer than 2 prior claims**; (d) no referral indicator (R6). | Story CLM-101. **Prior claims** = other claims on the same policy, **excluding Withdrawn and Rejected**, with an incident date on or before this claim's incident date and no more than 365 days before it. |
| **R6** | **Referral** (possible fraud or complexity). Referred when **any** of: reported **more than 90 days** after the incident; incident within the **first 14 days of cover** (incident date - start date < 14 days); claimed amount **more than 80%** of the cover limit; **3 or more** prior claims. | A referred claim lists referral reasons only. |
| **R7** | **Standard review.** Neither referred nor fast-track. The reasons list every R5 condition (a)-(c) that failed. | See reason codes below. |
| **R8** | **Lifecycle.** Submitted -> InReview -> Approved or Rejected; Approved -> Settled; Submitted or InReview -> Withdrawn. Settled, Rejected and Withdrawn are closed. | Only Approved claims can be settled (`CLAIM_NOT_SETTLEABLE`, 409). Only Submitted or InReview claims can be withdrawn (`CLAIM_NOT_WITHDRAWABLE`, 409). |
| **R9** | **Personal data.** Claimant name and email are personal data. Never log them; never put them in URLs, error messages or exception text. API responses expose the name only on the claim detail and never the email. | Logs identify claims by `ClaimId` and `PolicyNumber` only. |
| **R10** | **Service level.** An open claim (Submitted, InReview, Approved) is overdue when more than **30 days** have passed since its reported date. `daysOpen` = today - reported date for open claims; `null` for closed claims. | Story CLM-102. The API decides what is overdue; the UI never shows it by colour alone. |

### Triage reason codes (R5-R7)

| Code | Message |
|---|---|
| `FAST_TRACK_ELIGIBLE` | Meets all fast-track criteria |
| `ABOVE_FAST_TRACK_LIMIT` | Claimed amount is above the fast-track limit of £2,500.00 (uses the configured value) |
| `LATE_NOTIFICATION` | Reported more than 30 days after the incident |
| `PRIOR_CLAIMS` | 2 or more prior claims in the last 12 months |
| `VERY_LATE_NOTIFICATION` | Reported more than 90 days after the incident |
| `NEW_POLICY` | Incident within the first 14 days of cover |
| `HIGH_VALUE_FOR_COVER` | Claimed amount is more than 80% of the cover limit |
| `FREQUENT_CLAIMS` | 3 or more prior claims in the last 12 months |

## Worked examples (seed data, today = 2026-11-02 in tests)

| Claim | Facts | R4 estimate | R5-R7 triage | R10 |
|---|---|---|---|---|
| CLM-2026-0001 | Home, escape of water, £1,850.00, policy excess £250.00, reported 2 days after, 1 prior claim | £1,850.00 - (£250.00 + £250.00) = **£1,350.00** | **Fast-track** | 18 days open |
| CLM-2026-0009 | Home, accidental damage, £240.00, excess £250.00, 2 prior claims | **£0.00** (floor) | **Standard** - `PRIOR_CLAIMS` | 2 days |
| CLM-2026-0003 | Home, theft, £3,200.00, reported 45 days after | £2,950.00 | **Standard** - `ABOVE_FAST_TRACK_LIMIT`, `LATE_NOTIFICATION` | 15 days |
| CLM-2026-0006 | Travel, lost baggage, £780.00, incident 5 days after cover started | £680.00 | **Referred** - `NEW_POLICY` | 4 days |
| CLM-2026-0011 | Motor, theft, £12,800.00 on £15,000.00 cover | £12,500.00 | **Referred** - `HIGH_VALUE_FOR_COVER` | 5 days |
| CLM-2026-0012 | Home, storm, reported 110 days after | £400.00 | **Referred** - `VERY_LATE_NOTIFICATION` | 40 days - **overdue** |

## Glossary

- **Excess** - the part of a claim the policyholder pays themselves.
- **Cover limit** - the most the policy pays for one claim.
- **Peril** - the cause of loss (theft, storm, escape of water ...).
- **Fast-track** - settled with minimal handling; **Referred** - sent to a specialist team before any decision.
