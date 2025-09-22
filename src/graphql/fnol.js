// src/graphql/fnol.js
import { gql } from "@apollo/client";

export const GET_ALL_FNOL = gql`
  query GetAllFnol {
    getAllFnol {
      id
      fnolState
      fnolReferenceNo
      accidentDate
      description
      severity
      accidentLocation {
        id
        city
        province
        postalCode
        latitude
        longitude
      }
      surveyor {
        id
        name
        status
      }
      policy {
        id
        policyNumber
      }
      vehicle {
        id
        registrationNumber
        make
        model
        year
      }
      insured {
        firstName
        lastName
        dob
        gender
        nationalId
        passportNumber
        email
        phoneNumber
        addressLine1
        addressLine2
        city
        province
        postalCode
        country
        driverLicenseNo
        licenseIssueDate
        licenseExpiryDate
        occupation
        maritalStatus
        yearsDriving
        insuredId
      }
      createdAt
      updatedAt
    }
  }
`;

export const GET_FNOL_BY_STATES = gql`
  query GetFnolByStates($states: [String!]!) {
    getFnolByStates(states: $states) {
      id
      fnolReferenceNo
      fnolState
      description
      accidentDate
      createdAt
      updatedAt
    }
  }
`;

export const CREATE_FNOL = gql`
  mutation CreateFnol(
    $policyNumber: String!
    $registrationNumber: String!
    $accidentLocationId: ID!
    $description: String!
    $severity: ClaimSeverity!
    $accidentDate: String!
  ) {
    createFnol(
      policyNumber: $policyNumber
      registrationNumber: $registrationNumber
      accidentLocationId: $accidentLocationId
      description: $description
      severity: $severity
      accidentDate: $accidentDate
    ) {
      fnol {
        id
        fnolReferenceNo
        accidentDate
        description
        accidentLocation {
          id
          addressLine1
          addressLine2
          city
          province
          postalCode
          country
          latitude
          longitude
          googlePlaceId
          locationType
          createdAt
        }
      }
    }
  }
`;

export const UPDATE_FNOL = gql`
  mutation UpdateFnol($id: ID!, $fnolState: FNOLState, $severity: ClaimSeverity, $description: String) {
    updateFnol(id: $id, fnolState: $fnolState, severity: $severity, description: $description) {
      id fnolState severity description
    }
  }
`;

export const ATTACH_FNOL_MEDIA = gql`
  mutation AttachFnolMedia($fnolId: ID!, $items: [FnolMediaInput!]!) {
    attachFnolMedia(fnolId: $fnolId, items: $items) {
      id
      media { id url type label createdAt }
    }
  }
`;
