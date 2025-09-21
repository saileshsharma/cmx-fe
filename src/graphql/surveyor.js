import { gql } from "@apollo/client";

/* =========================
   Surveyor Queries
   ========================= */
export const GET_ALL_SURVEYORS = gql`
  query GetAllSurveyors {
    getAllSurveyors {
      id
      name
      email
      phoneNumber
      currentLat
      currentLng
      rating_avg
      app_version
      capacityPerDay
      activeJobsCount
      skills
      createdAt
      updatedAt
      city
      province
      country
      internal
      status
      surveyorJobStatus
    }
  }
`;

export const GET_SURVEYOR = gql`
  query GetSurveyor($id: ID!) {
    getSurveyor(id: $id) {
      id
      name
      email
      phoneNumber
      currentLat
      currentLng
      rating_avg
      app_version
      capacityPerDay
      activeJobsCount
      skills
      createdAt
      updatedAt
      city
      province
      country
      internal
      status
      surveyorJobStatus
    }
  }
`;

export const GET_SURVEYORS_BY_STATUS = gql`
  query GetSurveyorsByStatus($status: SurveyorStatus!) {
    getSurveyorsByStatus(status: $status) {
      id
      name
      email
      phoneNumber
      currentLat
      currentLng
      rating_avg
      status
      surveyorJobStatus
      city
      province
      country
    }
  }
`;

export const GET_SURVEYORS_BY_JOB_STATUS = gql`
  query GetSurveyorsByJobStatus($jobStatus: SurveyorJobStatus!) {
    getSurveyorsByJobStatus(jobStatus: $jobStatus) {
      id
      name
      email
      phoneNumber
      currentLat
      currentLng
      rating_avg
      status
      surveyorJobStatus
      city
      province
      country
    }
  }
`;

/* =========================
   Surveyor Mutations
   ========================= */
export const UPDATE_SURVEYOR = gql`
  mutation UpdateSurveyor($id: ID!, $input: UpdateSurveyorInput!) {
    updateSurveyor(id: $id, input: $input) {
      id
      name
      email
      phoneNumber
      currentLat
      currentLng
      rating_avg
      status
      surveyorJobStatus
      city
      province
      country
      updatedAt
    }
  }
`;
