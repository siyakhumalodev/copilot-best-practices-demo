import type {
  ClaimResponse,
  ClaimStatus,
  ClaimSummaryResponse,
  PolicyResponse,
  ProblemDetails,
  SubmitClaimRequest,
} from './types';

/** A failed API call: the HTTP status and, when the API sent them, the problem details. */
export class ApiError extends Error {
  readonly status: number;
  readonly problem: ProblemDetails | undefined;

  constructor(status: number, problem?: ProblemDetails) {
    super(problem?.detail ?? problem?.title ?? `The request failed with status ${status}.`);
    this.name = 'ApiError';
    this.status = status;
    this.problem = problem;
  }
}

// Relative URLs: the Vite dev server proxies /api to the API (see vite.config.ts).
const baseUrl = '';

export function listClaims(status?: ClaimStatus): Promise<ClaimSummaryResponse[]> {
  const query = status ? `?${new URLSearchParams({ status }).toString()}` : '';
  return request<ClaimSummaryResponse[]>(`/api/claims${query}`);
}

export function getClaim(claimId: string): Promise<ClaimResponse> {
  return request<ClaimResponse>(`/api/claims/${encodeURIComponent(claimId)}`);
}

export function submitClaim(claim: SubmitClaimRequest): Promise<ClaimResponse> {
  return request<ClaimResponse>('/api/claims', { method: 'POST', body: JSON.stringify(claim) });
}

export function getPolicy(policyNumber: string): Promise<PolicyResponse> {
  return request<PolicyResponse>(`/api/policies/${encodeURIComponent(policyNumber)}`);
}

/** A short message for people when a call fails. */
export function describeError(error: unknown): string {
  const unreachable = 'The ClaimsDesk API is not responding. Check that it is running on http://localhost:5080.';
  if (error instanceof ApiError) {
    // Without problem details a 5xx came from the dev-server proxy, not from the API.
    return error.problem === undefined && error.status >= 500 ? unreachable : error.message;
  }
  if (error instanceof TypeError) {
    return unreachable;
  }
  return 'Something went wrong. Please try again.';
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers);
  headers.set('Accept', 'application/json');
  if (init.body !== undefined) {
    headers.set('Content-Type', 'application/json');
  }

  const response = await fetch(`${baseUrl}${path}`, { ...init, headers });
  if (!response.ok) {
    throw new ApiError(response.status, await readProblem(response));
  }
  return (await response.json()) as T;
}

async function readProblem(response: Response): Promise<ProblemDetails | undefined> {
  const contentType = response.headers.get('Content-Type') ?? '';
  if (!contentType.includes('json')) {
    return undefined;
  }
  try {
    return (await response.json()) as ProblemDetails;
  } catch {
    return undefined;
  }
}
