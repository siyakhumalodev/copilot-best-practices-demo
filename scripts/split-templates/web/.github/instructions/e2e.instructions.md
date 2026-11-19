---
applyTo: "e2e/**"
description: Playwright end-to-end test conventions for ClaimsDesk web.
---

# Playwright conventions

- One user journey per test; `getByRole` / `getByLabel` / `getByTestId` only; web-first assertions; no `waitForTimeout`.
- Seed data is relative to today: match claim ids with a pattern (`/CLM-\d{4}-0001/`).
