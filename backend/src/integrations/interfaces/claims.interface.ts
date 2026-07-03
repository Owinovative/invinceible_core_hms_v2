export interface ClaimPreauthRequest {
  patientId: string;
  facilityId: string;
  diagnosisCodes: string[];
  proposedServices: { code: string; amount: number }[];
}

export interface ClaimPreauthResponse {
  preauthId: string;
  status: 'APPROVED' | 'DENIED' | 'PENDING';
  approvedAmount: number;
  reason?: string;
  requiresReview: boolean;
}

export interface ClaimSubmissionRequest {
  claimId: number;
  localClaimNumber: string;
  facilityCode: string;
  patientId: string;
  memberNumber?: string;
  diagnosisCodes: string[];
  items: {
    serviceCode: string;
    description: string;
    quantity: number;
    unitPrice: number;
    netAmount: number;
  }[];
  totalAmount: number;
  visitType: 'IPD' | 'OPD';
  startDate: Date;
  endDate: Date;
  clinicianRegistrationNumber?: string;
}

export interface ClaimSubmissionResponse {
  externalClaimId: string;
  status: 'SUBMITTED' | 'QUEUED' | 'FAILED' | 'REJECTED';
  message?: string;
  timestamp: Date;
}

export interface IClaimsIntegration {
  requestPreauth(request: ClaimPreauthRequest): Promise<ClaimPreauthResponse>;
  submitClaim(request: ClaimSubmissionRequest): Promise<ClaimSubmissionResponse>;
  checkClaimStatus(externalClaimId: string): Promise<{ status: string; paidAmount?: number; reason?: string }>;
}
