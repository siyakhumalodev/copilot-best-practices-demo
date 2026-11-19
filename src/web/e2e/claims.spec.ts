import { expect, test } from '@playwright/test';

// The seed data is relative to today, so claim ids are matched with a pattern - never a hard-coded year.

test('the claims list shows the seeded claims and filters them by status', async ({ page }) => {
  await page.goto('/');

  const allClaims = page.getByRole('table', { name: /^All claims/ });
  await expect(allClaims).toBeVisible();
  expect(await allClaims.getByTestId(/^claim-row-/).count()).toBeGreaterThanOrEqual(10);

  await page.getByTestId('status-filter').selectOption('Submitted');

  const submittedClaims = page.getByRole('table', { name: /^Submitted claims/ });
  await expect(submittedClaims).toBeVisible();
  const badges = submittedClaims.getByTestId('status-badge');
  await expect(badges.first()).toHaveText('Submitted');
  await expect(badges.filter({ hasNotText: 'Submitted' })).toHaveCount(0);
});

test('opening a claim shows its details', async ({ page }) => {
  await page.goto('/#/claims');

  await page.getByRole('link', { name: /CLM-\d{4}-0001/ }).click();

  await expect(page.getByRole('heading', { name: /CLM-\d{4}-0001/ })).toBeVisible();
  await expect(page.getByTestId('claim-detail')).toContainText('Escape of water');
});

test('a claim above the cover limit is rejected, and accepted once the amount is corrected', async ({ page }) => {
  await page.goto('/#/new');

  await page.getByLabel('Policy number', { exact: true }).fill('POL-100002');
  await page.getByLabel('Peril', { exact: true }).selectOption('Windscreen');
  await page.getByLabel('Incident date', { exact: true }).fill(isoDateDaysAgo(3));
  await page.getByLabel('Claimed amount', { exact: true }).fill('20000');
  await page.getByLabel('Description', { exact: true }).fill('A stone chip cracked the windscreen.');
  await page.getByLabel('Claimant name', { exact: true }).fill('Synthetic Customer 002');
  await page.getByLabel('Claimant email', { exact: true }).fill('customer002@example.com');
  await page.getByTestId('submit-claim').click();

  const amountError = page.getByTestId('field-error-claimedAmount');
  await expect(amountError).toBeVisible();
  await expect(amountError).toHaveAttribute('data-code', 'AMOUNT_OUT_OF_RANGE');

  await page.getByLabel('Claimed amount', { exact: true }).fill('500.00');
  await page.getByTestId('submit-claim').click();

  await expect(page).toHaveURL(/#\/claims\/CLM-\d{4}-\d{4}$/);
  const detail = page.getByTestId('claim-detail');
  await expect(detail).toContainText('POL-100002');
  await expect(detail).toContainText('£500.00');
});

function isoDateDaysAgo(days: number): string {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() - days);
  return date.toISOString().slice(0, 10);
}
