---
name: review-changes
description: "Review the current changes (uncommitted, or this branch against main) against ClaimsDesk standards and the claims rulebook."
disable-model-invocation: true
argument-hint: "this branch against main"
---
Review ${input:scope:this branch against main} using the code-review skill and the claims-rules skill.
Report findings in the standard table, most severe first, and finish with a verdict. Do not change any files.
