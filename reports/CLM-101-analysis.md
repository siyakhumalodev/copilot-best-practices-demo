---
description: "Read-only Stage 1 analysis of CLM-101, identifying acceptance-criteria gaps, rulebook alignment, current implementation evidence, and a proposed implementation contract for human approval."
---

# CLM-101 — Stage 1 analysis

## Story analysis - CLM-101 "Fast-track low-value claims"

### 1. Acceptance criteria quality

**Assessment: Needs work.** AC1–AC3 do not capture the complete eligibility rules or referral precedence. Implementation should wait for human approval of the criteria and contract below.

**Rulebook read:** `.github\skills\claims-rules\SKILL.md`.

**Rules touched:**
- **R5, R6, R7:** core fast-track, referral and standard-review behaviour.
- **R9:** personal-data constraints on responses, messages and logging.
- **R1, R2, R3:** existing supporting policy, amount and submission-date validation; preserve these behaviours.
- **R8:** relevant only to which historical claim statuses count under R5; no lifecycle implementation is proposed.
- **R4 and R10:** settlement estimates and overdue behaviour are outside this story.

**Original story, captured verbatim:**

```markdown
# CLM-101 - Fast-track low-value claims

**As a** claims handler **I want** low-value, straightforward claims flagged for fast-track **so that** customers with simple
claims are paid quickly.

## Acceptance criteria

- **AC1** Given a claim of £2,500 or less that was reported within 30 days of the incident, when I open it, then it shows
  "Fast-track".
- **AC2** Given a claim above £2,500, when I open it, then it shows "Standard review" with the reason "Claimed amount is above
  the fast-track limit of £2,500.00".
- **AC3** Given a claim reported more than 30 days after the incident, when I open it, then it shows "Standard review" with
  the reason "Reported more than 30 days after the incident".
- **AC4** The claim detail screen shows the triage outcome as a badge, with its reasons.

## Notes

- The API returns the triage outcome with the claim detail.
- Business rules: claims rulebook (the `claims-rules` skill).
```

| AC | Verdict | Issue | Suggestion |
|---|---|---|---|
| AC1 | Needs work | Observable label and numeric boundaries, but insufficient conditions. Two prior claims prevent fast-track; any R6 indicator requires referral. £2,500 is a configurable default, not an invariant. | Require all R5 conditions, no R6 indicator, the configured inclusive amount limit and the eligible reason. Approve G1–G4 and G9. |
| AC2 | Needs work | Concrete outcome and message, but referral can override standard review. The message must use the configured limit. Other failed R5 conditions must also appear. | Scope standard review to claims without referral indicators; use the configured limit and include every applicable R7 reason. Approve G2, G9 and G10. |
| AC3 | Needs work | Concrete message, but notification after 90 days requires referral, not standard review. Other standard-review reasons may also apply. | Distinguish 31–90 days from more than 90 days; apply referral precedence and complete standard-review reasons. Approve G5, G9 and G10. |
| AC4 | Needs work | Badge and reasons are observable, but supported outcomes, exact reason representation and the API contract are unspecified. | Specify the three outcomes, API-owned reason messages and a separate triage badge displaying all returned reasons. Approve G11 and preserve G12. |

### 2. Gaps

**The following are proposed new or clarified acceptance criteria, not implementation authorisation.**

Examples use the existing test clock, **2026-11-02**, rather than the analysis date. Seed dates are relative to that clock. Where a scenario changes seed facts, it explicitly describes a **synthetic variant**, not an existing record.

For isolated boundary scenarios, assume otherwise-valid data, no additional referral indicators and fewer than two qualifying prior claims unless stated otherwise.

| ID | Gap | Rule | Risk | Proposed Given / When / Then |
|---|---|---|---|---|
| G1 | Fast-track requires every eligibility condition and an eligible reason. | R5, R6 | High | **Given** seeded `CLM-2026-0001`, claiming £1,850.00, reported two days after its incident, with one qualifying prior claim and no referral indicator, **when** its detail is opened, **then** the outcome is `FastTrack`, the badge says “Fast-track”, and the reason is `FAST_TRACK_ELIGIBLE` — “Meets all fast-track criteria”. |
| G2 | The amount threshold and corresponding message must use configuration, including its inclusive boundary. | R5, R7 | High | **Given** synthetic variants of `CLM-2026-0001` and no configured override, **when** assessed at £2,500.00 and £2,500.01, **then** they are respectively Fast-track and Standard review with `ABOVE_FAST_TRACK_LIMIT`. **Given** `Triage:FastTrackMaxAmount = 3000.00`, **when** assessed at £3,000.00 and £3,000.01, **then** they are respectively Fast-track and Standard review, with the latter message “Claimed amount is above the fast-track limit of £3,000.00”. |
| G3 | Two qualifying prior claims prevent fast-track even for a small, promptly reported claim. | R5, R7 | High | **Given** seeded `CLM-2026-0009`, claiming £240.00 and reported one day after its incident, with qualifying prior claims `CLM-2026-0003` and `CLM-2026-0001`, **when** opened, **then** it shows Standard review with `PRIOR_CLAIMS` — “2 or more prior claims in the last 12 months”. A synthetic variant with only one qualifying prior claim is Fast-track. |
| G4 | “Prior claims” needs the complete policy, identity, status and incident-date definition. | R5; R8 status vocabulary only | High | **Given** a synthetic variant of `CLM-2026-0009` with incident date `2026-10-30`, on `POL-100001`, with synthetic cover extended to start `2025-01-01`, **when** history is counted, **then** another non-excluded claim on `2025-10-30` or `2026-10-30` counts; one on `2025-10-29` or `2026-10-31` does not. The target claim itself, another policy’s claim, Withdrawn claims and Rejected claims do not count. Submitted, InReview, Approved and Settled claims otherwise meeting the definition count. With one other qualifying claim, including a boundary candidate produces Standard review with `PRIOR_CLAIMS`; excluding it leaves Fast-track. |
| G5 | Notification boundaries distinguish fast-track, standard review and referral. | R5, R6, R7 | High | **Given** £1,850.00 synthetic variants on `POL-100001`, each reported `2026-11-02`, with incident dates `2026-10-03`, `2026-10-02`, `2026-08-04` and `2026-08-03`, **when** assessed, **then** delays of 30, 31, 90 and 91 days produce respectively Fast-track; Standard review with `LATE_NOTIFICATION`; Standard review with `LATE_NOTIFICATION`; and Referred with `VERY_LATE_NOTIFICATION`, without the standard-review late reason. |
| G6 | An incident during the first 14 days of cover requires referral, regardless of low value and prompt reporting. | R6 | High | **Given** seeded `CLM-2026-0006`, claiming £780.00 with an incident five days after cover began, **when** opened, **then** it is Referred with `NEW_POLICY`. **Given** otherwise-eligible synthetic variants on `POL-100003`, starting `2026-10-23`, with incidents on `2026-11-05` and `2026-11-06` and reports the following day, **when** assessed using an appropriate later fixed clock, **then** day offsets 13 and 14 respectively trigger and do not trigger `NEW_POLICY`. |
| G7 | Referral applies strictly above 80% of cover, not at exactly 80%. | R6 | High | **Given** seeded `CLM-2026-0011`, claiming £12,800.00 against £15,000.00 cover, **when** opened, **then** it is Referred with `HIGH_VALUE_FOR_COVER`. **Given** otherwise-identical synthetic variants at £12,000.00 and £12,000.01, **when** assessed, **then** exactly 80% does not trigger this referral reason, but one penny above does. The £12,000.00 variant remains Standard review because it exceeds the fast-track limit. |
| G8 | Three qualifying prior claims trigger referral; two only trigger the prior-claims standard-review condition. | R5, R6, R7 | High | **Given** seeded `CLM-2026-0010`, claiming £2,400.00 with two qualifying Settled prior claims, **when** opened, **then** it is Standard review with `PRIOR_CLAIMS`. **Given** a synthetic third qualifying claim on `POL-100006`, incident `2026-10-01`, **when** the target is assessed with that additional history, **then** it is Referred with `FREQUENT_CLAIMS`, without `PRIOR_CLAIMS`. |
| G9 | Referral takes precedence over both fast-track and standard review; referred reasons exclude standard-review and eligible reasons. | R5, R6, R7 | High | **Given** `CLM-2026-0006`, which meets the amount and notification conditions but has `NEW_POLICY`, **when** opened, **then** it is Referred, not Fast-track. **Given** `CLM-2026-0011`, which exceeds both the fast-track limit and 80% of cover, **when** opened, **then** its reasons include `HIGH_VALUE_FOR_COVER` and exclude `ABOVE_FAST_TRACK_LIMIT` and `FAST_TRACK_ELIGIBLE`. For multiple referral indicators, only applicable referral codes may appear; completeness is a PO question below. |
| G10 | Standard review must list every failed R5 condition (a)–(c), not just the first failure. | R7 | High | **Given** seeded `CLM-2026-0003`, claiming £3,200.00 and reported 45 days after its incident, **when** opened, **then** Standard review includes both `ABOVE_FAST_TRACK_LIMIT` and `LATE_NOTIFICATION`. **Given** a synthetic variant also having exactly two qualifying prior claims and no referral indicator, **then** it includes those two reasons plus `PRIOR_CLAIMS`. |
| G11 | Claim-detail API and UI need an explicit, shared triage representation. | R5, R6, R7 | Medium | **Given** detail responses for `CLM-2026-0001`, `CLM-2026-0003` and `CLM-2026-0006`, **when** each detail is opened, **then** a distinct triage badge shows respectively “Fast-track”, “Standard review” and “Referred”, and all returned reason messages are visible. The lifecycle status badge remains separate. The API supplies the decision and messages; the browser does not recalculate eligibility. |
| G12 | Adding triage and policy history must not expose personal data. | R9 | High | **Given** assessment of `CLM-2026-0001` using other claims on `POL-100001`, **when** its detail response, triage messages and any assessment diagnostics are produced, **then** the detail retains its existing claimant-name field but no claimant email or historical claimant details are added. Triage reasons, URLs, errors and logs contain no claimant name or email; diagnostic claim identifiers are limited to ClaimId and PolicyNumber. |

**Boundary clarification:** G4 uses an inclusive **365-day** interval, as explicitly defined by R5. The mandated display message says “last 12 months”; it does not change the calculation into calendar-month arithmetic.

**Test-design notes, not additional business criteria:**
- Exercise zero, one, two and three qualifying prior claims.
- For G4, vary each exclusion independently, using distinguishable synthetic claim IDs.
- Include candidates whose reported/created dates would lead to different answers if incorrectly used instead of incident dates.
- Include a leap-year-crossing interval to distinguish 365 days from calendar-year arithmetic.
- Keep referral indicators isolated in boundary tests so another indicator does not obscure the result.
- Assert reason sets rather than an undocumented display order.
- Use decimal amounts and whole calendar-date differences; do not introduce money rounding or elapsed-hour rules.

### 3. Code vs rulebook

Paths are relative to the repository root:

`C:\Repos\customers\intact-insurance\copilot-session\copilot-best-practices-demo`

| Location | Rule | Current behaviour | Expected behaviour |
|---|---|---|---|
| `src\ClaimsDesk.Domain\Claims\Claim.cs` — `Claim`; inspected domain claim sources | R5–R7 | Claim stores the required target facts, but no triage evaluator, outcome or triage-reason model was found. `IsOpen` only identifies open lifecycle statuses. | A domain calculation evaluates referral first, then fast-track, otherwise standard review, using policy and qualifying history. Triage must not reuse or change lifecycle status. |
| `src\ClaimsDesk.Api\Claims\ClaimEndpoints.cs` — `GetClaim` | R5–R7 | Fetches the target claim and policy, then calls `ToResponse(policy)`. It does not retrieve same-policy history or evaluate triage. | Retrieve policy history and calculate triage before returning detail. |
| `src\ClaimsDesk.Api\Claims\ClaimEndpoints.cs` — `SubmitClaim` | R5–R7 | Returns the same `ClaimResponse` type as GET, without triage. Reported date correctly comes from the injected UTC clock. | If the shared detail contract is extended as proposed, populate triage consistently on POST as well as GET. Exclude the newly added claim from its own history. Preserve server-owned reported dates. |
| `src\ClaimsDesk.Api\Claims\ClaimContracts.cs` — `ClaimResponse`; `ClaimMapping.cs` — `ToResponse` | R5–R7 | Detail has no triage outcome or reasons. | Add an explicit triage object to the detail response and map the computed result. |
| `src\ClaimsDesk.Api\Program.cs`; `appsettings.json`; `appsettings.Development.json` | R5 | No triage options registration or `Triage:FastTrackMaxAmount` setting was found. | Support the exact configuration key with a decimal default of £2,500.00. Decision and message must use the same effective value. |
| `src\ClaimsDesk.Api\Data\IClaimRepository.cs` and `InMemoryClaimRepository.cs` — `ListByPolicyAsync` | R5 | Already returns all claims for a policy, case-insensitively. It does not filter qualifying prior claims. This is a useful existing capability, not a defect. | Reuse it; apply R5’s identity, status and incident-date filters in the domain calculation. No new repository method is necessary for this implementation. |
| `src\web\src\api\types.ts` — `ClaimResponse`; `features\claims\ClaimDetail.tsx` — `ClaimDetail` | R5–R7 | Client detail type has no triage fields. The screen renders only the lifecycle `StatusBadge` and existing details. | Mirror the approved API contract; add a distinct triage badge and returned reason messages. |
| `tests\ClaimsDesk.Api.Tests\ClaimsApiTests.cs`; inspected domain tests; `src\web\src\features\claims\StatusBadge.test.tsx`, `ClaimsList.test.tsx`; `src\web\e2e\claims.spec.ts` | R5–R7 | Existing tests cover validation, listing, detail, submission, lifecycle openness and basic UI behaviour. No triage assertions were found in the inspected sources. | Add focused evaluator, contract and detail-rendering coverage for approved gaps. Existing test presence does not establish passing runtime behaviour. |
| `ClaimContracts.cs`, `ClaimMapping.cs`, `ClaimEndpoints.cs`; `ClaimsApiTests.GetClaim_KnownId_ReturnsDetailWithoutClaimantEmail` | R9 | Detail mapping excludes email; summaries exclude claimant name and email. Submission logging uses ClaimId and PolicyNumber only. Existing GET test checks email absence. | Preserve these protections when adding history and triage. Never serialize domain history records directly. |

**Existing supporting behaviour to preserve:**
- `src\ClaimsDesk.Domain\Policies\Policy.cs` — `CoversIncidentOn` implements inclusive cover dates and excludes Cancelled policies without excluding Lapsed policies (**R1**).
- `src\ClaimsDesk.Domain\Claims\ClaimValidator.cs` validates positive, two-decimal-place amounts within cover and future incident dates (**R2–R3**).
- `src\ClaimsDesk.Domain\Money.cs` provides decimal-based helpers and `FormatGbp`, suitable for the configured-limit reason.
- `Program.cs` registers `JsonStringEnumConverter`; API contracts and `TestJson.cs` establish camelCase property names with string enum values.

The missing triage functionality is the relevant rulebook implementation gap. This analysis does not claim that unrelated rulebook features are complete or require changes under CLM-101.

### 4. Plan and API contract

**All paths and types below are proposals, subject to human approval.**

#### Smallest implementation plan

- **Domain:**
  - Add `src\ClaimsDesk.Domain\Claims\Triage.cs` for `TriageOutcome`, result/reason records and reason-code constants.
  - Add `src\ClaimsDesk.Domain\Claims\ClaimTriage.cs` for a pure evaluator accepting the target `Claim`, its `Policy`, same-policy claim candidates and the effective decimal fast-track limit.
  - Count qualifying prior claims using R5’s exact definition.
  - Evaluate R6 before selecting FastTrack or StandardReview.
  - Generate domain-owned messages using `Money.FormatGbp`.
  - Do not add persisted triage state, lifecycle transitions, settlement calculations or overdue calculations.

- **API:**
  - Add `src\ClaimsDesk.Api\Claims\TriageOptions.cs` with decimal `FastTrackMaxAmount`, default `2500.00m`.
  - Update `src\ClaimsDesk.Api\Program.cs` to bind the `Triage` configuration section.
  - Add `"Triage": { "FastTrackMaxAmount": 2500.00 }` to `src\ClaimsDesk.Api\appsettings.json`; no Development override is required.
  - Update `src\ClaimsDesk.Api\Claims\ClaimEndpoints.cs` to load history through existing `ListByPolicyAsync` and invoke the evaluator for detail-shaped responses.
  - Update `ClaimContracts.cs` and `ClaimMapping.cs` for the additive contract below.
  - Reuse the same assessment/mapping path for GET and POST to avoid inconsistent `ClaimResponse` values.
  - No repository, seed-data, policy-contract or list-contract changes are needed.

- **Web:**
  - Update `src\web\src\api\types.ts`.
  - Add `src\web\src\features\claims\TriageBadge.tsx`.
  - Update `src\web\src\features\claims\ClaimDetail.tsx` to show the separate triage badge and a semantic list of API-provided reason messages.
  - Update `src\web\src\styles.css` for the triage badge, reusing existing badge visual conventions where appropriate.
  - No API client endpoint changes are needed: `getClaim` and `submitClaim` already use `ClaimResponse`.
  - Do not calculate thresholds, prior counts or reasons in JavaScript.

- **Tests:** add the focused coverage described below only after approval. No tests were written or run during this analysis.

#### Proposed API contract

**Endpoints:**
- `GET /api/claims/{claimId}`: existing `200` detail response plus required `triage`.
- `POST /api/claims`: existing `201`, Location and detail response plus required `triage`, because it shares `ClaimResponse`.
- `GET /api/claims`: unchanged summary response.
- Existing validation and not-found contracts remain unchanged.

**Serialization:** camelCase JSON property names; PascalCase outcome enum strings, matching existing enum serialization. Reason codes are exact uppercase strings, not camel-cased enum names.

| Exact JSON property | Proposed C# property/type | JSON type | TypeScript property/type |
|---|---|---|---|
| `triage` | `ClaimResponse.Triage: TriageResponse` | object, non-null | `triage: TriageResponse` |
| `triage.outcome` | `TriageResponse.Outcome: TriageOutcome` | string | `outcome: TriageOutcome` |
| `triage.reasons` | `TriageResponse.Reasons: IReadOnlyList<TriageReasonResponse>` | array of objects | `reasons: TriageReasonResponse[]` |
| `triage.reasons[].code` | `TriageReasonResponse.Code: string`, restricted to the constants below | string | `code: TriageReasonCode` |
| `triage.reasons[].message` | `TriageReasonResponse.Message: string` | string | `message: string` |

**Outcome enum and labels:**

| C# enum member | JSON wire value / TS union member | UI label |
|---|---|---|
| `TriageOutcome.FastTrack` | `"FastTrack"` | Fast-track |
| `TriageOutcome.StandardReview` | `"StandardReview"` | Standard review |
| `TriageOutcome.Referred` | `"Referred"` | Referred |

`TriageReasonCode` is a TypeScript string-literal union of the exact codes below. C# uses named string constants for these values, avoiding changes to global enum serialization.

| Exact reason code | Exact message |
|---|---|
| `FAST_TRACK_ELIGIBLE` | Meets all fast-track criteria |
| `ABOVE_FAST_TRACK_LIMIT` | Claimed amount is above the fast-track limit of £2,500.00 |
| `LATE_NOTIFICATION` | Reported more than 30 days after the incident |
| `PRIOR_CLAIMS` | 2 or more prior claims in the last 12 months |
| `VERY_LATE_NOTIFICATION` | Reported more than 90 days after the incident |
| `NEW_POLICY` | Incident within the first 14 days of cover |
| `HIGH_VALUE_FOR_COVER` | Claimed amount is more than 80% of the cover limit |
| `FREQUENT_CLAIMS` | 3 or more prior claims in the last 12 months |

For `ABOVE_FAST_TRACK_LIMIT`, replace only the displayed amount with the effective configured value formatted as GBP with two decimal places. For example, configuration `3000.00` produces:

“Claimed amount is above the fast-track limit of £3,000.00”

**Example additive fragment for seeded `CLM-2026-0003`:**

```json
{
  "triage": {
    "outcome": "StandardReview",
    "reasons": [
      {
        "code": "ABOVE_FAST_TRACK_LIMIT",
        "message": "Claimed amount is above the fast-track limit of £2,500.00"
      },
      {
        "code": "LATE_NOTIFICATION",
        "message": "Reported more than 30 days after the incident"
      }
    ]
  }
}
```

The example order is not a proposed business requirement. The UI displays the returned sequence without truncating it.

**Reason membership:**
- FastTrack: `FAST_TRACK_ELIGIBLE`.
- StandardReview: every failed R5(a)–(c) condition, using the corresponding standard-review codes.
- Referred: applicable referral codes only; no eligible or standard-review codes.
- Whether every simultaneously applicable referral reason must be returned requires PO confirmation.

No raw history, claimant email, claimant details in reasons, threshold echo field or lifecycle changes are proposed.

#### Focused test plan

| Layer and proposed files | Coverage |
|---|---|
| New `tests\ClaimsDesk.Domain.Tests\ClaimTriageTests.cs`; reuse `TestData.cs` | G1–G10: eligibility, configuration-dependent comparison/message, prior-history filters, notification boundaries, policy-start boundaries, 80% boundary, two/three priors, precedence and complete standard reasons. Apply rule traits consistent with existing tests. |
| `tests\ClaimsDesk.Api.Tests\ClaimsApiTests.cs` | Seeded GET outcomes and reason messages for `0001`, `0003`, `0006`, `0009`, `0010`, `0011`, `0012`; exact camelCase properties and enum wire values; unchanged list and 404 contracts; GET/POST detail consistency; target self-exclusion; R9 response protection. |
| `tests\ClaimsDesk.Api.Tests\ClaimsDeskApiFactory.cs`, only if needed for configuration override support | An isolated factory overriding `Triage:FastTrackMaxAmount` to `3000.00`, proving both eligibility and message use the override. Retain the injected fixed UTC clock. |
| New `src\web\src\features\claims\ClaimDetail.test.tsx` | Mock detail responses for all three outcomes; show badge text and every returned reason; lifecycle badge remains distinct; preserve loading/error behaviour. Include an API-supplied £3,000.00 message to catch UI hard-coding. |
| New `src\web\src\features\claims\TriageBadge.test.tsx` | Exact outcome labels; meaning is visible in text, not inferred solely from colour. This follows the existing badge convention, not a new overdue feature. |
| `src\web\e2e\claims.spec.ts` | Extend existing detail smoke coverage to representative Fast-track, Standard review and Referred seeds. Retain year-independent claim-ID matching. |

Do not expand this story into lifecycle, settlement or overdue test implementation.

### 5. Questions for the product owner

1. **Multiple referral reasons:** R6 requires referral reasons only, but does not explicitly require every applicable referral reason. Should all matching referral reasons be returned? Recommendation: confirm explicitly; do not silently copy R7’s completeness requirement.
2. **Reason ordering:** Is a stable business order required? Recommendation: park a prescribed order unless handlers need one; test reason membership rather than undocumented sequencing.
3. **Invalid configuration:** What should happen for negative, zero, non-numeric or more-than-two-decimal-place `Triage:FastTrackMaxAmount` values? The rulebook specifies the key and default but not invalid-configuration policy. Recommendation: decide before adding validation or fallback behaviour; do not invent silent coercion.
4. **Reassessment timing:** Should opening detail recalculate against current configuration, policy data and qualifying-history statuses, or display a historical decision? Recommendation: approve read-time calculation for this flagging story if intended; park persisted decision history and audit/versioning requirements.
5. **POST detail semantics and R9:** The existing POST returns `ClaimResponse`, including claimant name. May it remain a detail representation with the same additive triage contract? Recommendation: confirm that interpretation; do not expand claimant-name exposure to summaries or other responses.
6. **Closed targets:** Should closed claim details display the same calculated triage badge? R5–R7 specify no target-status exemption. Recommendation: do not invent one; confirm intended presentation if a closed-claim exception is wanted.

**Parked unless separately approved:** manual triage overrides, referral queues or notifications, automated payment, persisted triage decisions, lifecycle transitions, settlement estimates and overdue functionality. None is needed to satisfy the proposed flagging contract.

### 6. Recommendation

- **Add as criteria:** approve **G1–G11** as the explicit CLM-101 clarification set. Preserve **G12** as a mandatory R9 acceptance constraint.
- **Resolve before implementation:** referral-reason completeness, reassessment timing and the proposed shared GET/POST detail contract. Resolve configuration-error behaviour before implementing any new configuration validation or fallback policy.
- **Test-design notes:** approve the boundary and exclusion matrix separately from business criteria. Do not treat test fixture choices, reason ordering or implementation structure as new business rules.
- **Park:** the unrelated and unspecified matters identified above; do not implement lifecycle, settlement or overdue behaviour under CLM-101.
- **Approval gate:** human approval is required before writing implementation or tests.

**Read-only evidence and limits:** This report is grounded in the story, rulebook, current domain/API sources, configuration, repository interfaces, seed data, serialization contracts, UI and existing test sources. Only file viewing, file discovery and content searching were performed. No code, tests or files were written; no build, test suite, application or browser session was run. Existing worktree contents were preserved. Findings describe inspected source behaviour, not verified runtime results.
