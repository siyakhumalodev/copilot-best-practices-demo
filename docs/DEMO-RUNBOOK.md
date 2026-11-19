---
title: ClaimsDesk self-guided walkthrough
description: Set up ClaimsDesk and practise context management, repository standards, code review and agent workflows.
---

ClaimsDesk uses fictional insurance claims and synthetic data. Use this walkthrough alongside the
[hands-on exercises](EXERCISES.md) at your own pace.

## Set up your copy

Clone the published repository and open its root in VS Code. You need the .NET 10 SDK,
Node.js 20+ (22 LTS recommended), Git and GitHub Copilot.

```powershell
git clone --branch main https://github.com/siyakhumalodev/copilot-best-practices-demo
cd copilot-best-practices-demo
```

The clone already includes the repository history and the `demo-baseline` tag. Do not initialize another repository
or create a new baseline tag. Run setup:

```bash
node scripts/setup.mjs
```

Setup restores and builds the solution, installs web dependencies and Playwright Chromium, and runs smoke tests.
The reset command uses the published `demo-baseline` tag. If you cloned without tags, fetch the existing tag before
starting the exercises:

```powershell
git fetch origin tag demo-baseline
```

Run the API and web app in separate terminals:

```bash
dotnet run --project src/ClaimsDesk.Api
npm run dev --prefix src/web
```

Open <http://localhost:5173>, then check readiness:

```bash
node scripts/preflight.mjs
```

In VS Code, select the Copilot Harness and start only the MCP servers you need. Reusable tasks are skills, invoked
by name in Copilot Chat, such as `/map-solution`, `/add-endpoint` and `/review-changes`.

## Save work before resetting

```bash
node scripts/reset-demo.mjs --yes
```

This restores `src/`, `tests/`, `reports/`, `.github/` and `work-items/` to `demo-baseline`, removes new files in
those paths, restores parked context and deletes local `demo/*` branches. Commit or copy work you want to keep first.
It leaves scripts, docs, local MCP configuration, installed dependencies and build output alone.
Restart the API after restoring C# code; its in-memory data also resets on restart.

## Compare insufficient and sufficient context

Use [CLM-100](../work-items/CLM-100.md) and the [context scorecard](CONTEXT-PLAYBOOK.md#scorecard-clm-100).

1. Run `node scripts/demo.mjs context-off` to park repository instructions and skills.
2. Start a new chat and ask: "Add an estimated settlement to the claim details API."
3. Inspect the result against the scorecard. Check the layer containing the calculation, the escape-of-water excess,
   the zero floor, money types and boundary tests. Results vary; this is a comparison, not a guaranteed failure.
4. Save any comparison notes outside the reset paths, then reset and run `node scripts/demo.mjs context-on`.
5. Start another new chat and use a specific request:

   > Implement CLM-100 from work-items/CLM-100.md using the claims-rules skill (R4). Put the calculation in
   > ClaimsDesk.Domain, expose it on the claim detail response, add domain and API tests including the
   > escape-of-water and below-excess cases, then run `dotnet test -nologo -v q`.

Compare the code, tests and context usage, not only the wording of the answers. Use
`node scripts/demo.mjs status` to check context and branch state. In Copilot CLI, try `/context`, `/usage` and
`/compact`; see [CONTEXT-PLAYBOOK.md](CONTEXT-PLAYBOOK.md) for the controls and token-saving habits.

## Apply repository standards

Read [STANDARDS-AND-REVIEWS.md](STANDARDS-AND-REVIEWS.md) and explore `.github/`: repository instructions,
path instructions, skills and custom agents have different responsibilities.

Try this request in a new chat:

> /add-endpoint POST /api/claims/{claimId}/withdraw - only Submitted or InReview claims can be withdrawn (R8)

Inspect whether the result keeps rules in the domain, uses typed results and problem details, passes cancellation
through, avoids personal data in logs and adds tests for the lifecycle boundaries. Deterministic checks still matter:

```bash
dotnet test -nologo -v q
npm test --prefix src/web
npm run lint --prefix src/web
npm run typecheck --prefix src/web
```

## Review a deliberately flawed change

Save your work and start from a clean working tree:

```bash
node scripts/demo.mjs review-setup
```

This creates `demo/settle-claim` from your current branch and commits an intentionally flawed sample endpoint.
The fixture under `scripts/review-fixture/` is exercise input, not a pattern for application code.
The generated exercise commit is unsigned; your Git signing preferences are not changed.

Use the comparison branch printed by the command:

> /review-changes this branch against main

Replace `main` if you started from another branch. Compare the findings with the `code-review` skill and rulebook;
a green build alone does not establish a correct change. You can also try Source Control > Code Review in VS Code
or `/review` in Copilot CLI. Publishing a pull request is optional and requires your own approval.

After saving any fixes or review notes you want to keep:

```bash
node scripts/demo.mjs review-cleanup
```

Cleanup returns to the original branch and deletes the local exercise branch, including its commits. It refuses to
discard uncommitted work; use the reset command only when you intend to discard that work.

## Work across two repositories

```bash
node scripts/split-repos.mjs
```

Open `../claimsdesk-split/claimsdesk.code-workspace`. It contains API and web repositories with their own
instructions and an initial commit. The source checkout is unchanged. Install the web dependencies in
`claimsdesk-web`, then run both apps using the generated READMEs.

Use [CLM-102](../work-items/CLM-102.md) to add `daysOpen` and `isOverdue` across the API and web app.
Agree field names, types and rule R10 before changing either side, and add tests on both sides.
Alternatively, start Copilot CLI in the API repository and add the web repository with `--add-dir`.
See [WORKING-AT-SCALE.md](WORKING-AT-SCALE.md) for workspace and integration guidance.

## Configure optional integrations

Only configure integrations your organisation approves, and use synthetic work items for these exercises:

```bash
node scripts/setup.mjs --ado-org <org>
node scripts/setup.mjs --jira
```

`--ado-local <org>` selects the local Azure DevOps MCP server instead. Setup keeps `.vscode/mcp.json` and
`.mcp.json` aligned; do not put credentials in either file. Start only the required servers.
Try `/import-work-item` for an approved source or `/check-in-browser` against your local ClaimsDesk app.

## Follow an agent-assisted story

Read [CLM-101](../work-items/CLM-101.md), then invoke:

> /deliver-story CLM-101

The Feature Orchestrator asks the Story Analyst to compare the criteria with the rulebook and stops for your
approval. Decide which gaps to approve, change or park before implementation. The API and Web Developers then work
against the agreed contract, followed by verification, traceability and review. Some behavior is already implemented
in the shared snapshot; the analysis should identify what remains rather than assume every step is new work.

Inspect the resulting reports and compare them with the retained [CLM-101 examples](../reports/README.md).
Review the diff and test evidence yourself before committing, publishing or merging.

## Continue learning

Use [EXERCISES.md](EXERCISES.md) for independent practice and [ARCHITECTURE.md](ARCHITECTURE.md) for the application map.
Further learning is available through [GitHub Skills](https://learn.github.com/skills),
[GitHub certifications](https://learn.github.com/certifications) and
[Microsoft Learn's Copilot path](https://learn.microsoft.com/en-us/training/paths/copilot/).
