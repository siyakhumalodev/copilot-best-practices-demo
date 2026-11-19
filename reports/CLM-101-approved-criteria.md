---
description: "Approved CLM-101 criteria, shared API contract, and scoped delivery decisions."
---

# CLM-101 approved criteria

## Approval

The approver replied on 2026-11-19:

> Approved

Approval applies to G1-G11, mandatory G12, the proposed API contract, and the recommendations in the gate summary.
All applicable referral reasons are returned without a prescribed business order. Triage is recalculated for each
detail response, including closed claims. GET and POST share the same detail contract.

No invalid-configuration policy was selected. Do not introduce business validation, coercion or silent fallback for
invalid configured values. Retain normal .NET decimal configuration binding failures; valid configuration and the
absent-setting default are in scope. Additional configuration-policy decisions remain with the product owner.

## Original story and acceptance criteria

**As a** claims handler **I want** low-value, straightforward claims flagged for fast-track **so that** customers with simple
claims are paid quickly.

- **AC1** Given a claim of £2,500 or less that was reported within 30 days of the incident, when I open it, then it shows
  "Fast-track".
- **AC2** Given a claim above £2,500, when I open it, then it shows "Standard review" with the reason "Claimed amount is above
  the fast-track limit of £2,500.00".
- **AC3** Given a claim reported more than 30 days after the incident, when I open it, then it shows "Standard review" with
  the reason "Reported more than 30 days after the incident".
- **AC4** The claim detail screen shows the triage outcome as a badge, with its reasons.

The following approved clarifications govern AC1-AC3 wherever the original wording omits referral or history conditions.

## Approved gap criteria

Each isolated scenario assumes otherwise-valid data and no unrelated referral indicators.

| ID  | Rule     | Approved Given / When / Then |
|-----|----------|-----------------------------|
| G1  | R5, R6   | Given a claim at or below the effective fast-track limit, reported within 30 days inclusive, with fewer than two qualifying prior claims and no referral indicator, when assessed, then return FastTrack with FAST_TRACK_ELIGIBLE. |
| G2  | R5, R7   | Given the default limit of £2,500.00 or a configured limit such as £3,000.00, when an otherwise-eligible claim equals the limit, then it qualifies; one penny above is StandardReview with ABOVE_FAST_TRACK_LIMIT whose message uses that same configured GBP value. |
| G3  | R5, R7   | Given exactly two qualifying prior claims and otherwise-fast-track facts, when assessed, then return StandardReview with PRIOR_CLAIMS; one qualifying prior does not prevent fast-track. |
| G4  | R5       | Given history candidates, when counting prior claims, then count other claims on the same policy with incident dates from target incident minus 365 days through target incident inclusive; exclude the target itself, other policies, Withdrawn and Rejected. Submitted, InReview, Approved and Settled otherwise qualify. Use incident dates, not reported dates or calendar-month arithmetic. |
| G5  | R5-R7    | Given otherwise-eligible claims reported 30, 31, 90 and 91 days after the incident, when assessed, then return FastTrack, StandardReview with LATE_NOTIFICATION, StandardReview with LATE_NOTIFICATION, and Referred with VERY_LATE_NOTIFICATION respectively. |
| G6  | R6       | Given an incident during the first 14 days of cover, when assessed, then return Referred with NEW_POLICY. Day offsets 0-13 qualify for referral; offset 14 does not. |
| G7  | R6       | Given an amount strictly greater than 80% of cover, when assessed, then return Referred with HIGH_VALUE_FOR_COVER; exactly 80% does not trigger this reason. |
| G8  | R6       | Given at least three qualifying prior claims, when assessed, then return Referred with FREQUENT_CLAIMS; exactly two do not trigger this referral reason. |
| G9  | R5-R7    | Given any referral indicator, when assessed, then referral takes precedence over fast-track and standard review. Return all applicable referral reasons only, never standard or eligible reasons. |
| G10 | R7       | Given no referral indicators but one or more failed R5 conditions (amount, delay, prior count), when assessed, then return StandardReview and every applicable failure reason. |
| G11 | R5-R7    | Given a claim detail response, when displayed, then show Fast-track, Standard review or Referred in a separate textual badge and show all returned reason messages. Keep the lifecycle badge separate; do not calculate business rules in the UI. |
| G12 | R9       | Given triage and policy history evaluation, when responding or logging, then preserve existing detail-only claimant-name exposure, never expose email or history claimant details, and never put personal data in reasons, URLs, errors or logs. |

## Shared API contract

GET `/api/claims/{claimId}` (200) and POST `/api/claims` (201) add a required non-null `triage` object to
`ClaimResponse`. GET list summaries, existing fields, status codes, Location and problem-details contracts stay unchanged.
Recalculate rather than persist the decision; exclude the target from its own history on both response paths.

| JSON path                 | C# type                                       | TypeScript type        |
|---------------------------|-----------------------------------------------|------------------------|
| triage                    | TriageResponse                                | TriageResponse         |
| triage.outcome            | TriageOutcome                                 | TriageOutcome          |
| triage.reasons            | IReadOnlyList<TriageReasonResponse>            | TriageReasonResponse[] |
| triage.reasons[].code     | string (named reason-code constants)          | TriageReasonCode       |
| triage.reasons[].message  | string                                        | string                 |

Use camelCase properties and existing PascalCase enum wire values.
`TriageOutcome = "FastTrack" | "StandardReview" | "Referred"`.
`TriageReasonCode` is the union of the exact strings below.

| Code                   | Message                                                        |
|------------------------|----------------------------------------------------------------|
| FAST_TRACK_ELIGIBLE    | Meets all fast-track criteria                                  |
| ABOVE_FAST_TRACK_LIMIT | Claimed amount is above the fast-track limit of £2,500.00        |
| LATE_NOTIFICATION     | Reported more than 30 days after the incident                   |
| PRIOR_CLAIMS          | 2 or more prior claims in the last 12 months                    |
| VERY_LATE_NOTIFICATION | Reported more than 90 days after the incident                   |
| NEW_POLICY            | Incident within the first 14 days of cover                     |
| HIGH_VALUE_FOR_COVER   | Claimed amount is more than 80% of the cover limit              |
| FREQUENT_CLAIMS        | 3 or more prior claims in the last 12 months                    |

The ABOVE_FAST_TRACK_LIMIT amount uses the effective `Triage:FastTrackMaxAmount` formatted by the domain GBP helper;
£2,500.00 is the default, not a hard-coded message value. Use decimal GBP throughout C#.

## Implementation ownership and verification

API Developer owns domain, API, configuration and focused xUnit tests. Web Developer owns `src\web\src` and focused
Vitest tests, including the mirrored API contract. Test Engineer independently verifies and fills test gaps,
owns Playwright additions, and writes `reports\CLM-101-traceability.md`. Code Reviewer reviews the final uncommitted diff.

Follow `reports\CLM-101-analysis.md` for suggested paths. Reuse existing policy-history retrieval and serialization.
Use focused tests for amount, date, policy-start, ratio and prior-count boundaries; independently vary history exclusions,
including same-day incidents and leap-year-crossing 365-day intervals. Assert reason membership, not arbitrary order.
Preserve all existing tests and behavior. No new packages, real data or external systems.

## Parked items

The product owner owns decisions about invalid configuration policy, prescribed reason order, persisted or versioned
decisions, manual overrides, referral queues or notifications and automated payment.
Lifecycle transitions, settlement estimates and overdue functionality remain outside CLM-101.
