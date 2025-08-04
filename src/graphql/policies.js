import { gql } from "@apollo/client";

// ✅ Query: Fetch policy by ID
export const GET_POLICY_BY_ID = gql`
  query ($policyId: String!) {
    policyById(policyId: $policyId) {
      policySeqID
      policyID
      policyType
      status
      startDate
      endDate
      policyHolder {
        fullName
        email
        dob
        address
      }
      agent {
        fullName
        licenseNo
      }
    }
  }
`;
