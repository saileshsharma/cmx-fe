import { gql } from "@apollo/client";

/* =========================
   Address Queries & Mutations
   ========================= */
export const CREATE_ADDRESS = gql`
  mutation CreateAddress(
    $addressLine1: String!
    $city: String!
    $province: String!
    $postalCode: String!
    $country: String!
    $latitude: Float!
    $longitude: Float!
    $locationType: String
    $addressLine2: String
  ) {
    createAddress(
      addressLine1: $addressLine1
      addressLine2: $addressLine2
      city: $city
      province: $province
      postalCode: $postalCode
      country: $country
      latitude: $latitude
      longitude: $longitude
      locationType: $locationType
    ) {
      id
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
  }
`;
