// src/graphql/subscriptions.js
import { gql } from "@apollo/client";

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
