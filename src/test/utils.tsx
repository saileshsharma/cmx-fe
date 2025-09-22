import React, { ReactElement } from 'react'
import { render, RenderOptions } from '@testing-library/react'
import { ApolloClient, InMemoryCache, ApolloProvider } from '@apollo/client'
import { BrowserRouter } from 'react-router-dom'
import { ToastContainer } from 'react-toastify'
import { vi } from 'vitest'

// Create a test Apollo client
export const createTestApolloClient = () => {
  return new ApolloClient({
    uri: 'http://localhost:4000/graphql',
    cache: new InMemoryCache(),
    defaultOptions: {
      watchQuery: {
        errorPolicy: 'ignore',
      },
      query: {
        errorPolicy: 'all',
      },
    },
  })
}

// All the providers wrapper
interface AllTheProvidersProps {
  children: React.ReactNode
  client?: ApolloClient<any>
}

const AllTheProviders = ({ children, client }: AllTheProvidersProps) => {
  const testClient = client || createTestApolloClient()

  return (
    <ApolloProvider client={testClient}>
      <BrowserRouter>
        {children}
        <ToastContainer />
      </BrowserRouter>
    </ApolloProvider>
  )
}

// Custom render function
interface CustomRenderOptions extends Omit<RenderOptions, 'wrapper'> {
  client?: ApolloClient<any>
}

const customRender = (
  ui: ReactElement,
  options?: CustomRenderOptions
): ReturnType<typeof render> => {
  const { client, ...renderOptions } = options || {}

  return render(ui, {
    wrapper: ({ children }) => (
      <AllTheProviders client={client}>{children}</AllTheProviders>
    ),
    ...renderOptions,
  })
}

// Re-export everything
export * from '@testing-library/react'
export { customRender as render }

// Common test data factories
export const createMockPolicy = (overrides = {}) => ({
  id: '1',
  policyNumber: 'THAUTO0000001',
  policyType: 'AUTO_COMMERCIAL',
  policyStatus: 'BIND',
  startDate: '2024-01-01',
  endDate: '2024-12-31',
  premium: 15000.0,
  sumInsured: 500000.0,
  insured: {
    firstName: 'John',
    lastName: 'Doe',
    email: 'john.doe@example.com',
    phoneNumber: '0123456789',
    addressLine1: '123 Test Street',
    city: 'Bangkok',
    province: 'Bangkok',
    country: 'Thailand',
  },
  vehicle: {
    registrationNumber: 'ABC123',
    vin: 'VIN123456789',
    make: 'Toyota',
    model: 'Camry',
    year: 2020,
    usageType: 'Personal',
    engineNo: 'ENG123',
    fuelType: 'Gasoline',
    bodyType: 'Sedan',
    color: 'White',
  },
  claims: [],
  ...overrides,
})

export const createMockClaim = (overrides = {}) => ({
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
  ...overrides,
})

export const createMockFNOL = (overrides = {}) => ({
  id: '1',
  fnolReferenceNo: 'TH-AT-FN-000001',
  fnolState: 'CREATED',
  policyNumber: 'THAUTO0000001',
  incidentDate: '2024-01-15',
  incidentLocation: 'Bangkok',
  description: 'Test incident description',
  createdAt: '2024-01-15T10:00:00Z',
  ...overrides,
})

// Common test helpers
export const waitForGraphQL = () =>
  new Promise(resolve => setTimeout(resolve, 0))

// Mock intersection observer for components that need it
export const mockIntersectionObserver = () => {
  const mockIntersectionObserver = vi.fn()
  mockIntersectionObserver.mockReturnValue({
    observe: () => null,
    unobserve: () => null,
    disconnect: () => null,
  })
  window.IntersectionObserver = mockIntersectionObserver
  window.HTMLElement.prototype.scrollIntoView = () => {}
}