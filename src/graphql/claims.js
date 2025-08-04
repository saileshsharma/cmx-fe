import { gql } from "@apollo/client";

export const GET_ALL_CLAIMS = gql`
  query {
    allClaims {
      claimID
      claimStatus
      claimAmount
      incidentDate
    }
  }
`;

export const GET_CLAIM_BY_ID = gql`
  query ($claimID: ID!) {
    claimById(claimID: $claimID) {
      claimID
      claimStatus
      claimAmount
      incidentDate
      policy {
        policyID
        policyType
        status
        policyHolder {
          fullName
          email
        }
        agent {
          fullName
          licenseNo
        }
      }
    }
  }
`;

export const UPDATE_CLAIM = gql`
  mutation UpdateClaim($claimID: ID!, $claimStatus: String!, $claimAmount: Float!) {
    updateClaim(claimID: $claimID, claimStatus: $claimStatus, claimAmount: $claimAmount) {
      claimID
      claimStatus
      claimAmount
    }
  }
`;



export const GET_CLAIMS_PAGED = gql`
  query GetClaims($page: Int!, $size: Int!) {
    claims(page: $page, size: $size) {
      content {
        claimID
        claimStatus
        claimAmount
        incidentDate
      }
      totalPages
      totalElements
    }
  }
`;

export const GET_CLAIM_KPIS = gql`
  query {
    claimKPI {
      openCount
      closedCount
      pendingAmount
      statusDistribution {
        status
        count
      }
    }
  }
`;
