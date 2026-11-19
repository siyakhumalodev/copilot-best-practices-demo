import { render, screen, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiError, getClaim } from '../../api/client';
import type { ClaimResponse, ClaimStatus, TriageResponse } from '../../api/types';
import { ClaimDetail } from './ClaimDetail';

vi.mock('../../api/client', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../api/client')>()),
  getClaim: vi.fn(),
}));

const fastTrack: TriageResponse = {
  outcome: 'FastTrack',
  reasons: [{ code: 'FAST_TRACK_ELIGIBLE', message: 'Meets all fast-track criteria' }],
};

const claim: ClaimResponse = {
  claimId: 'CLM-2026-0001',
  policyNumber: 'POL-100001',
  product: 'Home',
  peril: 'EscapeOfWater',
  incidentDate: '2026-10-13',
  reportedDate: '2026-10-15',
  claimedAmount: 1850,
  description: 'Synthetic water damage claim',
  claimantName: 'Synthetic Claimant',
  status: 'Submitted',
  policyExcess: 250,
  policyCoverLimit: 15000,
  createdAt: '2026-10-15T12:00:00+00:00',
  triage: fastTrack,
};

const outcomes: { label: string; className: string; triage: TriageResponse }[] = [
  { label: 'Fast-track', className: 'triage-badge--fasttrack', triage: fastTrack },
  {
    label: 'Standard review',
    className: 'triage-badge--standardreview',
    triage: {
      outcome: 'StandardReview',
      reasons: [
        { code: 'PRIOR_CLAIMS', message: '2 or more prior claims in the last 12 months' },
        { code: 'ABOVE_FAST_TRACK_LIMIT', message: 'Claimed amount is above the fast-track limit of £2,500.00' },
        { code: 'LATE_NOTIFICATION', message: 'Reported more than 30 days after the incident' },
      ],
    },
  },
  {
    label: 'Referred',
    className: 'triage-badge--referred',
    triage: {
      outcome: 'Referred',
      reasons: [
        { code: 'FREQUENT_CLAIMS', message: '3 or more prior claims in the last 12 months' },
        { code: 'NEW_POLICY', message: 'Incident within the first 14 days of cover' },
        { code: 'VERY_LATE_NOTIFICATION', message: 'Reported more than 90 days after the incident' },
        { code: 'HIGH_VALUE_FOR_COVER', message: 'Claimed amount is more than 80% of the cover limit' },
      ],
    },
  },
];

describe('ClaimDetail triage (R5-R7, G11)', () => {
  beforeEach(() => {
    vi.mocked(getClaim).mockReset();
    vi.mocked(getClaim).mockResolvedValue(claim);
  });

  // Keep the claim facts identical: the UI must display, not recalculate, the API decision.
  it.each(outcomes)('displays $label and every API reason separately from lifecycle', async ({ label, className, triage }) => {
    vi.mocked(getClaim).mockResolvedValue({ ...claim, triage });

    render(<ClaimDetail claimId={claim.claimId} />);

    const badge = await screen.findByTestId('triage-badge');
    expect(badge).toHaveTextContent(label);
    expect(badge).toHaveClass('triage-badge', className);
    const lifecycle = screen.getByTestId('lifecycle-status');
    expect(lifecycle).toHaveTextContent('Lifecycle status: Submitted');
    expect(within(lifecycle).getByTestId('status-badge')).not.toBe(badge);
    expect(within(lifecycle).queryByTestId('triage-badge')).not.toBeInTheDocument();

    const reasons = screen.getByRole('list', { name: 'Triage reasons' });
    expect(within(reasons).getAllByRole('listitem')).toHaveLength(triage.reasons.length);
    for (const reason of triage.reasons) {
      expect(within(reasons).getByText(reason.message, { exact: true })).toBeVisible();
    }
    // R9: preserve existing detail fields without introducing history or email.
    expect(screen.getByText('Synthetic Claimant')).toBeInTheDocument();
    expect(screen.getByText('£1,850.00')).toBeInTheDocument();
    expect(screen.getByText('13 Oct 2026')).toBeInTheDocument();
    expect(getClaim).toHaveBeenCalledWith(claim.claimId);
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });

  it('displays the configured-limit message verbatim rather than substituting the default (G2)', async () => {
    const message = 'Claimed amount is above the fast-track limit of £3,000.00';
    vi.mocked(getClaim).mockResolvedValue({
      ...claim,
      triage: { outcome: 'StandardReview', reasons: [{ code: 'ABOVE_FAST_TRACK_LIMIT', message }] },
    });

    render(<ClaimDetail claimId={claim.claimId} />);

    const reasons = await screen.findByRole('list', { name: 'Triage reasons' });
    expect(within(reasons).getByText(message, { exact: true })).toBeVisible();
    expect(within(reasons).getAllByRole('listitem')).toHaveLength(1);
    expect(screen.queryByText(/£2,500\.00/)).not.toBeInTheDocument();
  });

  it.each<ClaimStatus>(['Settled', 'Rejected', 'Withdrawn'])('still displays API triage for a %s claim', async (status) => {
    vi.mocked(getClaim).mockResolvedValue({ ...claim, status });

    render(<ClaimDetail claimId={claim.claimId} />);

    expect(await screen.findByTestId('triage-badge')).toHaveTextContent('Fast-track');
    expect(screen.getByTestId('status-badge')).toHaveTextContent(status);
    expect(screen.getByRole('list', { name: 'Triage reasons' })).toHaveTextContent('Meets all fast-track criteria');
  });

  it('retains the loading state without showing a premature triage result', () => {
    vi.mocked(getClaim).mockReturnValue(new Promise<ClaimResponse>(() => {}));

    render(<ClaimDetail claimId={claim.claimId} />);

    expect(screen.getByRole('status')).toHaveTextContent('Loading the claim…');
    expect(screen.queryByTestId('triage-badge')).not.toBeInTheDocument();
    expect(screen.queryByRole('list', { name: 'Triage reasons' })).not.toBeInTheDocument();
  });

  it.each([
    {
      name: 'not found',
      error: new ApiError(404, { code: 'CLAIM_NOT_FOUND', detail: 'Claim not found.' }),
      message: 'Claim not found.',
    },
    {
      name: 'network failure',
      error: new TypeError('Failed to fetch'),
      message: 'The ClaimsDesk API is not responding.',
    },
    {
      name: 'unexpected failure',
      error: new Error('Internal diagnostic must not be displayed'),
      message: 'Something went wrong. Please try again.',
    },
  ])('retains accessible error handling for $name without triage or diagnostics', async ({ error, message }) => {
    vi.mocked(getClaim).mockRejectedValue(error);

    render(<ClaimDetail claimId={claim.claimId} />);

    expect(await screen.findByRole('alert')).toHaveTextContent(`Could not load the claim. ${message}`);
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
    expect(screen.queryByTestId('triage-badge')).not.toBeInTheDocument();
    expect(screen.queryByRole('list', { name: 'Triage reasons' })).not.toBeInTheDocument();
    expect(screen.queryByText(/Internal diagnostic/)).not.toBeInTheDocument();
  });
});
