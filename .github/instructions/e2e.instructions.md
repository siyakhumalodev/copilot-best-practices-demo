---
applyTo: "src/web/e2e/**"
description: Playwright end-to-end test conventions for ClaimsDesk.
---

# Playwright conventions

- Tests live in `src/web/e2e/*.spec.ts`; one user journey per test; the title states the behaviour.
- Locators: `getByRole`, `getByLabel`, `getByTestId`. Never CSS chains or XPath.
- Web-first assertions (`await expect(locator).toHaveText(...)`). Never `waitForTimeout`.
- Seed data is relative to today, so match claim ids with a pattern (`/CLM-\d{4}-0001/`), never a hard-coded year.
- The Playwright config starts the API and the web app (or reuses running ones): `npm run e2e --prefix src/web`.
