import { useEffect, useState, type ChangeEvent } from 'react';
import { describeError, listClaims } from '../../api/client';
import type { ClaimStatus, ClaimSummaryResponse } from '../../api/types';
import { claimStatuses, formatDate, formatGbp, perilLabel, statusLabel } from '../../lib/format';
import { routes } from '../../routing';
import { StatusBadge } from './StatusBadge';

type StatusFilter = ClaimStatus | 'All';

type LoadState =
  | { kind: 'loading' }
  | { kind: 'loaded'; filter: StatusFilter; claims: ClaimSummaryResponse[] }
  | { kind: 'failed'; message: string };

export function ClaimsList() {
  const [filter, setFilter] = useState<StatusFilter>('All');
  const [state, setState] = useState<LoadState>({ kind: 'loading' });

  useEffect(() => {
    let ignore = false;
    listClaims(filter === 'All' ? undefined : filter)
      .then((claims) => {
        if (!ignore) {
          setState({ kind: 'loaded', filter, claims });
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
  }, [filter]);

  function handleFilterChange(event: ChangeEvent<HTMLSelectElement>) {
    setFilter(event.target.value as StatusFilter);
    setState({ kind: 'loading' });
  }

  return (
    <section aria-labelledby="claims-heading">
      <div className="page-header">
        <h1 id="claims-heading">Claims</h1>
        <div className="filter">
          <label htmlFor="status-filter">Status</label>
          <select id="status-filter" data-testid="status-filter" value={filter} onChange={handleFilterChange}>
            <option value="All">All</option>
            {claimStatuses.map((status) => (
              <option key={status} value={status}>
                {statusLabel(status)}
              </option>
            ))}
          </select>
        </div>
      </div>
      {renderContent(state)}
    </section>
  );
}

function renderContent(state: LoadState) {
  switch (state.kind) {
    case 'loading':
      return <p role="status">Loading claims…</p>;
    case 'failed':
      return (
        <p role="alert" className="message message--error">
          Could not load the claims. {state.message}
        </p>
      );
    case 'loaded':
      if (state.claims.length === 0) {
        return <p className="message">No claims match this filter.</p>;
      }
      return (
        <table className="data-table" data-testid="claims-table">
          <caption className="visually-hidden">
            {state.filter === 'All' ? 'All claims' : `${statusLabel(state.filter)} claims`}, most recently reported first
          </caption>
          <thead>
            <tr>
              <th scope="col">Claim</th>
              <th scope="col">Policy</th>
              <th scope="col">Peril</th>
              <th scope="col">Incident date</th>
              <th scope="col">Reported</th>
              <th scope="col" className="numeric">
                Amount
              </th>
              <th scope="col">Status</th>
            </tr>
          </thead>
          <tbody>
            {state.claims.map((claim) => (
              <tr key={claim.claimId} data-testid={`claim-row-${claim.claimId}`}>
                <th scope="row">
                  <a href={routes.claim(claim.claimId)}>{claim.claimId}</a>
                </th>
                <td>{claim.policyNumber}</td>
                <td>{perilLabel(claim.peril)}</td>
                <td>{formatDate(claim.incidentDate)}</td>
                <td>{formatDate(claim.reportedDate)}</td>
                <td className="numeric">{formatGbp(claim.claimedAmount)}</td>
                <td>
                  <StatusBadge status={claim.status} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      );
  }
}
