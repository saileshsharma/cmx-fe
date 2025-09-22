import { describe, it, expect } from 'vitest'
import { render, screen, fireEvent } from '@/test/utils'
import Modal from './Modal'

describe('Modal Component', () => {
  it('renders the open modal button', () => {
    render(<Modal />)

    const openButton = screen.getByRole('button', { name: /open modal/i })
    expect(openButton).toBeInTheDocument()
    expect(openButton).toHaveClass('bg-green-600')
  })

  it('does not show modal initially', () => {
    render(<Modal />)

    const modalTitle = screen.queryByText('Modal Title')
    expect(modalTitle).not.toBeInTheDocument()
  })

  it('shows modal when open button is clicked', async () => {
    render(<Modal />)

    const openButton = screen.getByRole('button', { name: /open modal/i })
    fireEvent.click(openButton)

    expect(screen.getByText('Modal Title')).toBeInTheDocument()
    expect(screen.getByText('This is a modal window example.')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /close/i })).toBeInTheDocument()
  })

  it('hides modal when close button is clicked', async () => {
    render(<Modal />)

    // Open the modal
    const openButton = screen.getByRole('button', { name: /open modal/i })
    fireEvent.click(openButton)

    // Verify modal is open
    expect(screen.getByText('Modal Title')).toBeInTheDocument()

    // Close the modal
    const closeButton = screen.getByRole('button', { name: /close/i })
    fireEvent.click(closeButton)

    // Verify modal is closed
    expect(screen.queryByText('Modal Title')).not.toBeInTheDocument()
  })

  it('applies correct CSS classes for styling', () => {
    render(<Modal />)

    const openButton = screen.getByRole('button', { name: /open modal/i })
    fireEvent.click(openButton)

    // Check modal overlay
    const overlay = screen.getByText('Modal Title').closest('.fixed')
    expect(overlay).toHaveClass('inset-0', 'bg-black', 'bg-opacity-50', 'flex', 'items-center', 'justify-center')

    // Check modal content
    const modalContent = screen.getByText('Modal Title').closest('.bg-white')
    expect(modalContent).toHaveClass('bg-white', 'p-6', 'rounded-lg', 'shadow-lg', 'max-w-sm')

    // Check close button
    const closeButton = screen.getByRole('button', { name: /close/i })
    expect(closeButton).toHaveClass('mt-4', 'bg-red-600', 'text-white', 'px-4', 'py-2', 'rounded', 'hover:bg-red-700')
  })

  it('has accessible modal structure', () => {
    render(<Modal />)

    const openButton = screen.getByRole('button', { name: /open modal/i })
    fireEvent.click(openButton)

    // Check for proper heading structure
    const heading = screen.getByRole('heading', { level: 2 })
    expect(heading).toHaveTextContent('Modal Title')

    // Check for close button accessibility
    const closeButton = screen.getByRole('button', { name: /close/i })
    expect(closeButton).toBeInTheDocument()
  })
})