import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { StatusBadge } from './StatusBadge';

describe('StatusBadge', () => {
  it('shows the status in words', () => {
    render(<StatusBadge status="InReview" />);

    expect(screen.getByTestId('status-badge')).toHaveTextContent('In review');
  });

  it('has a class for each status so it can be styled', () => {
    render(<StatusBadge status="Withdrawn" />);

    expect(screen.getByTestId('status-badge')).toHaveClass('status-badge', 'status-badge--withdrawn');
  });
});
