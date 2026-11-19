---
name: import-work-item
description: Create a ClaimsDesk story as an Azure DevOps work item or a GitHub issue from its work-items file.
disable-model-invocation: true
argument-hint: "CLM-101 in Azure DevOps project <name>"
---
Create ${input:story:CLM-101} from work-items/${input:story}.md in ${input:target:Azure DevOps project <name> | GitHub repository <owner/repo>}.
Title "<ID> <title>"; description = the story and acceptance criteria; tag or label `claimsdesk-demo`.
Show me exactly what you will create and wait for my confirmation before creating it. Reply with the link.
