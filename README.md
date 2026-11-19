---
title: GitHub Copilot best practices - ClaimsDesk
description: A runnable ClaimsDesk sample and self-guided exercises for applying GitHub Copilot best practices.
---

A runnable sample repository for practising **GitHub Copilot best practices**: context management, project
standards, code reviews, working across solutions and repositories, integrations and agent orchestration.

The app is **ClaimsDesk**, a claims-handling tool for the fictional **Contoso Insurance**: an ASP.NET Core minimal API
(.NET 10) and a React 19 + TypeScript web app, with xUnit, Vitest and Playwright tests.

> **Fictional company, synthetic data.** Simplified rules for demonstration only - not real insurance terms. Nothing here
> connects to a real system.

## What it demonstrates

| Module | Story or asset | Shows |
|---|---|---|
| Getting context right | [CLM-100](work-items/CLM-100.md) | Insufficient vs sufficient context; context window, `/context`, `/compact`, handover |
| Standards and reviews | `.github/`, `demo/settle-claim` branch | Instructions, path instructions, reusable skills, agents; Copilot code review in VS Code, CLI, GitHub and Azure Repos |
| Working at scale | [CLM-102](work-items/CLM-102.md), `split-repos` | Larger solutions, frontend and backend in two repositories, MCP integrations (GitHub, Azure DevOps, Jira, Playwright) |
| End-to-end scenario | [CLM-101](work-items/CLM-101.md) | Feature Orchestrator: analysis -> human gate -> API and web sub-agents in parallel -> tests -> review -> pull request |

Start with the [self-guided walkthrough](docs/DEMO-RUNBOOK.md), then try the
[hands-on exercises](docs/EXERCISES.md).

## Quick start

Prerequisites: .NET 10 SDK, Node.js 20+ (22 LTS recommended), Git, VS Code with GitHub Copilot.

Clone the repository and open its root in VS Code:

```powershell
git clone --branch main https://github.com/siyakhumalodev/copilot-best-practices-demo
cd copilot-best-practices-demo
```

The clone includes the repository history and the `demo-baseline` tag used by the reset exercises.
No repository initialization or baseline-tag creation is needed. Run setup, then start the app:

```bash
node scripts/setup.mjs                    # restore, build, npm install, Playwright, smoke tests
dotnet run --project src/ClaimsDesk.Api   # terminal 1 - http://localhost:5080
npm run dev --prefix src/web              # terminal 2 - http://localhost:5173
node scripts/preflight.mjs                # all green?
```

Optional MCP servers: `node scripts/setup.mjs --ado-org <org>` (Azure DevOps remote), `--ado-local <org>` (Azure DevOps
local), `--jira` (Atlassian). After the first `npm install`, commit `src/web/package-lock.json`.

In VS Code, use the **Copilot Harness**, open the folder and start only the MCP servers you need. The reusable tasks are
skills (not prompt files); invoke them in Copilot Chat, for example `/map-solution`, `/add-endpoint`,
`/review-changes` or `/deliver-story CLM-101`.

## Commands

| Purpose | Command |
|---|---|
| Build / test (.NET) | `dotnet build -nologo -v q` · `dotnet test -nologo -v q` |
| Web | `npm run dev --prefix src/web` · `npm test --prefix src/web` · `npm run lint --prefix src/web` · `npm run typecheck --prefix src/web` |
| End-to-end | `npm run e2e --prefix src/web` (starts the API and web app if they are not running) |
| Readiness check | `node scripts/preflight.mjs` (`--with-tests` to run the suites) |
| Reset to baseline | `node scripts/reset-demo.mjs --yes` (restores code, tests, reports and `.github/` from `demo-baseline`; discards uncommitted changes in those paths) |
| Context on/off (A/B demo) | `node scripts/demo.mjs context-off` · `context-on` · `status` |
| Review demo branch | `node scripts/demo.mjs review-setup` · `review-cleanup` |
| Two repositories | `node scripts/split-repos.mjs` (creates `../claimsdesk-split/`) |
| Script workflow checks | `node --test scripts/customer-workflows.test.mjs` (uses disposable repositories) |

## Repository layout

| Path | What |
|---|---|
| `.github/copilot-instructions.md` | Repository instructions: map, commands, conventions, guardrails, review priorities |
| `.github/instructions/` | Path instructions for C#, .NET tests, React and Playwright |
| `.github/skills/` | Domain skills (`claims-rules`, `api-endpoint`, `react-feature`, `code-review`) and reusable task skills (`add-endpoint`, `review-changes`, `handover`, `map-solution`, `deliver-story`, `import-work-item`, `check-in-browser`) |
| `.github/agents/` | Feature Orchestrator, Story Analyst, API Developer, Web Developer, Test Engineer, Code Reviewer |
| `.github/workflows/` | `ci.yml` (deterministic checks), `copilot-setup-steps.yml` (Copilot cloud agent environment) |
| `azure-pipelines/ci.yml` | The same CI for Azure Pipelines |
| `.vscode/mcp.json`, `.mcp.json` | MCP servers for VS Code and for Copilot CLI / other harnesses |
| `src/ClaimsDesk.Domain/`, `src/ClaimsDesk.Api/` | Business rules and the minimal API |
| `src/web/` | React app, Vitest tests, Playwright `e2e/` |
| `tests/` | xUnit domain and API tests |
| `work-items/` | Stories CLM-100 to CLM-102 |
| `docs/` | Self-guided walkthrough, context playbook, standards and reviews, working at scale, architecture, exercises |
| `scripts/` | Setup, readiness, reset, context and review exercises, repository splitting and workflow checks |
| `scripts/review-fixture/` | Intentionally flawed sample change used only by the review exercise; not application code |

## Use it as a starting point for your own paved road

Copy `.github/` into a service repository and adapt: replace the map and commands in `copilot-instructions.md`, keep the
path-instruction pattern, swap `claims-rules` for your domain rulebook, and keep the agents' least-privilege tool lists and
human gate. The pattern matters more than the files.

## Principles

- **The right context, not all the context.** Lean instructions, skills on demand, narrow tools, one task per session.
- **AI carries the rules, humans keep the judgement.** Agents follow the rulebook; people approve at the gates and merge.
- **Agents author and review; pipelines run deterministic checks.** No AI in the CI critical path.
- **Start small and safe.** Read-only first, least privilege, synthetic data, everything reviewed.
