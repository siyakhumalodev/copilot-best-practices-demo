import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { listClaims } from '../../api/client';
import type { ClaimSummaryResponse } from '../../api/types';
import { ClaimsList } from './ClaimsList';

vi.mock('../../api/client', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../api/client')>()),
  listClaims: vi.fn(),
}));

const claims: ClaimSummaryResponse[] = [
  {
    claimId: 'CLM-2026-0009',
    policyNumber: 'POL-100001',
    peril: 'AccidentalDamage',
    incidentDate: '2026-10-30',
    reportedDate: '2026-10-31',
    claimedAmount: 240,
    status: 'Submitted',
  },
  {
    claimId: 'CLM-2026-0001',
    policyNumber: 'POL-100001',
    peril: 'EscapeOfWater',
    incidentDate: '2026-10-13',
    reportedDate: '2026-10-15',
    claimedAmount: 1850,
    status: 'Submitted',
  },
];

describe('ClaimsList', () => {
  beforeEach(() => {
    vi.mocked(listClaims).mockReset();
    vi.mocked(listClaims).mockResolvedValue(claims);
  });

  it('renders a row for each claim', async () => {
    render(<ClaimsList />);

    const row = await screen.findByTestId('claim-row-CLM-2026-0001');
    expect(within(row).getByRole('link', { name: 'CLM-2026-0001' })).toHaveAttribute('href', '#/claims/CLM-2026-0001');
    expect(within(row).getByText('Escape of water')).toBeInTheDocument();
    expect(within(row).getByText('13 Oct 2026')).toBeInTheDocument();
    expect(within(row).getByText('£1,850.00')).toBeInTheDocument();
    expect(screen.getAllByTestId(/^claim-row-/)).toHaveLength(2);
  });

  it('shows a message when no claims match', async () => {
    vi.mocked(listClaims).mockResolvedValue([]);

    render(<ClaimsList />);

    expect(await screen.findByText('No claims match this filter.')).toBeInTheDocument();
  });

  it('reloads the claims for the selected status', async () => {
    const user = userEvent.setup();
    render(<ClaimsList />);
    await screen.findByTestId('claims-table');

    await user.selectOptions(screen.getByLabelText('Status'), 'Submitted');

    expect(listClaims).toHaveBeenLastCalledWith('Submitted');
    expect(await screen.findByRole('table', { name: /^Submitted claims/ })).toBeInTheDocument();
  });
});
