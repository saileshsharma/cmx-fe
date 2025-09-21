import { gql } from "@apollo/client";

/* =========================
   Queries
   ========================= */
export const GET_ALL_FNOL = gql`
  query GetAllFnol {
    getAllFnol {
      id
      fnolState
      fnolReferenceNo
      accidentDate
      description
      severity
      accidentLocation { id city province postalCode latitude longitude }
      surveyor { id name status }
      vehicle { id registrationNumber make model year }
    }
  }
`;

/* =========================
   Mutations
   ========================= */
export const UPDATE_FNOL = gql`
  mutation UpdateFnol($id: ID!, $fnolState: FNOLState, $severity: ClaimSeverity, $description: String) {
    updateFnol(id: $id, fnolState: $fnolState, severity: $severity, description: $description) {
      id
      fnolState
      severity
      description
    }
  }
`;

export const LINK_ATTACHMENTS_TO_FNOL = gql`
  mutation LinkAttachmentsToFnol($fnolId: ID!, $attachmentIds: [ID!]!) {
    linkAttachmentsToFnol(fnolId: $fnolId, attachmentIds: $attachmentIds)
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
        }
        severity
        fnolState
        policy {
          id
          policyNumber
        }
        vehicle {
          id
          registrationNumber
        }
      }
      success
      message
    }
  }
`;

export const GET_FNOL_BY_REFERENCE = gql`
  query GetFnolByReference($fnolReferenceNo: String!) {
    getFnolByReference(fnolReferenceNo: $fnolReferenceNo) {
      id
      fnolReferenceNo
      fnolState
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
      vehicle {
        id
        registrationNumber
        make
        model
        year
      }
      policy {
        id
        policyNumber
      }
    }
  }
`;

export const ASSIGN_SURVEYOR = gql`
  mutation AssignSurveyor($fnolReferenceNo: String!) {
    assignSurveyor(fnolReferenceNo: $fnolReferenceNo) {
      fnolReferenceNo
      status
      message
      assignedSurveyor {
        id
        name
        email
        phone         # <-- matches SurveyorView.phone
        status        # <-- SurveyorStatus as String
        surveyorJobStatus     # <-- SurveyorJobStatus as String
        city
        province
        country
      }
    }
  }
`;


/* =========================
   Subscriptions
   ========================= */
export const FNOL_ASSIGNMENT_NOTICE = gql`
  subscription FnolAssignmentNotice($fnolReferenceNo: String!) {
    fnolAssignmentNotice(fnolReferenceNo: $fnolReferenceNo) {
      fnolReferenceNo
      status
      message
      timestamp
    }
  }
`;
