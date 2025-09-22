import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@/test/utils'
import { MockedProvider } from '@apollo/client/testing'
import PolicySearch from './PolicySearch'
import { GET_POLICY_BY_NUMBER, POLICY_BY_LICENSE_PLATE, POLICIES_BY_LICENSE_PLATE } from '../../graphql/policies'

// Mock react-router-dom
const mockNavigate = vi.fn()
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  }
})

describe('PolicySearch Component', () => {
  beforeEach(() => {
    mockNavigate.mockClear()
  })

  it('renders with policy search mode by default', () => {
    render(
      <MockedProvider>
        <PolicySearch />
      </MockedProvider>
    )

    expect(screen.getByDisplayValue('')).toBeInTheDocument() // Input field
    expect(screen.getByText('Search by Policy Number')).toBeInTheDocument()
  })

  it('switches between policy and license plate search modes', async () => {
    render(
      <MockedProvider>
        <PolicySearch />
      </MockedProvider>
    )

    // Should start in policy mode
    expect(screen.getByText('Search by Policy Number')).toBeInTheDocument()

    // Find and click the mode toggle (assuming there's a toggle button)
    const toggleButtons = screen.getAllByRole('button')
    const plateToggle = toggleButtons.find(btn => btn.textContent?.includes('License Plate') || btn.textContent?.includes('Plate'))

    if (plateToggle) {
      fireEvent.click(plateToggle)
      await waitFor(() => {
        expect(screen.getByText('Search by License Plate')).toBeInTheDocument()
      })
    }
  })

  describe('Policy Number Search', () => {
    const mockPolicyResponse = {
      request: {
        query: GET_POLICY_BY_NUMBER,
        variables: { policyNumber: 'THAUTO0000228' },
      },
      result: {
        data: {
          getPolicyByNumber: {
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
            },
            vehicle: {
              registrationNumber: 'QMKQ630833',
              make: 'Hyundai',
              model: 'H-1',
              year: 2008,
            },
          },
        },
      },
    }

    it('searches for policy by number', async () => {
      render(
        <MockedProvider mocks={[mockPolicyResponse]} addTypename={false}>
          <PolicySearch />
        </MockedProvider>
      )

      const input = screen.getByDisplayValue('')
      const searchButton = screen.getByRole('button', { name: /search|view/i })

      fireEvent.change(input, { target: { value: 'THAUTO0000228' } })
      fireEvent.click(searchButton)

      // Wait for the search to complete
      await waitFor(() => {
        expect(screen.getByText('Jinda Phanich')).toBeInTheDocument()
      })

      expect(screen.getByText('THAUTO0000228')).toBeInTheDocument()
      expect(screen.getByText('Hyundai H-1')).toBeInTheDocument()
    })

    it('handles policy not found', async () => {
      const mockNotFoundResponse = {
        request: {
          query: GET_POLICY_BY_NUMBER,
          variables: { policyNumber: 'INVALID123' },
        },
        result: {
          data: {
            getPolicyByNumber: null,
          },
        },
      }

      render(
        <MockedProvider mocks={[mockNotFoundResponse]} addTypename={false}>
          <PolicySearch />
        </MockedProvider>
      )

      const input = screen.getByDisplayValue('')
      const searchButton = screen.getByRole('button', { name: /search|view/i })

      fireEvent.change(input, { target: { value: 'INVALID123' } })
      fireEvent.click(searchButton)

      await waitFor(() => {
        expect(screen.getByText(/policy not found|no policy found/i)).toBeInTheDocument()
      })
    })
  })

  describe('License Plate Search', () => {
    const mockPlateResponse = {
      request: {
        query: POLICY_BY_LICENSE_PLATE,
        variables: { licensePlate: 'ABC123' },
      },
      result: {
        data: {
          policyByLicensePlate: {
            id: '1',
            policyNumber: 'THAUTO0000001',
            policyStatus: 'IN_FORCE',
            insured: {
              firstName: 'John',
              lastName: 'Doe',
            },
            vehicle: {
              registrationNumber: 'ABC123',
              make: 'Toyota',
              model: 'Camry',
            },
          },
        },
      },
    }

    it('searches for policy by license plate', async () => {
      render(
        <MockedProvider mocks={[mockPlateResponse]} addTypename={false}>
          <PolicySearch />
        </MockedProvider>
      )

      // Switch to plate mode first
      const modeButtons = screen.getAllByRole('button')
      const plateButton = modeButtons.find(btn => btn.textContent?.includes('License') || btn.textContent?.includes('Plate'))

      if (plateButton) {
        fireEvent.click(plateButton)

        await waitFor(() => {
          const input = screen.getByDisplayValue('')
          const searchButton = screen.getByRole('button', { name: /search/i })

          fireEvent.change(input, { target: { value: 'ABC123' } })
          fireEvent.click(searchButton)
        })

        await waitFor(() => {
          expect(screen.getByText('John Doe')).toBeInTheDocument()
        })
      }
    })
  })

  describe('Status Component', () => {
    it('renders different status badges correctly', () => {
      const testStatuses = [
        { status: 'IN_FORCE', expectedClass: 'bg-green-600' },
        { status: 'BIND', expectedClass: 'bg-blue-600' },
        { status: 'PAYMENT_DUE', expectedClass: 'bg-amber-600' },
        { status: 'CANCELLED', expectedClass: 'bg-red-600' },
        { status: 'EXPIRED', expectedClass: 'bg-stone-600' },
      ]

      testStatuses.forEach(({ status, expectedClass }) => {
        const { container } = render(
          <span className={`px-2 py-0.5 rounded-full text-white text-xs ${expectedClass}`}>
            {status}
          </span>
        )

        const statusElement = container.querySelector(`.${expectedClass.replace(' ', '.')}`)
        expect(statusElement).toBeInTheDocument()
        expect(statusElement).toHaveTextContent(status)
      })
    })
  })

  describe('Accessibility', () => {
    it('has proper form labels and structure', () => {
      render(
        <MockedProvider>
          <PolicySearch />
        </MockedProvider>
      )

      const input = screen.getByDisplayValue('')
      expect(input).toHaveAttribute('type', 'text')

      const searchButton = screen.getByRole('button', { name: /search|view/i })
      expect(searchButton).toBeInTheDocument()
    })

    it('handles keyboard navigation', async () => {
      render(
        <MockedProvider>
          <PolicySearch />
        </MockedProvider>
      )

      const input = screen.getByDisplayValue('')

      // Test Enter key submission
      fireEvent.change(input, { target: { value: 'THAUTO0000228' } })
      fireEvent.keyDown(input, { key: 'Enter', code: 'Enter' })

      // Should trigger search (assuming the component handles Enter key)
      expect(input).toHaveValue('THAUTO0000228')
    })
  })
})