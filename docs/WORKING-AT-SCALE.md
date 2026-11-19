---
title: Working at scale
description: Work across larger solutions, multiple repositories and approved MCP integrations.
---

## Larger solutions

- **A map, not a manual.** The layout table in `copilot-instructions.md` tells Copilot where things live in a few lines.
- **Area rules where they apply.** Path instructions (`applyTo`) per language or folder; nested `AGENTS.md` files for large
  monorepos (VS Code: `chat.useAgentsMdFile` and `chat.useNestedAgentsMdFiles`).
- **Find, then focus.** `#codebase` to discover; then `#file` the few files that matter.
- **Hide noise.** Use `search.exclude` for generated files and exercise fixtures (this repo excludes `scripts/review-fixture/`).
- **Split the work.** Sub-agents each work in their own context window and return a summary.

## Several repositories (frontend and backend)

| Option | How | Good for |
|---|---|---|
| Multi-root workspace | `node scripts/split-repos.mjs`, open `claimsdesk.code-workspace` | One session reading and changing both repositories; each keeps its own instructions |
| Copilot CLI | `copilot --add-dir ../claimsdesk-web` or `/add-dir` | Terminal-first work across folders |
| Copilot projects (GitHub Copilot app, preview) | Give Copilot a goal across repositories | Parallel, managed agent sessions |
| Copilot cloud agent | Cloud-sandbox sessions can span repositories in one organisation | Delegated work that returns pull requests |

Agree the contract first (field names and types), change both sides in one session or in coordinated tasks, and keep a
contract test on each side.

## Integrations through MCP

| Server | Configuration | Example request or skill |
|---|---|---|
| GitHub | `.vscode/mcp.json`: `https://api.githubcopilot.com/mcp/` (built into Copilot CLI and the cloud agent) | "Create an issue for the follow-up: server-side paging for GET /api/claims" |
| Azure DevOps (remote) | `node scripts/setup.mjs --ado-org <org>` -> `https://mcp.dev.azure.com/<org>` (Microsoft Entra-backed organisations) | "List my active work items in project X" |
| Azure DevOps (local) | `--ado-local <org>` -> `npx -y @azure-devops/mcp <org> -d core work work-items repositories pipelines` | "Show the last failed pipeline run and why" |
| Atlassian (Jira, Confluence) | `--jira` -> `https://mcp.atlassian.com/v2/mcp` (OAuth) | "Summarise Jira issue CLM-101 and its acceptance criteria" |
| Playwright | `npx @playwright/mcp@latest` | Invoke the `/check-in-browser` skill with the page or flow to check |

`.vscode/mcp.json` is read by VS Code; `.mcp.json` (key `mcpServers`) is the portable file read by Copilot CLI and other
harnesses. `setup.mjs` keeps both in step.

## Beyond the IDE

- **GitHub Copilot for Jira** - assign or mention a Jira issue and the Copilot cloud agent opens a draft pull request
  (Jira Cloud; code in GitHub).
- **Azure Boards** - "Create a pull request with GitHub Copilot" from a work item (code in GitHub repositories connected
  through the GitHub app).
- **Copilot code review in Azure Repos** (preview) - see [STANDARDS-AND-REVIEWS.md](STANDARDS-AND-REVIEWS.md).

## Governance

- Enterprise policy **"MCP servers in Copilot"** must be on for any MCP server to run.
- Allow-list or deny-list servers centrally in enterprise managed settings; registry-based restriction is in preview.
- Prefer read-only modes and toolsets where available (GitHub and Azure DevOps remote servers accept
  `X-MCP-Readonly` and `X-MCP-Toolsets` headers).
- Give each custom agent the fewest tools it needs; keep writes behind a confirmation or a human gate.
- Never put secrets in `mcp.json`; use `inputs` or the server's own sign-in.
- Proxies and TLS inspection must allow the remote MCP endpoints you approve.

## References

- MCP configuration: https://code.visualstudio.com/docs/agents/reference/mcp-configuration
- MCP management for enterprises: https://docs.github.com/en/copilot/concepts/enterprise/mcp-management
- Azure DevOps remote MCP server: https://learn.microsoft.com/en-us/azure/devops/mcp-server/remote-mcp-server?view=azure-devops
- Atlassian remote MCP server: https://support.atlassian.com/atlassian-ai-gateway/docs/get-started-with-the-atlassian-remote-mcp-server/
- Copilot for Jira: https://docs.github.com/en/copilot/how-tos/copilot-integrations/integrate-cloud-agent-with-jira
- Azure Boards and Copilot: https://learn.microsoft.com/en-us/azure/devops/boards/github/work-item-integration-github-copilot?view=azure-devops
- Playwright MCP: https://playwright.dev/docs/getting-started-mcp
