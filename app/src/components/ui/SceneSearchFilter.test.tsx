import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi } from 'vitest'
import { SceneSearchFilter } from './SceneSearchFilter'

function renderFilter(overrides: Partial<Parameters<typeof SceneSearchFilter>[0]> = {}) {
  const defaultProps = {
    searchQuery: '',
    onSearchChange: vi.fn(),
    typeFilter: null,
    onTypeFilterChange: vi.fn(),
    showHidden: false,
    onShowHiddenChange: vi.fn(),
    showLocked: false,
    onShowLockedChange: vi.fn(),
    objectCount: 10,
    filteredCount: 7,
    ...overrides,
  }
  const result = render(<SceneSearchFilter {...defaultProps} />)
  return { ...result, props: defaultProps }
}

describe('SceneSearchFilter', () => {
  it('renders search input with placeholder "Search objects..."', () => {
    renderFilter()
    const input = screen.getByPlaceholderText('Search objects...')
    expect(input).toBeInTheDocument()
  })

  it('renders search input with aria-label', () => {
    renderFilter()
    const input = screen.getByLabelText('Search objects')
    expect(input).toBeInTheDocument()
  })

  it('renders type filter dropdown with "All Types" default', () => {
    renderFilter()
    const select = screen.getByLabelText('Filter by type')
    expect(select).toBeInTheDocument()
    // The default selected option should be "All Types"
    expect(select).toHaveValue('')
    expect(screen.getByText('All Types')).toBeInTheDocument()
  })

  it('renders type filter with all object types', () => {
    renderFilter()
    expect(screen.getByText('Box')).toBeInTheDocument()
    expect(screen.getByText('Sphere')).toBeInTheDocument()
    expect(screen.getByText('Cylinder')).toBeInTheDocument()
    expect(screen.getByText('Cone')).toBeInTheDocument()
    expect(screen.getByText('Plane')).toBeInTheDocument()
    expect(screen.getByText('Torus')).toBeInTheDocument()
    expect(screen.getByText('Model')).toBeInTheDocument()
  })

  it('renders show hidden button', () => {
    renderFilter()
    const button = screen.getByLabelText('Show hidden objects')
    expect(button).toBeInTheDocument()
  })

  it('renders show locked button', () => {
    renderFilter()
    const button = screen.getByLabelText('Show locked objects')
    expect(button).toBeInTheDocument()
  })

  it('shows object count "X of Y objects"', () => {
    renderFilter({ objectCount: 15, filteredCount: 8 })
    expect(screen.getByText('8 of 15 objects')).toBeInTheDocument()
  })

  it('shows 0 of 0 objects when empty', () => {
    renderFilter({ objectCount: 0, filteredCount: 0 })
    expect(screen.getByText('0 of 0 objects')).toBeInTheDocument()
  })

  it('typing in search calls onSearchChange', async () => {
    const user = userEvent.setup()
    const { props } = renderFilter()

    const input = screen.getByPlaceholderText('Search objects...')
    await user.type(input, 'cube')
    // Each character typed calls onSearchChange (controlled input, value stays '')
    expect(props.onSearchChange).toHaveBeenCalledTimes(4)
    expect(props.onSearchChange).toHaveBeenNthCalledWith(1, 'c')
    expect(props.onSearchChange).toHaveBeenNthCalledWith(2, 'u')
    expect(props.onSearchChange).toHaveBeenNthCalledWith(3, 'b')
    expect(props.onSearchChange).toHaveBeenNthCalledWith(4, 'e')
  })

  it('selecting type calls onTypeFilterChange', async () => {
    const user = userEvent.setup()
    const { props } = renderFilter()

    const select = screen.getByLabelText('Filter by type')
    await user.selectOptions(select, 'sphere')
    expect(props.onTypeFilterChange).toHaveBeenCalledWith('sphere')
  })

  it('selecting "All Types" calls onTypeFilterChange with null', async () => {
    const user = userEvent.setup()
    const { props } = renderFilter({ typeFilter: 'box' })

    const select = screen.getByLabelText('Filter by type')
    await user.selectOptions(select, '')
    expect(props.onTypeFilterChange).toHaveBeenCalledWith(null)
  })

  it('clear search button appears when query exists', () => {
    renderFilter({ searchQuery: 'test' })
    const clearButton = screen.getByLabelText('Clear search')
    expect(clearButton).toBeInTheDocument()
  })

  it('clear search button does not appear when query is empty', () => {
    renderFilter({ searchQuery: '' })
    expect(screen.queryByLabelText('Clear search')).not.toBeInTheDocument()
  })

  it('clicking clear search calls onSearchChange with empty string', async () => {
    const user = userEvent.setup()
    const { props } = renderFilter({ searchQuery: 'test' })

    await user.click(screen.getByLabelText('Clear search'))
    expect(props.onSearchChange).toHaveBeenCalledWith('')
  })

  it('hidden toggle has aria-pressed=false when showHidden is false', () => {
    renderFilter({ showHidden: false })
    const button = screen.getByLabelText('Show hidden objects')
    expect(button).toHaveAttribute('aria-pressed', 'false')
  })

  it('hidden toggle has aria-pressed=true when showHidden is true', () => {
    renderFilter({ showHidden: true })
    const button = screen.getByLabelText('Hide hidden objects')
    expect(button).toHaveAttribute('aria-pressed', 'true')
  })

  it('clicking hidden toggle calls onShowHiddenChange', async () => {
    const user = userEvent.setup()
    const { props } = renderFilter({ showHidden: false })

    await user.click(screen.getByLabelText('Show hidden objects'))
    expect(props.onShowHiddenChange).toHaveBeenCalledWith(true)
  })

  it('locked toggle has aria-pressed=false when showLocked is false', () => {
    renderFilter({ showLocked: false })
    const button = screen.getByLabelText('Show locked objects')
    expect(button).toHaveAttribute('aria-pressed', 'false')
  })

  it('locked toggle has aria-pressed=true when showLocked is true', () => {
    renderFilter({ showLocked: true })
    const button = screen.getByLabelText('Hide locked objects')
    expect(button).toHaveAttribute('aria-pressed', 'true')
  })

  it('clicking locked toggle calls onShowLockedChange', async () => {
    const user = userEvent.setup()
    const { props } = renderFilter({ showLocked: false })

    await user.click(screen.getByLabelText('Show locked objects'))
    expect(props.onShowLockedChange).toHaveBeenCalledWith(true)
  })
})
