// src/graphql/addresses.js
import { gql } from "@apollo/client";

export const CREATE_ADDRESS = gql`
  mutation CreateAddress($input: CreateAddressInput!) {
    createAddress(input: $input) {
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
`;