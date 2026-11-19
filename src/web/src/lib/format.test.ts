import { describe, expect, it } from 'vitest';
import { formatDate, formatGbp, perilLabel, statusLabel } from './format';

describe('formatGbp', () => {
  it('formats pounds with a thousands separator and two decimal places', () => {
    expect(formatGbp(1850)).toBe('£1,850.00');
    expect(formatGbp(250000)).toBe('£250,000.00');
    expect(formatGbp(0.5)).toBe('£0.50');
  });
});

describe('formatDate', () => {
  it('formats an ISO date as day, short month and year', () => {
    expect(formatDate('2026-10-12')).toBe('12 Oct 2026');
  });

  it('reads the date as a calendar date, so it never shifts by a day', () => {
    expect(formatDate('2026-01-01')).toBe('1 Jan 2026');
    expect(formatDate('2026-12-31')).toBe('31 Dec 2026');
  });

  it('returns the input unchanged when it is not a date', () => {
    expect(formatDate('not a date')).toBe('not a date');
  });
});

describe('perilLabel', () => {
  it('turns a peril into words', () => {
    expect(perilLabel('EscapeOfWater')).toBe('Escape of water');
    expect(perilLabel('LostBaggage')).toBe('Lost baggage');
    expect(perilLabel('Theft')).toBe('Theft');
  });
});

describe('statusLabel', () => {
  it('turns a status into words', () => {
    expect(statusLabel('InReview')).toBe('In review');
    expect(statusLabel('Submitted')).toBe('Submitted');
  });
});
