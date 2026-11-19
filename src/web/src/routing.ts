import { useSyncExternalStore } from 'react';

/** The screens of the app, addressed by the URL hash: #/claims, #/claims/<claimId> and #/new. */
export type Route =
  | { name: 'claims' }
  | { name: 'claim'; claimId: string }
  | { name: 'new' }
  | { name: 'not-found' };

export const routes = {
  claims: '#/claims',
  newClaim: '#/new',
  claim: (claimId: string) => `#/claims/${encodeURIComponent(claimId)}`,
};

export function parseRoute(hash: string): Route {
  const path = hash.replace(/^#/, '');
  if (path === '' || path === '/' || path === '/claims') {
    return { name: 'claims' };
  }
  if (path === '/new') {
    return { name: 'new' };
  }

  const match = /^\/claims\/([^/]+)$/.exec(path);
  const claimId = match ? safeDecode(match[1]) : undefined;
  return claimId ? { name: 'claim', claimId } : { name: 'not-found' };
}

export function navigate(hash: string): void {
  window.location.hash = hash;
}

/** The current route. Components using it re-render when the hash changes. */
export function useRoute(): Route {
  const hash = useSyncExternalStore(subscribe, () => window.location.hash);
  return parseRoute(hash);
}

function subscribe(onChange: () => void): () => void {
  window.addEventListener('hashchange', onChange);
  return () => window.removeEventListener('hashchange', onChange);
}

function safeDecode(value: string): string | undefined {
  try {
    return decodeURIComponent(value);
  } catch {
    return undefined;
  }
}
