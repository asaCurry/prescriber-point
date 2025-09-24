import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ErrorBoundary } from '@/components/error-boundary'
import Link from 'next/link'
import { RelatedDrug } from '@/lib/api'

interface RelatedDrugsProps {
  relatedDrugs?: RelatedDrug[]
  className?: string
}

export function RelatedDrugs({ relatedDrugs = [], className = '' }: RelatedDrugsProps) {
  const getRelationshipBadgeVariant = (relationshipType?: string) => {
    switch (relationshipType) {
      case 'same_class':
        return 'default'
      case 'similar_indication':
        return 'secondary'
      case 'alternative':
        return 'outline'
      case 'generic_equivalent':
        return 'destructive'
      default:
        return 'secondary'
    }
  }

  const getRelationshipLabel = (relationshipType?: string) => {
    switch (relationshipType) {
      case 'same_class':
        return 'Same Class'
      case 'similar_indication':
        return 'Similar Use'
      case 'alternative':
        return 'Alternative'
      case 'generic_equivalent':
        return 'Generic Equivalent'
      default:
        return 'Related'
    }
  }

  if (relatedDrugs.length === 0) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="text-lg">Related Drugs</CardTitle>
          <CardDescription>No related medications found</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-4">
            <p className="text-sm text-muted-foreground">
              Related drugs will appear here when available.
            </p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <ErrorBoundary>
      <Card className={className}>
        <CardHeader>
          <CardTitle className="text-lg">Related Drugs</CardTitle>
          <CardDescription>
            {relatedDrugs.length} related medication{relatedDrugs.length !== 1 ? 's' : ''} found
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {relatedDrugs.map((drug) => {
              // Construct the drug URL - try multiple approaches
              const getDrugUrl = () => {
                // If we have NDC, use the standard slug format
                if (drug.ndc) {
                  const drugName = (drug.brandName || drug.name || 'unknown')
                    .toLowerCase()
                    .replace(/\s+/g, '-')
                    .replace(/[^a-zA-Z0-9-]/g, '') // Remove special characters
                  const ndcFormatted = drug.ndc.replace(/[^0-9-]/g, '') // Only keep numbers and hyphens
                  return `/drugs/${drugName}-${ndcFormatted}`
                }

                // Fallback: try to construct from available data
                if (drug.brandName || drug.name) {
                  const drugName = (drug.brandName || drug.name)
                    .toLowerCase()
                    .replace(/\s+/g, '-')
                    .replace(/[^a-zA-Z0-9-]/g, '') // Remove special characters
                  return `/drugs/${drugName}`
                }

                // Last resort: use ID
                return `/drugs/${drug.id}`
              }

              const drugUrl = getDrugUrl()

              // Validate URL before rendering
              if (!drugUrl || drugUrl === '/drugs/') {
                console.warn('Invalid drug URL generated for:', drug)
                return null
              }

              return (
                <Link
                  key={drug.id}
                  href={drugUrl}
                  className="block border rounded-lg p-4 hover:bg-gray-50 hover:shadow-md transition-all duration-200 cursor-pointer"
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1">
                      <h4 className="font-semibold text-foreground mb-1">
                        {drug.brandName || drug.name}
                      </h4>
                      {drug.genericName && drug.genericName !== drug.brandName && (
                        <p className="text-sm text-muted-foreground mb-2">
                          Generic: {drug.genericName}
                        </p>
                      )}
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      {drug.relationshipType && (
                        <Badge variant={getRelationshipBadgeVariant(drug.relationshipType)}>
                          {getRelationshipLabel(drug.relationshipType)}
                        </Badge>
                      )}
                      {drug.confidenceScore && (
                        <Badge variant="outline" className="text-xs">
                          {(drug.confidenceScore * 100).toFixed(0)}% confidence
                        </Badge>
                      )}
                    </div>
                  </div>

                  <div className="space-y-2 text-sm">
                    {drug.manufacturer && (
                      <div>
                        <span className="font-medium text-muted-foreground">Manufacturer:</span>
                        <span className="ml-2">{drug.manufacturer}</span>
                      </div>
                    )}
                    {drug.ndc && (
                      <div>
                        <span className="font-medium text-muted-foreground">NDC:</span>
                        <span className="ml-2 font-mono text-xs">{drug.ndc}</span>
                      </div>
                    )}
                    {drug.indication && (
                      <div>
                        <span className="font-medium text-muted-foreground">Indication:</span>
                        <span className="ml-2">{drug.indication}</span>
                      </div>
                    )}
                    {drug.description && (
                      <div>
                        <span className="font-medium text-muted-foreground">Description:</span>
                        <p className="ml-2 text-muted-foreground">{drug.description}</p>
                      </div>
                    )}
                  </div>

                  <div className="mt-3 pt-3 border-t">
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span>Added {new Date(drug.createdAt).toLocaleDateString()}</span>
                      <span className="text-primary hover:underline">View Details →</span>
                    </div>
                  </div>
                </Link>
              )
            })}
          </div>
        </CardContent>
      </Card>
    </ErrorBoundary>
  )
}
