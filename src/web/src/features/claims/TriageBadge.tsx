import type { TriageOutcome } from '../../api/types';

const outcomeLabels: Record<TriageOutcome, string> = {
  FastTrack: 'Fast-track',
  StandardReview: 'Standard review',
  Referred: 'Referred',
};

interface TriageBadgeProps {
  outcome: TriageOutcome;
}

/** R5-R7: display the API decision, with text as well as colour. */
export function TriageBadge({ outcome }: TriageBadgeProps) {
  return (
    <span className={`triage-badge triage-badge--${outcome.toLowerCase()}`} data-testid="triage-badge">
      {outcomeLabels[outcome]}
    </span>
  );
}
