import { getSupabaseServer } from '@/lib/supabase/server'
import { getShowsByOrg } from '@/lib/actions/shows'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'

interface NewAdvancingSessionPageProps {
  params: Promise<{ org: string }>
  searchParams: Promise<{ showId?: string }>
}

export default async function NewAdvancingSessionPage({ params, searchParams }: NewAdvancingSessionPageProps) {
  const { org: orgSlug } = await params
  const { showId } = await searchParams
  
  const supabase = await getSupabaseServer()
  
  // Get org_id from org slug
  const { data: organization } = await supabase
    .from('organizations')
    .select('id, name')
    .eq('slug', orgSlug)
    .single()
  
  if (!organization) {
    return <div>Organization not found</div>
  }

  // Get shows for the organization
  const shows = await getShowsByOrg(organization.id)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button asChild variant="ghost" size="sm">
          <Link href={`/${orgSlug}/advancing`}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Sessions
          </Link>
        </Button>
      </div>
      
      <div>
        <h1 className="text-2xl font-bold">Create Advancing Session</h1>
        <p className="text-muted-foreground">
          Start a new advancing session to collaborate with venues and manage show details.
        </p>
      </div>

      {/* Form */}
      <Card>
        <CardHeader>
          <CardTitle>Session Details</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={async (formData: FormData) => {
            'use server'
            const { createAdvancingSession } = await import('@/lib/actions/advancing')
            const { redirect } = await import('next/navigation')
            
            const title = formData.get('title') as string
            const showId = formData.get('showId') as string
            
            if (!title.trim()) return
            
            const result = await createAdvancingSession(orgSlug, {
              title,
              showId: showId === 'none' ? '' : showId,
            })
            
            if (result.success && result.data) {
              redirect(`/${orgSlug}/advancing/${result.data.id}`)
            }
          }} className="space-y-6">
            <div className="space-y-2">
              <label htmlFor="title" className="text-sm font-medium">
                Session Title
              </label>
              <input
                id="title"
                name="title"
                type="text"
                placeholder="Enter session title..."
                required
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="showId" className="text-sm font-medium">
                Associated Show (Optional)
              </label>
              <select
                id="showId"
                name="showId"
                defaultValue={showId || 'none'}
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
              >
                <option value="none">No show selected</option>
                {shows.map((show) => (
                  <option key={show.id} value={show.id}>
                    {show.title}{show.venue ? ` • ${show.venue.name}` : ''}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex gap-3">
              <button 
                type="submit"
                className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-all disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground hover:bg-primary/90 h-9 px-4 py-2"
              >
                Create Session
              </button>
              
              <Button asChild variant="outline">
                <Link href={`/${orgSlug}/advancing`}>
                  Cancel
                </Link>
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}