---
name: code-review
description: ClaimsDesk code review checklist, severity rubric and output format - business rules R1-R10, personal data, error handling, async and time, contracts between API and web, and tests. Use when reviewing a diff, a branch, uncommitted changes or a pull request in this repository.
---

# ClaimsDesk code review

## Severity rubric

| Severity | Meaning | Examples |
|---|---|---|
| **Blocker** | Wrong business outcome, security or personal-data issue, data loss | Wrong excess maths (R4); settling a claim that is not Approved (R8); claimant email in logs (R9); exception text returned to callers |
| **Major** | Likely bug, missing tests for changed behaviour, contract drift, reliability | No tests; `.Result`/`.Wait()`; missing `CancellationToken`; `DateTime.Now`; `double` for money; API field missing from `types.ts` |
| **Minor** | Maintainability or convention | Naming, structure, missing rule ID in a test name |

## Checklist

1. **Rules.** Which rules (R1-R10) does the change touch? Is each implemented exactly as the `claims-rules` skill says,
   including boundaries (inclusive limits, exactly N days) and exclusions? Rules in `ClaimsDesk.Domain`, not in endpoints or UI?
2. **Money.** `decimal` only; rounding with `Money.RoundGbp`; no hard-coded excess or limits (use the policy or configuration).
3. **Personal data (R9).** No claimant name or email in logs, URLs, error messages or exception text; email never in responses.
4. **Errors.** Problem details through `ProblemResults` with an `ErrorCodes` code; correct status (400/404/409);
   no `catch (Exception)` that hides failures or leaks `ex.Message`.
5. **Async and time.** `CancellationToken` accepted and passed on; no `.Result`, `.Wait()`, `async void`; `TimeProvider` for time.
6. **Concurrency and state.** No mutable static state; repository access through interfaces.
7. **Contracts.** `ClaimContracts.cs` and `src/web/src/api/types.ts` changed together; responses are records, not anonymous objects.
8. **Tests.** Every behaviour change has tests at the right level (domain rule -> unit; endpoint -> API test; screen ->
   component or e2e). Boundaries covered. Nothing weakened, skipped or deleted.
9. **Logging.** Structured templates, not string interpolation.

## Output format

```
## Code review - <scope>
**Summary:** <one or two sentences: what the change does and the overall risk>
| # | Severity | File:line | Finding | Rule / standard | Suggested fix |
|---|----------|-----------|---------|-----------------|---------------|
**Tests:** <what exists, what is missing>
**Verdict:** Ready to merge | Merge after fixes | Needs rework
```

List the most severe findings first. If there are no findings in a category, do not invent any.
