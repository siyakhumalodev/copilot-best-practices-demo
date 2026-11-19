import { useEffect, useState } from 'react';
import { describeError, getClaim } from '../../api/client';
import type { ClaimResponse } from '../../api/types';
import { formatDate, formatGbp, perilLabel, productLabel } from '../../lib/format';
import { routes } from '../../routing';
import { StatusBadge } from './StatusBadge';

type LoadState =
  | { kind: 'loading' }
  | { kind: 'loaded'; claim: ClaimResponse }
  | { kind: 'failed'; message: string };

interface ClaimDetailProps {
  claimId: string;
}

export function ClaimDetail({ claimId }: ClaimDetailProps) {
  const [state, setState] = useState<LoadState>({ kind: 'loading' });

  useEffect(() => {
    let ignore = false;
    getClaim(claimId)
      .then((claim) => {
        if (!ignore) {
          setState({ kind: 'loaded', claim });
        }
      })
      .catch((error: unknown) => {
        if (!ignore) {
          setState({ kind: 'failed', message: describeError(error) });
        }
      });
    return () => {
      ignore = true;
    };
  }, [claimId]);

  return (
    <article className="claim-detail" data-testid="claim-detail" aria-labelledby="claim-heading">
      <p className="back-link">
        <a href={routes.claims}>
          <span aria-hidden="true">←</span> Back to claims
        </a>
      </p>
      <div className="page-header">
        <h1 id="claim-heading">Claim {claimId}</h1>
        {state.kind === 'loaded' && <StatusBadge status={state.claim.status} />}
      </div>
      {state.kind === 'loading' && <p role="status">Loading the claim…</p>}
      {state.kind === 'failed' && (
        <p role="alert" className="message message--error">
          Could not load the claim. {state.message}
        </p>
      )}
      {state.kind === 'loaded' && (
        <dl className="details">
          <div>
            <dt>Policy</dt>
            <dd>
              {state.claim.policyNumber} ({productLabel(state.claim.product)})
            </dd>
          </div>
          <div>
            <dt>Peril</dt>
            <dd>{perilLabel(state.claim.peril)}</dd>
          </div>
          <div>
            <dt>Incident date</dt>
            <dd>{formatDate(state.claim.incidentDate)}</dd>
          </div>
          <div>
            <dt>Reported</dt>
            <dd>{formatDate(state.claim.reportedDate)}</dd>
          </div>
          <div>
            <dt>Claimed amount</dt>
            <dd>{formatGbp(state.claim.claimedAmount)}</dd>
          </div>
          <div>
            <dt>Policy excess</dt>
            <dd>{formatGbp(state.claim.policyExcess)}</dd>
          </div>
          <div>
            <dt>Cover limit</dt>
            <dd>{formatGbp(state.claim.policyCoverLimit)}</dd>
          </div>
          <div>
            <dt>Claimant</dt>
            <dd>{state.claim.claimantName}</dd>
          </div>
          <div className="details__wide">
            <dt>Description</dt>
            <dd>{state.claim.description}</dd>
          </div>
        </dl>
      )}
    </article>
  );
}
