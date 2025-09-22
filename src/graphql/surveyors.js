import { gql } from "@apollo/client";

export const GET_ALL_SURVEYORS = gql`
  query GetAllSurveyors {
    getAllSurveyors {
      id
      name
      email
      phoneNumber
      status            # AVAILABLE | UNAVAILABLE | INACTIVE
      surveyorJobStatus # Accepted | Working | Pending | Closed | On_The_Way
      currentLat
      currentLng
    }
  }
`;

export const GET_ALL_SURVEYORS_DETAILED = gql`
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
      status              # AVAILABLE | UNAVAILABLE | INACTIVE
      surveyorJobStatus   # Accepted | Working | Pending | Closed | On_The_Way
    }
  }
`;

export const GET_SURVEYORS_BY_JOB_STATUS = gql`
  query GetSurveyorsByJobStatus($jobStatus: SurveyorJobStatus) {
    getSurveyorsByJobStatus(jobStatus: $jobStatus) {
      id
      name
      email
      phoneNumber
      status
      surveyorJobStatus
      currentLat
      currentLng
    }
  }
`;

export const GET_SURVEYORS_BY_STATUS = gql`
  query GetSurveyorsByStatus($status: SurveyorStatus) {
    getSurveyorsByStatus(status: $status) {
      id
      name
      email
      phoneNumber
      status
      surveyorJobStatus
      currentLat
      currentLng
    }
  }
`;

export const GET_SURVEYOR_BY_ID = gql`
  query GetSurveyor($id: ID!) {
    getSurveyor(id: $id) {
      id
      name
      email
      phoneNumber
      status
      surveyorJobStatus
      currentLat
      currentLng
      city
      province
      country
      rating_avg
      capacityPerDay
      activeJobsCount
      skills
      createdAt
      updatedAt
      internal
      isActive
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
      isActive
      status
    }
  }
`;

export const UPDATE_SURVEYOR = gql`
  mutation UpdateSurveyor($id: ID!, $input: UpdateSurveyorInput!) {
    updateSurveyor(id: $id, input: $input) {
      id
      name
      email
      phoneNumber
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
      isActive
      status
    }
  }
`;

export const ASSIGN_SURVEYOR = gql`
  mutation AssignSurveyor($fnolId: ID!, $surveyorId: ID!) {
    assignSurveyor(fnolId: $fnolId, surveyorId: $surveyorId) {
      id
      status
      message
      fnolId
      surveyorId
      surveyorName
      assignedSurveyor {
        id
        name
        email
        phone
        status
        jobStatus
        city
        province
        country
      }
    }
  }
`;

export const AUTO_ASSIGN_SURVEYOR = gql`
  mutation AutoAssignSurveyor($fnolId: ID!, $take: Int) {
    autoAssignSurveyor(fnolId: $fnolId, take: $take) {
      id
      status
      message
      fnolId
      surveyorId
      surveyorName
      assignedSurveyor {
        id
        name
        email
        phone
        status
        jobStatus
        city
        province
        country
      }
    }
  }
`;