import { gql } from "@apollo/client";



export const GET_ALL_POLICIES = gql`
  query GetAllPolicies {
    getAllPolicies {
      id
      policyNumber
      policyType
      coverageType
      sumInsured
      premium
      policyStatus
      lob
      startDate
      endDate
      claims {
        id
        claimNumber
        claimStatus
      }
      insured {
        firstName
        lastName
        dob
        addressLine1
        addressLine2
        gender
        email
        nationalId
        passportNumber
        driverLicenseNo
        phoneNumber
        licenseIssueDate
        licenseExpiryDate
        yearsDriving
      }
      address {
        addressLine1
        addressLine2
        city
        province
        postalCode
        country
        latitude
        longitude
        locationType
      }
      vehicle {
        id
        registrationNumber
        chassis
        make
        model
        fuelType
        bodyType
        engineNo
        year
        registrationState
        ownerName
        usageType
        vin
        ownerName
        ownerContact
        color
      }
    }
  }
`;

export const GET_POLICY_BY_STATUS = gql`
  query GetPolicyByStatus($policyStatus: String!) {
    getPolicyByStatus(policyStatus: $policyStatus) {
      id
      policyNumber
      sumInsured
      premium
      policyStatus
      startDate
      endDate
      insured {
        firstName
        lastName
      }
      vehicle {
        id
        registrationNumber
        make
        model
      }
    }
  }
`;

export const GET_POLICY_BY_ID = gql`
  query GetPolicyById($policyId: ID!) {
    getPolicyById(policyId: $policyId) {
      id
      policyNumber
      policyType
      coverageType
      sumInsured
      premium
      policyStatus
      startDate
      endDate
      insured {
        firstName
        lastName
        email
      }
      vehicle {
        id
        registrationNumber
        make
        model
      }
      claims {
        id
        claimNumber
        claimStatus
      }
    }
  }
`;


export const GET_POLICY_WITH_CLAIMS = gql`
  query GetPolicyWithClaims($policyNumber: String!) {
    getPolicyByNumber(policyNumber: $policyNumber) {
      id
      policyNumber
      claims {
        id
        claimNumber
        status
        severity
        createdAt
        fnol {
          fnolReferenceNo
          fnolState
        }
      }
    }
  }
`;



export const GET_POLICY_BY_NUMBER = gql`
  query GetPolicyByNumber($policyNumber: String!) {
    getPolicyByNumber(policyNumber: $policyNumber) {
      id
      policyNumber
      policyType
      policyStatus
      coverageType
      sumInsured
      premium
      startDate
      endDate
      insured {
        firstName
        lastName
        email
        phoneNumber
      }
      vehicle {
        id
        registrationNumber
        make
        model
        year
      }
      address {
        addressLine1
        city
        province
        postalCode
        country
      }
    }
  }
`;

export const POLICY_BY_LICENSE_PLATE = gql`
  query PolicyByLicensePlate($plate: String!) {
    policyByLicensePlate(plate: $plate) {
      policyId
      vehicleId
      policyNumber
      policyStatus
      coverageType
      startDate
      endDate
      insuredName
      registrationNumber
    }
  }
`;

export const POLICIES_BY_LICENSE_PLATE = gql`
  query PoliciesByLicensePlate($plate: String!, $includeInactive: Boolean) {
    policiesByLicensePlate(plate: $plate, includeInactive: $includeInactive) {
      policyId
      vehicleId
      policyNumber
      policyStatus
      coverageType
      startDate
      endDate
      insuredName
      registrationNumber
    }
  }
`;



