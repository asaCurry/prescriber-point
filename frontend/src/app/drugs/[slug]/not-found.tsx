import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

export default function DrugNotFound() {
  return (
    <main className="min-h-screen bg-white">
      <div className="container mx-auto px-4 py-8 max-w-2xl">
        <div className="text-center">
          <Card>
            <CardHeader>
              <CardTitle className="text-2xl">Drug Not Found</CardTitle>
              <CardDescription>
                The drug information you&apos;re looking for could not be found in our database.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-muted-foreground">This could be because:</p>
              <ul className="text-left text-sm text-muted-foreground space-y-1 max-w-md mx-auto">
                <li>• The drug name was misspelled</li>
                <li>• The drug is not FDA-approved</li>
                <li>• The drug information is not yet available in our system</li>
              </ul>
              <div className="flex flex-col sm:flex-row gap-3 justify-center pt-4">
                <Button asChild>
                  <Link href="/">Return to Search</Link>
                </Button>
                <Button variant="outline" asChild>
                  <Link href="/drugs">Browse All Drugs</Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </main>
  )
}
