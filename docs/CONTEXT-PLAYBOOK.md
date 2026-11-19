# Context playbook - better answers, fewer tokens

## What fills the context window

| Source | When it is added | How you control it |
|---|---|---|
| System prompt and harness | Every request | - |
| `.github/copilot-instructions.md` | Every request | Keep it short: a map, commands, conventions, guardrails |
| `*.instructions.md` (`applyTo`) | When matching files are in play | Scope with globs; one concern per file |
| Skills (`SKILL.md`) | Name and description always; body only when relevant | Precise descriptions; move long know-how out of instructions |
| Tool definitions (built-in and MCP) | Every request, for every enabled tool | Tools picker; start only the MCP servers you need; narrow `tools:` in agents |
| Conversation history | Every turn re-sends it | One task per session; `/compact`; `/handover` and start fresh |
| Files, selections, `#codebase` results | When you attach them or the agent reads them | Point at the right files (`#file`, `#selection`, `#changes`) |
| Tool results (file reads, terminal output) | As the agent works | Quiet commands (`-nologo -v q`), test filters, small files |

The window is finite. Near the limit, older turns are summarised automatically and detail is lost. Every token is also
billed (AI Credits), so noise costs twice: in quality and in money.

## Ten habits

1. **One task, one session.** Start a new chat (or `/clear` in Copilot CLI) when the task changes.
2. **Say what "done" looks like.** Goal, files, rules, constraints, tests to add, command to run.
3. **Point, don't paste.** `#file:work-items/CLM-100.md`, `#selection`, `#changes`; `#codebase` only when you don't know where.
4. **Let the repository carry the rules.** Conventions in instructions, know-how in skills - not re-typed in every prompt.
5. **Keep instructions lean.** Every line of `copilot-instructions.md` is sent with every request.
6. **Fewer tools.** Disable MCP servers and tools you don't need for this task; give agents least-privilege tool lists.
7. **Quiet, targeted commands.** `dotnet test -nologo -v q --filter ...` rather than a full verbose run.
8. **Plan, then implement fresh.** Plan agent or `/plan` for big changes; implement in a new session from the plan.
9. **Compact or hand over.** `/compact` to summarise; `/handover` to write `reports/HANDOVER.md` and restart small.
10. **Match effort to the task.** Lighter models or effort for routine edits; deeper reasoning for design and debugging.

## Anatomy of a sufficient prompt

| Part | Weak | Sufficient |
|---|---|---|
| Goal | "Add an estimated settlement" | "Implement CLM-100" + `#file:work-items/CLM-100.md` |
| Rules | (none) | "using the claims-rules skill (R4)" |
| Where | (none) | "calculation in ClaimsDesk.Domain, exposed on the claim detail response" |
| Proof | (none) | "domain and API tests including the escape-of-water and below-excess cases" |
| Done | (none) | "then run `dotnet test -nologo -v q`" |

## Scorecard (CLM-100)

| # | Check | Insufficient context | Sufficient context |
|---|---|---|---|
| 1 | Calculation in `ClaimsDesk.Domain`, not the endpoint or mapping | often no | yes |
| 2 | Escape-of-water adds £250.00 to the excess (R4) | no | yes |
| 3 | Estimate never below £0.00 (R4) | rarely | yes |
| 4 | Money stays `decimal` | sometimes | yes |
| 5 | Unit and API tests, including boundaries | few or none | yes |
| 6 | CLM-2026-0001 estimate = £1,350.00 (£1,850.00 - £250.00 - £250.00) | no (£1,600.00) | yes |

## Controls cheat sheet

| Copilot CLI | VS Code |
|---|---|
| `/context` - token use by category | Context window control in the chat input (hover for the breakdown) |
| `/compact [focus]` - summarise now (auto at about 80%) | `/compact`; automatic summarisation near the limit |
| `/clear` (also `/new`) - fresh session | New chat |
| `/usage` - session metrics | Hover the context control for AI Credits used |
| `/model` - model or effort | Model picker |
| `/plan` - plan before acting | Plan agent |
| `/add-dir` and `--add-dir` - extra folders | Multi-root workspace |
| `/agent` - pick a custom agent | Agent picker |
