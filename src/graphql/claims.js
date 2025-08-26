// claims.queries.js
import { gql } from "@apollo/client";

/** Backend-aligned enum for UI use (plain JS) */
export const ClaimStatusEnum = {
  REGISTERED: "REGISTERED",
  UNDER_REVIEW: "UNDER_REVIEW",
  APPROVED: "APPROVED",
  REJECTED: "REJECTED",
  PAID: "PAID",
};

/** 1) Get claims by status — calls getClaimsByStatus on BE */
export const GET_CLAIMS_BY_STATUS = gql`
  query GetClaimsByStatus($status: ClaimStatus!) {
    getClaimsByStatus(status: $status) {
      id
      claimStatus
      claimAmount
    }
  }
`;

/** 2) Get claim by id — arg is claimId; fields are camelCase.
 *   Keep or adjust the nested policy block to match your schema.
 */
export const GET_CLAIM_BY_ID = gql`
  query GetClaimById($id: ID!) {
    getClaimById(id: $id) {
      id
      claimStatus
      claimAmount
      policy {
        policyId
        status
        insured { fullName }
        agent { fullName }
      }
    }
  }
`;

/** 3) Update claim status (no unused variables) */
export const UPDATE_CLAIM = gql`
  mutation UpdateClaimStatus($id: ID!, $status: ClaimStatus!) {
    updateClaimStatus(id: $id, status: $status) {
      id
      claimStatus
      claimAmount
      incidentDate
    }
  }
`;

/** 4) Get all claims — merged & validated:
 *    - single 'vehicle' selection (no duplicates)
 *    - includes 'fnol' block
 *    - add 'policy { policyNumber }' only if your Claim type has it
 */
export const GET_ALL_CLAIMS = gql`
  query GetAllClaims {
    getAllClaims {
      id
      claimStatus
      claimAmount
      claimDate
      claimNumber
      incidentDate
      dateReported
      claimSeverity
      fnol {
        id
        accidentDate
        description
        policeReportNo
        severity
      }

      # Uncomment if your schema exposes this relation:
      # policy { policyNumber }
    }
  }
`;
