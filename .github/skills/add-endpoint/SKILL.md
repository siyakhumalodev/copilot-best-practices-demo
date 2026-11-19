---
name: add-endpoint
description: "Add or change a ClaimsDesk API endpoint the house way - domain rule, contract, endpoint, tests."
disable-model-invocation: true
argument-hint: "POST /api/claims/{claimId}/withdraw - rule R8"
---
Add this to the ClaimsDesk API: ${input:endpoint:POST /api/claims/{claimId}/withdraw - only Submitted or InReview claims can be withdrawn (R8)}

Follow the api-endpoint skill and the claims-rules skill. Keep the rule in ClaimsDesk.Domain and the endpoint thin.
Add domain and API tests for the happy path and every rule boundary, run `dotnet test -nologo -v q`, then summarise the
files changed and the rule IDs covered in at most 10 lines.
