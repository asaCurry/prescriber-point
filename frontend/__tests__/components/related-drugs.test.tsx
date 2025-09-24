import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { RelatedDrugs } from '@/components/drugs/related-drugs'
import { RelatedDrug } from '@/lib/api'

// Mock Next.js Link component
jest.mock('next/link', () => {
  return ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href} data-testid="drug-link">
      {children}
    </a>
  )
})

const mockRelatedDrugs: RelatedDrug[] = [
  {
    id: 1,
    name: 'Ibuprofen',
    brandName: 'Advil',
    genericName: 'ibuprofen',
    manufacturer: 'Pfizer',
    ndc: '54321-987',
    indication: 'Pain relief',
    description: 'Similar pain relief medication',
    relationshipType: 'similar_indication',
    confidenceScore: 0.85,
    createdAt: '2023-01-01T00:00:00Z',
    updatedAt: '2023-01-01T00:00:00Z',
  },
  {
    id: 2,
    name: 'Aspirin',
    brandName: 'Bayer',
    genericName: 'aspirin',
    manufacturer: 'Bayer',
    ndc: '12345-678',
    indication: 'Pain relief and anti-inflammatory',
    description: 'Another pain relief option',
    relationshipType: 'same_class',
    confidenceScore: 0.75,
    createdAt: '2023-01-02T00:00:00Z',
    updatedAt: '2023-01-02T00:00:00Z',
  },
]

const mockRelatedDrugsWithoutNDC: RelatedDrug[] = [
  {
    id: 3,
    name: 'Acetaminophen',
    brandName: 'Tylenol',
    genericName: 'acetaminophen',
    manufacturer: 'Johnson & Johnson',
    indication: 'Pain relief',
    description: 'Pain relief medication',
    relationshipType: 'alternative',
    confidenceScore: 0.9,
    createdAt: '2023-01-03T00:00:00Z',
    updatedAt: '2023-01-03T00:00:00Z',
  },
]

describe('RelatedDrugs', () => {
  it('should render empty state when no related drugs', () => {
    render(<RelatedDrugs relatedDrugs={[]} />)

    expect(screen.getByText('Related Drugs')).toBeInTheDocument()
    expect(screen.getByText('No related medications found')).toBeInTheDocument()
    expect(screen.getByText(/Related drugs will appear here when available/)).toBeInTheDocument()
  })

  it('should render related drugs with proper information', () => {
    render(<RelatedDrugs relatedDrugs={mockRelatedDrugs} />)

    expect(screen.getByText('Related Drugs')).toBeInTheDocument()
    expect(screen.getByText('2 related medications found')).toBeInTheDocument()

    // Check first drug
    expect(screen.getByText('Advil')).toBeInTheDocument()
    expect(screen.getByText('Generic: ibuprofen')).toBeInTheDocument()
    expect(screen.getByText('Manufacturer: Pfizer')).toBeInTheDocument()
    expect(screen.getByText('NDC: 54321-987')).toBeInTheDocument()
    expect(screen.getByText('Indication: Pain relief')).toBeInTheDocument()

    // Check second drug
    expect(screen.getByText('Bayer')).toBeInTheDocument()
    expect(screen.getByText('Generic: aspirin')).toBeInTheDocument()
  })

  it('should render relationship badges correctly', () => {
    render(<RelatedDrugs relatedDrugs={mockRelatedDrugs} />)

    expect(screen.getByText('Similar Use')).toBeInTheDocument()
    expect(screen.getByText('Same Class')).toBeInTheDocument()
  })

  it('should render confidence scores', () => {
    render(<RelatedDrugs relatedDrugs={mockRelatedDrugs} />)

    expect(screen.getByText('85% confidence')).toBeInTheDocument()
    expect(screen.getByText('75% confidence')).toBeInTheDocument()
  })

  it('should make cards clickable with proper URLs', () => {
    render(<RelatedDrugs relatedDrugs={mockRelatedDrugs} />)

    const links = screen.getAllByTestId('drug-link')
    expect(links).toHaveLength(2)

    // Check URL construction for drug with NDC
    expect(links[0]).toHaveAttribute('href', '/drugs/advil-54321-987')
    expect(links[1]).toHaveAttribute('href', '/drugs/bayer-12345-678')
  })

  it('should handle drugs without NDC gracefully', () => {
    render(<RelatedDrugs relatedDrugs={mockRelatedDrugsWithoutNDC} />)

    const links = screen.getAllByTestId('drug-link')
    expect(links).toHaveLength(1)

    // Should fallback to drug name when no NDC
    expect(links[0]).toHaveAttribute('href', '/drugs/tylenol')
  })

  it('should show View Details link for all drugs', () => {
    render(<RelatedDrugs relatedDrugs={mockRelatedDrugs} />)

    const viewDetailsLinks = screen.getAllByText('View Details →')
    expect(viewDetailsLinks).toHaveLength(2)
  })

  it('should format dates correctly', () => {
    render(<RelatedDrugs relatedDrugs={mockRelatedDrugs} />)

    expect(screen.getByText('Added 1/1/2023')).toBeInTheDocument()
    expect(screen.getByText('Added 1/2/2023')).toBeInTheDocument()
  })

  it('should handle drugs with only name field', () => {
    const minimalDrug: RelatedDrug[] = [
      {
        id: 4,
        name: 'Minimal Drug',
        createdAt: '2023-01-04T00:00:00Z',
        updatedAt: '2023-01-04T00:00:00Z',
      },
    ]

    render(<RelatedDrugs relatedDrugs={minimalDrug} />)

    expect(screen.getByText('Minimal Drug')).toBeInTheDocument()

    const links = screen.getAllByTestId('drug-link')
    expect(links[0]).toHaveAttribute('href', '/drugs/4') // Should fallback to ID
  })

  it('should apply custom className', () => {
    const { container } = render(
      <RelatedDrugs relatedDrugs={mockRelatedDrugs} className="custom-class" />
    )

    expect(container.firstChild).toHaveClass('custom-class')
  })

  it('should handle drugs with missing optional fields', () => {
    const incompleteDrug: RelatedDrug[] = [
      {
        id: 5,
        name: 'Incomplete Drug',
        brandName: 'Incomplete',
        createdAt: '2023-01-05T00:00:00Z',
        updatedAt: '2023-01-05T00:00:00Z',
      },
    ]

    render(<RelatedDrugs relatedDrugs={incompleteDrug} />)

    expect(screen.getByText('Incomplete Drug')).toBeInTheDocument()
    expect(screen.getByText('Incomplete')).toBeInTheDocument()

    // Should not show fields that don't exist
    expect(screen.queryByText(/Generic:/)).not.toBeInTheDocument()
    expect(screen.queryByText(/Manufacturer:/)).not.toBeInTheDocument()
    expect(screen.queryByText(/NDC:/)).not.toBeInTheDocument()
  })
})
