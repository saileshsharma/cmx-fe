// src/graphql/fnol.js
import { gql } from "@apollo/client";

export const GET_ALL_FNOL = gql`
  query GetAllFnol {
    getAllFnol {
      id
      fnolReferenceNo
      fnolState
      description
      accidentDate
      createdAt
      updatedAt
      // add other fields you need
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
