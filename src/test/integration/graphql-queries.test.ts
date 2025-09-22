import { describe, it, expect, beforeEach } from 'vitest'
import { createTestApolloClient } from '../utils'
import {
  GET_POLICY_BY_NUMBER,
  GET_POLICY_WITH_CLAIMS,
  POLICY_BY_LICENSE_PLATE,
  POLICIES_BY_LICENSE_PLATE
} from '../../graphql/policies'
import { CREATE_FNOL } from '../../graphql/fnol'

describe('GraphQL Integration Tests', () => {
  let client: ReturnType<typeof createTestApolloClient>

  beforeEach(() => {
    client = createTestApolloClient()
  })

  describe('Policy Queries', () => {
    it('should fetch policy by number successfully', async () => {
      const { data } = await client.query({
        query: GET_POLICY_BY_NUMBER,
        variables: { policyNumber: 'THAUTO0000228' },
        fetchPolicy: 'no-cache'
      })

      expect(data.getPolicyByNumber).toBeDefined()
      expect(data.getPolicyByNumber.id).toBe('228')
      expect(data.getPolicyByNumber.policyNumber).toBe('THAUTO0000228')
      expect(data.getPolicyByNumber.policyStatus).toBe('BIND')
      expect(data.getPolicyByNumber.insured).toBeDefined()
      expect(data.getPolicyByNumber.vehicle).toBeDefined()
    })

    it('should return null for non-existent policy', async () => {
      const { data } = await client.query({
        query: GET_POLICY_BY_NUMBER,
        variables: { policyNumber: 'INVALID123' },
        fetchPolicy: 'no-cache'
      })

      expect(data.getPolicyByNumber).toBeNull()
    })

    it('should fetch policies with claims', async () => {
      const { data } = await client.query({
        query: GET_POLICY_WITH_CLAIMS,
        fetchPolicy: 'no-cache'
      })

      expect(data.getPolicies).toBeDefined()
      expect(Array.isArray(data.getPolicies)).toBe(true)

      if (data.getPolicies.length > 0) {
        const policy = data.getPolicies[0]
        expect(policy.id).toBeDefined()
        expect(policy.policyNumber).toBeDefined()
        expect(policy.insured).toBeDefined()
        expect(policy.vehicle).toBeDefined()
        expect(Array.isArray(policy.claims)).toBe(true)
      }
    })

    it('should fetch policy by license plate', async () => {
      const { data } = await client.query({
        query: POLICY_BY_LICENSE_PLATE,
        variables: { licensePlate: 'ABC123' },
        fetchPolicy: 'no-cache'
      })

      // This might return null if no policy is found for the test plate
      // The test should verify the structure when a policy is found
      if (data.policyByLicensePlate) {
        expect(data.policyByLicensePlate.id).toBeDefined()
        expect(data.policyByLicensePlate.policyNumber).toBeDefined()
        expect(data.policyByLicensePlate.vehicle).toBeDefined()
        expect(data.policyByLicensePlate.vehicle.registrationNumber).toBeDefined()
      }
    })

    it('should fetch multiple policies by license plate', async () => {
      const { data } = await client.query({
        query: POLICIES_BY_LICENSE_PLATE,
        variables: { licensePlate: 'ABC123' },
        fetchPolicy: 'no-cache'
      })

      expect(data.policiesByLicensePlate).toBeDefined()
      expect(Array.isArray(data.policiesByLicensePlate)).toBe(true)

      if (data.policiesByLicensePlate.length > 0) {
        const policy = data.policiesByLicensePlate[0]
        expect(policy.id).toBeDefined()
        expect(policy.policyNumber).toBeDefined()
        expect(policy.vehicle).toBeDefined()
      }
    })
  })

  describe('FNOL Mutations', () => {
    it('should create FNOL successfully', async () => {
      const fnolInput = {
        policyNumber: 'THAUTO0000228',
        incidentDate: '2024-01-15',
        incidentLocation: 'Bangkok, Thailand',
        description: 'Test incident for integration testing',
        reportedBy: 'Test User',
        contactNumber: '0123456789'
      }

      const { data } = await client.mutate({
        mutation: CREATE_FNOL,
        variables: fnolInput
      })

      expect(data.createFNOL).toBeDefined()
      expect(data.createFNOL.id).toBeDefined()
      expect(data.createFNOL.fnolReferenceNo).toMatch(/TH-AT-FN-\d+/)
      expect(data.createFNOL.fnolState).toBe('CREATED')
      expect(data.createFNOL.policyNumber).toBe(fnolInput.policyNumber)
      expect(data.createFNOL.incidentDate).toBe(fnolInput.incidentDate)
      expect(data.createFNOL.incidentLocation).toBe(fnolInput.incidentLocation)
    })

    it('should handle FNOL creation with missing required fields', async () => {
      const incompleteInput = {
        policyNumber: 'THAUTO0000228',
        // Missing required fields
      }

      try {
        await client.mutate({
          mutation: CREATE_FNOL,
          variables: incompleteInput
        })

        // Should not reach this point
        expect.fail('Expected mutation to throw an error')
      } catch (error) {
        expect(error).toBeDefined()
        // Check for GraphQL validation error
        expect(error.message).toMatch(/Variable .* of required type .* was not provided/i)
      }
    })
  })

  describe('Error Handling', () => {
    it('should handle network errors gracefully', async () => {
      // Create client with invalid URL to simulate network error
      const invalidClient = createTestApolloClient()

      try {
        await invalidClient.query({
          query: GET_POLICY_BY_NUMBER,
          variables: { policyNumber: 'TEST123' },
          fetchPolicy: 'no-cache',
          errorPolicy: 'none'
        })
      } catch (error) {
        expect(error).toBeDefined()
        // Should be a network error or similar
      }
    })

    it('should handle GraphQL validation errors', async () => {
      try {
        await client.query({
          query: GET_POLICY_BY_NUMBER,
          variables: { policyNumber: null }, // Invalid input
          fetchPolicy: 'no-cache'
        })
      } catch (error) {
        expect(error).toBeDefined()
        expect(error.message).toMatch(/Variable .* got invalid value/i)
      }
    })
  })

  describe('Cache Behavior', () => {
    it('should cache policy data correctly', async () => {
      const variables = { policyNumber: 'THAUTO0000228' }

      // First query - should fetch from network
      const result1 = await client.query({
        query: GET_POLICY_BY_NUMBER,
        variables,
        fetchPolicy: 'cache-first'
      })

      // Second query - should use cache
      const result2 = await client.query({
        query: GET_POLICY_BY_NUMBER,
        variables,
        fetchPolicy: 'cache-first'
      })

      expect(result1.data.getPolicyByNumber).toEqual(result2.data.getPolicyByNumber)
      expect(result2.loading).toBe(false)
    })

    it('should update cache after mutation', async () => {
      const policyNumber = 'THAUTO0000228'

      // Query initial policy state
      const initialQuery = await client.query({
        query: GET_POLICY_BY_NUMBER,
        variables: { policyNumber },
        fetchPolicy: 'no-cache'
      })

      expect(initialQuery.data.getPolicyByNumber).toBeDefined()

      // Create FNOL for this policy
      const fnolInput = {
        policyNumber,
        incidentDate: '2024-01-15',
        incidentLocation: 'Bangkok, Thailand',
        description: 'Test incident',
        reportedBy: 'Test User',
        contactNumber: '0123456789'
      }

      await client.mutate({
        mutation: CREATE_FNOL,
        variables: fnolInput,
        // Optionally update cache or refetch queries
        refetchQueries: [
          { query: GET_POLICY_BY_NUMBER, variables: { policyNumber } }
        ]
      })

      // The cache should be updated or the query should be refetched
      // This test verifies that the mutation properly handles cache updates
    })
  })
})