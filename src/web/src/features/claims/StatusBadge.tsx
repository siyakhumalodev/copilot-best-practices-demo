import type { ClaimStatus } from '../../api/types';
import { statusLabel } from '../../lib/format';

interface StatusBadgeProps {
  status: ClaimStatus;
}

/** A claim status as a badge. The text carries the meaning; the colour only supports it. */
export function StatusBadge({ status }: StatusBadgeProps) {
  return (
    <span className={`status-badge status-badge--${status.toLowerCase()}`} data-testid="status-badge">
      {statusLabel(status)}
    </span>
  );
}
