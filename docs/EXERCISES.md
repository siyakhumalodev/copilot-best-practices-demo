# Hands-on exercises

Each exercise takes 10-20 minutes. Start from a clean baseline: `node scripts/reset-demo.mjs --yes`.

1. **Context A/B.** Run `node scripts/demo.mjs context-off`, ask for CLM-100 with a one-line prompt, then
   `context-on` and use a sufficient prompt. Score both with the scorecard in `CONTEXT-PLAYBOOK.md`. Compare the context
   window control (or `/context` in Copilot CLI) after each.
2. **Write a path instruction.** Add `.github/instructions/api-contracts.instructions.md` (applyTo the contracts files)
   with three rules. Ask Copilot to add a field and check the References list shows your file.
3. **Write a skill.** Turn a procedure your team repeats (for example "add a feature flag") into a skill with a precise
   description. Ask a question that should load it - and one that should not.
4. **Review like a team.** `node scripts/demo.mjs review-setup`, invoke the `/review-changes` skill for this branch against
   main, then fix
   the Blockers with the "Fix the Blockers" handoff. Compare with a review that has no `code-review` skill.
5. **Two repositories.** `node scripts/split-repos.mjs`, open the workspace, implement CLM-102 across both. Then try the
   same from Copilot CLI with `--add-dir`.
6. **Orchestrate.** Invoke the `/deliver-story` skill with `CLM-101`. At the gate, park one gap and approve the rest. Check the traceability report
   shows the parked item.
7. **Connect a tool.** Add the Azure DevOps or Atlassian MCP server with `node scripts/setup.mjs --ado-org <org>` or
   `--jira`, import a story and read it back.
8. **Token diet.** Repeat a task with every MCP server enabled and then with only the ones needed. Compare `/context`.
