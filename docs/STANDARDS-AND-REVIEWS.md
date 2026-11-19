# Standards and reviews

## The customisation stack

| Layer | Where | Scope and loading | Use it for | In this repo |
|---|---|---|---|---|
| Deterministic checks | `.editorconfig`, analysers, ESLint, CI | Always enforced | Things that must never slip | `ci.yml`, `azure-pipelines/ci.yml` |
| Repository instructions | `.github/copilot-instructions.md` | Every request | Map, commands, conventions, guardrails, review priorities | About 50 lines |
| Path instructions | `.github/instructions/*.instructions.md` with `applyTo` | When matching files are involved | Language or area conventions | C#, .NET tests, React, Playwright |
| Skills | `.github/skills/<name>/SKILL.md` | On demand; reusable task skills can be invoked by name in Copilot Chat | Know-how, rulebooks, procedures, templates and repeatable tasks | `claims-rules`, `api-endpoint`, `add-endpoint`, `review-changes`, `handover`, `map-solution`, `deliver-story` |
| Custom agents | `.github/agents/*.agent.md` | When selected, or called as sub-agents | Roles with limited tools, handoffs, orchestration | Feature Orchestrator and team |
| Organisation and enterprise | Org custom instructions, shared agents, managed settings | Across repositories | The paved road for every team | - |

**Writing good instructions** - short and specific; commands that keep output small; "always/never" rules with the reason;
a map of the solution; what reviewers should prioritise. Move long procedures into skills. Repository instructions,
path instructions, `AGENTS.md` and skills are read by Copilot code review from the pull request's head branch, so the same
files shape generation and review. (`excludeAgent` in an instructions file can keep it away from code review or the cloud
agent.)

## Where reviews happen

| Where | How | Notes |
|---|---|---|
| VS Code, uncommitted changes | Source Control view -> **Code Review** | Custom guidance via `github.copilot.chat.reviewSelection.instructions` (this repo points it at the `code-review` skill) |
| VS Code, a selection | Generate Code -> Review | Same guidance |
| VS Code, a branch | Invoke `/review-changes this branch against main` (the `review-changes` skill) | Read-only review, severity table |
| Copilot CLI | `/review` | Also `/security-review` |
| GitHub pull request | Add **Copilot** as a reviewer | Effort Lite, Balanced (default) or Max; automatic reviews via the branch ruleset rule "Automatically request Copilot code review" |
| Azure Repos pull request (preview) | Request **GitHub Copilot** in Reviewers | Enable at organisation, project and repository level; automatic via the branch policy "Automatically request Copilot code review"; comments only, never approves; billed in AI Credits to the linked Azure subscription; up to 100 changed files and 100 changes |

Copilot never replaces the human approval. Treat its comments like a colleague's: accept, discuss or dismiss.

## Sharing standards across many repositories (a paved road)

- Make this repository's `.github/` folder a **template** for new services (instructions, skills, agents, CI).
- Keep organisation-wide rules in **organisation custom instructions** and share agents organisation-wide.
- Govern the risky parts centrally (models, MCP servers, cloud agent) with policies and managed settings.
- Review and version the files like code - they are code.

## References

- Custom instructions: https://code.visualstudio.com/docs/agent-customization/custom-instructions
- Custom agents and agent skills: https://code.visualstudio.com/docs/agent-customization/custom-agents ·
  https://code.visualstudio.com/docs/agent-customization/agent-skills
- Copilot code review: https://docs.github.com/en/copilot/concepts/agent-capabilities/agent-powered-workflows-and-operations/code-review
- Copilot code review in Azure Repos: https://learn.microsoft.com/en-us/azure/devops/repos/git/copilot-code-reviews?view=azure-devops
