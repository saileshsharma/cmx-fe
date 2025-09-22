import { setupServer } from 'msw/node'
import { graphql, HttpResponse } from 'msw'

// Mock data for GraphQL responses
const mockPolicy = {
  id: '228',
  policyNumber: 'THAUTO0000228',
  policyType: 'AUTO_COMMERCIAL',
  policyStatus: 'BIND',
  startDate: '2024-12-30',
  endDate: '2027-09-03',
  premium: 15000.0,
  sumInsured: 500000.0,
  insured: {
    firstName: 'Jinda',
    lastName: 'Phanich',
    email: 'jinda.phanich228@example.co.th',
    phoneNumber: '0685208529',
    addressLine1: '410 Moo 31',
    city: 'Surat Thani',
    province: 'Surat Thani',
    country: 'Thailand',
  },
  vehicle: {
    registrationNumber: 'QMKQ630833',
    vin: 'VIN0000000228',
    make: 'Hyundai',
    model: 'H-1',
    year: 2008,
    usageType: 'Personal',
    engineNo: 'ENG0000228',
    fuelType: 'Diesel',
    bodyType: 'Pickup',
    color: 'Black',
  },
  claims: [],
}

const mockClaims = [
  {
    id: '1',
    claimNumber: 'TH-AT-CL-000001',
    claimStatus: 'OPEN',
    claimSeverity: 'MINOR',
    claimAmount: 25000.0,
    incidentDate: '2024-01-15',
    claimDate: '2024-01-16',
    location: 'Bangkok',
    createdAt: '2024-01-16T10:00:00Z',
    fnol: {
      fnolReferenceNo: 'TH-AT-FN-000001',
      fnolState: 'COMPLETED',
    },
  },
]

const mockPolicies = Array.from({ length: 10 }, (_, i) => ({
  id: (i + 1).toString(),
  policyNumber: `THAUTO000${String(i + 1).padStart(4, '0')}`,
  policyType: 'AUTO_COMMERCIAL',
  policyStatus: 'BIND',
  insured: {
    firstName: `User${i + 1}`,
    lastName: 'Test',
    email: `user${i + 1}@example.com`,
  },
  vehicle: {
    make: 'Toyota',
    model: 'Camry',
    year: 2020 + i,
    registrationNumber: `ABC${String(i + 1).padStart(3, '0')}`,
  },
  claims: [],
}))

// Define GraphQL request handlers
export const handlers = [
  // Get policy by number
  graphql.query('GetPolicyByNumber', ({ variables }) => {
    const { policyNumber } = variables as { policyNumber: string }

    if (policyNumber === 'THAUTO0000228') {
      return HttpResponse.json({
        data: {
          getPolicyByNumber: mockPolicy,
        },
      })
    }

    // Return null for non-existent policies
    return HttpResponse.json({
      data: {
        getPolicyByNumber: null,
      },
    })
  }),

  // Get policies with claims
  graphql.query('GetPolicyWithClaims', () => {
    return HttpResponse.json({
      data: {
        getPolicies: mockPolicies.map(policy => ({
          ...policy,
          claims: policy.id === '1' ? mockClaims : [],
        })),
      },
    })
  }),

  // Get claims by policy number
  graphql.query('GetClaimsByPolicyNumber', ({ variables }) => {
    const { policyNumber } = variables as { policyNumber: string }

    if (policyNumber === 'THAUTO0000001') {
      return HttpResponse.json({
        data: {
          getClaimsByPolicyNumber: mockClaims,
        },
      })
    }

    return HttpResponse.json({
      data: {
        getClaimsByPolicyNumber: [],
      },
    })
  }),

  // Create FNOL
  graphql.mutation('CreateFNOL', ({ variables }) => {
    const fnolData = variables as any

    return HttpResponse.json({
      data: {
        createFNOL: {
          id: '1',
          fnolReferenceNo: 'TH-AT-FN-000001',
          fnolState: 'CREATED',
          policyNumber: fnolData.policyNumber,
          incidentDate: fnolData.incidentDate,
          incidentLocation: fnolData.incidentLocation,
          description: fnolData.description,
          createdAt: new Date().toISOString(),
        },
      },
    })
  }),

  // Health check
  graphql.query('HealthCheck', () => {
    return HttpResponse.json({
      data: {
        health: 'OK',
      },
    })
  }),
]

// Setup the server
export const server = setupServer(...handlers)