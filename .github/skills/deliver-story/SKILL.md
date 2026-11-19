---
name: deliver-story
description: Deliver a ClaimsDesk story end to end with the agent team and a human approval gate.
disable-model-invocation: true
argument-hint: "CLM-101"
---
Deliver ${input:story:CLM-101} end to end. Read it from Azure DevOps or GitHub if I named a work item or issue and those
tools are available; otherwise use work-items/${input:story}.md.
Pause after the analysis so I can approve the acceptance criteria before any code or tests are written.
