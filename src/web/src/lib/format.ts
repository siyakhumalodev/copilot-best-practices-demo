import type { ClaimStatus, Peril, Product } from '../api/types';

const gbpFormat = new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP' });

const dateFormat = new Intl.DateTimeFormat('en-GB', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
  timeZone: 'UTC',
});

const perilLabels: Record<Peril, string> = {
  AccidentalDamage: 'Accidental damage',
  Theft: 'Theft',
  EscapeOfWater: 'Escape of water',
  Storm: 'Storm',
  Collision: 'Collision',
  Windscreen: 'Windscreen',
  LostBaggage: 'Lost baggage',
};

const statusLabels: Record<ClaimStatus, string> = {
  Submitted: 'Submitted',
  InReview: 'In review',
  Approved: 'Approved',
  Rejected: 'Rejected',
  Settled: 'Settled',
  Withdrawn: 'Withdrawn',
};

const productLabels: Record<Product, string> = {
  Home: 'Home',
  Motor: 'Motor',
  Travel: 'Travel',
};

/** Every peril, in the order the API defines them. */
export const perils = Object.keys(perilLabels) as Peril[];

/** Every claim status, in lifecycle order. */
export const claimStatuses = Object.keys(statusLabels) as ClaimStatus[];

/** 1850 -> "£1,850.00". */
export function formatGbp(amount: number): string {
  return gbpFormat.format(amount);
}

/** "2026-10-12" -> "12 Oct 2026". Read as a UTC calendar date, so it never shifts by a day. */
export function formatDate(isoDate: string): string {
  const date = new Date(`${isoDate.slice(0, 10)}T00:00:00Z`);
  return Number.isNaN(date.getTime()) ? isoDate : dateFormat.format(date);
}

/** "EscapeOfWater" -> "Escape of water". */
export function perilLabel(peril: Peril): string {
  return perilLabels[peril];
}

/** "InReview" -> "In review". */
export function statusLabel(status: ClaimStatus): string {
  return statusLabels[status];
}

export function productLabel(product: Product): string {
  return productLabels[product];
}
