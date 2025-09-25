import { NextRequest, NextResponse } from 'next/server'
import { revalidatePath, revalidateTag } from 'next/cache'

// Webhook secret for security
const WEBHOOK_SECRET = process.env.WEBHOOK_SECRET || 'fallback-secret'

interface RevalidateRequest {
  secret: string
  type: 'drug' | 'global'
  slug?: string
  ndc?: string
  paths?: string[]
  tags?: string[]
}

export async function POST(request: NextRequest) {
  try {
    const body: RevalidateRequest = await request.json()

    // Verify webhook secret
    if (body.secret !== WEBHOOK_SECRET) {
      console.error('Invalid webhook secret provided')
      return NextResponse.json({ error: 'Invalid secret' }, { status: 401 })
    }

    const results: string[] = []

    if (body.type === 'drug' && body.slug) {
      // Revalidate specific drug page
      const drugPath = `/drugs/${body.slug}`
      revalidatePath(drugPath)
      results.push(`Revalidated path: ${drugPath}`)

      // Also revalidate any tags associated with this drug
      if (body.ndc) {
        revalidateTag(`drug-${body.ndc}`)
        results.push(`Revalidated tag: drug-${body.ndc}`)
      }

      // Revalidate homepage search cache
      revalidateTag('drug-search')
      results.push('Revalidated search cache')
    } else if (body.type === 'global') {
      // Global cache invalidation
      revalidateTag('drugs')
      revalidateTag('drug-search')
      results.push('Revalidated global drug cache')
    } else if (body.paths) {
      // Revalidate specific paths
      body.paths.forEach((path) => {
        revalidatePath(path)
        results.push(`Revalidated path: ${path}`)
      })
    } else if (body.tags) {
      // Revalidate specific tags
      body.tags.forEach((tag) => {
        revalidateTag(tag)
        results.push(`Revalidated tag: ${tag}`)
      })
    }

    console.log('Cache revalidation completed:', results)

    return NextResponse.json({
      success: true,
      message: 'Cache revalidated successfully',
      results,
    })
  } catch (error) {
    console.error('Cache revalidation error:', error)
    return NextResponse.json({ error: 'Failed to revalidate cache' }, { status: 500 })
  }
}

// Health check endpoint
export async function GET() {
  return NextResponse.json({
    status: 'healthy',
    message: 'Cache invalidation webhook is ready',
  })
}
