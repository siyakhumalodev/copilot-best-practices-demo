// Contract mirrors src/ClaimsDesk.Api/Claims/ClaimContracts.cs - change both together.
// JSON is camelCase, enums are strings, dates are "yyyy-MM-dd" and money is a number of pounds (2 decimal places).

export type ClaimStatus = 'Submitted' | 'InReview' | 'Approved' | 'Rejected' | 'Settled' | 'Withdrawn';

export type Peril =
  | 'AccidentalDamage'
  | 'Theft'
  | 'EscapeOfWater'
  | 'Storm'
  | 'Collision'
  | 'Windscreen'
  | 'LostBaggage';

export type Product = 'Home' | 'Motor' | 'Travel';

export type PolicyStatus = 'Active' | 'Lapsed' | 'Cancelled';

/** A calendar date, "yyyy-MM-dd" (C# DateOnly). */
export type IsoDate = string;

/** Body of POST /api/claims (C# SubmitClaimRequest). */
export interface SubmitClaimRequest {
  policyNumber: string | null;
  peril: Peril | null;
  incidentDate: IsoDate | null;
  claimedAmount: number | null;
  description: string | null;
  claimantName: string | null;
  claimantEmail: string | null;
}

/** A row of GET /api/claims (C# ClaimSummaryResponse). */
export interface ClaimSummaryResponse {
  claimId: string;
  policyNumber: string;
  peril: Peril;
  incidentDate: IsoDate;
  reportedDate: IsoDate;
  claimedAmount: number;
  status: ClaimStatus;
}

/** GET /api/claims/{claimId} (C# ClaimResponse). Never includes the claimant's email (R9). */
export interface ClaimResponse {
  claimId: string;
  policyNumber: string;
  product: Product;
  peril: Peril;
  incidentDate: IsoDate;
  reportedDate: IsoDate;
  claimedAmount: number;
  description: string;
  claimantName: string;
  status: ClaimStatus;
  policyExcess: number;
  policyCoverLimit: number;
  /** ISO 8601 date and time with offset (C# DateTimeOffset). */
  createdAt: string;
}

/** GET /api/policies/{policyNumber} (C# PolicyResponse in src/ClaimsDesk.Api/Policies/PolicyContracts.cs). */
export interface PolicyResponse {
  policyNumber: string;
  holderName: string;
  product: Product;
  coverLimit: number;
  excess: number;
  startDate: IsoDate;
  endDate: IsoDate;
  status: PolicyStatus;
}

/** One broken rule in a validation problem (C# ValidationError); `field` is the camelCase request field. */
export interface ValidationError {
  code: string;
  field: string;
  message: string;
}

/** RFC 9457 problem details, with the ClaimsDesk extensions `code` and `errors`. */
export interface ProblemDetails {
  type?: string;
  title?: string;
  status?: number;
  detail?: string;
  instance?: string;
  code?: string;
  errors?: ValidationError[];
}
