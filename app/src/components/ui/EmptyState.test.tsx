import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi } from 'vitest'
import { EmptyState } from './EmptyState'

describe('EmptyState', () => {
  it('renders icon, title, and description', () => {
    render(
      <EmptyState
        icon="📭"
        title="No Items"
        description="There are no items to display."
      />
    )

    expect(screen.getByText('📭')).toBeInTheDocument()
    expect(screen.getByText('No Items')).toBeInTheDocument()
    expect(screen.getByText('There are no items to display.')).toBeInTheDocument()
  })

  it('renders action button when action prop is provided', () => {
    render(
      <EmptyState
        icon="📭"
        title="No Items"
        description="Nothing here yet."
        action={{ label: 'Add Item', onClick: vi.fn() }}
      />
    )

    expect(screen.getByRole('button', { name: 'Add Item' })).toBeInTheDocument()
  })

  it('does not render action button when action prop is omitted', () => {
    render(
      <EmptyState
        icon="📭"
        title="No Items"
        description="Nothing here yet."
      />
    )

    expect(screen.queryByRole('button')).not.toBeInTheDocument()
  })

  it('clicking action button calls onClick', async () => {
    const user = userEvent.setup()
    const onClick = vi.fn()
    render(
      <EmptyState
        icon="📭"
        title="No Items"
        description="Nothing here yet."
        action={{ label: 'Add Item', onClick }}
      />
    )

    await user.click(screen.getByRole('button', { name: 'Add Item' }))

    expect(onClick).toHaveBeenCalledTimes(1)
  })

  it('renders different content based on props', () => {
    render(
      <EmptyState
        icon="🔍"
        title="No Results"
        description="Try adjusting your search filters."
      />
    )

    expect(screen.getByText('🔍')).toBeInTheDocument()
    expect(screen.getByText('No Results')).toBeInTheDocument()
    expect(screen.getByText('Try adjusting your search filters.')).toBeInTheDocument()
  })
})
