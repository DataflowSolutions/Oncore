import { verifyAccessCode, getAdvancingFields, getAdvancingDocuments } from '@/lib/actions/advancing'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Calendar, MapPin, Users, ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import { DocumentsBox } from '@/components/advancing/DocumentsBox'
import { FieldRow } from '@/components/advancing/FieldRow'
import { redirect } from 'next/navigation'

interface AccessCodeSessionPageProps {
  params: Promise<{ accessCode: string }>
}

export default async function AccessCodeSessionPage({ params }: AccessCodeSessionPageProps) {
  const { accessCode } = await params
  
  // Verify access code and get session
  const result = await verifyAccessCode(accessCode)
  
  if (!result.success || !result.sessionId) {
    redirect(`/s/${accessCode}?error=invalid`)
  }

  const sessionId = result.sessionId
  const fields = await getAdvancingFields(sessionId)
  const documents = await getAdvancingDocuments(sessionId)

  // Group fields by party type and section
  const fromUsFields = fields.filter(f => f.party_type === 'from_us')
  const fromYouFields = fields.filter(f => f.party_type === 'from_you')
  
  const fromUsDocuments = documents.filter(d => d.party_type === 'from_us')
  const fromYouDocuments = documents.filter(d => d.party_type === 'from_you')

  const groupFieldsBySection = (fieldList: Record<string, unknown>[]) => {
    return fieldList.reduce((groups: Record<string, Record<string, unknown>[]>, field) => {
      const section = String(field.section || 'General')
      if (!groups[section]) {
        groups[section] = []
      }
      groups[section].push(field)
      return groups
    }, {} as Record<string, Record<string, unknown>[]>)
  }

  const fromUsSections = groupFieldsBySection(fromUsFields)
  const fromYouSections = groupFieldsBySection(fromYouFields)

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex flex-col gap-4">
        <div className="flex items-center gap-4">
          <Button asChild variant="ghost" size="sm">
            <Link href={`/s/${accessCode}`}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Link>
          </Button>
        </div>
        
        <div className="flex flex-col gap-2">
          <h1 className="text-2xl font-bold">Advancing Session</h1>
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <div className="flex items-center gap-1">
              <Calendar className="w-4 h-4" />
              Show Date
            </div>
            
            <div className="flex items-center gap-1">
              <MapPin className="w-4 h-4" />
              Venue
            </div>
            
            <div className="flex items-center gap-1">
              <Users className="w-4 h-4" />
              Artist
            </div>
          </div>
        </div>
      </div>

      {/* Access Notice */}
      <Card className="border-primary/20 bg-primary/5">
        <CardContent className="p-4">
          <p className="text-sm text-foreground">
            <strong>External Access:</strong> You&apos;re viewing this session with limited access. 
            You can view and respond to items in the &quot;FROM YOU&quot; section.
          </p>
        </CardContent>
      </Card>

      {/* Documents Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <DocumentsBox
          sessionId={sessionId}
          orgSlug="" // Not needed for access code flow
          partyType="from_us"
          documents={fromUsDocuments}
          title="FROM US - Documents"
        />
        
        <DocumentsBox
          sessionId={sessionId}
          orgSlug="" // Not needed for access code flow
          partyType="from_you"
          documents={fromYouDocuments}
          title="FROM YOU - Documents"
        />
      </div>

      {/* Fields Section - Two Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* FROM US Column (Read Only) */}
        <div className="space-y-6">
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-semibold">FROM US</h2>
            <Badge variant="outline">
              {fromUsFields.length} {fromUsFields.length === 1 ? 'field' : 'fields'}
            </Badge>
            <Badge variant="secondary" className="text-xs">Read Only</Badge>
          </div>
          
          {Object.keys(fromUsSections).length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <p className="text-muted-foreground text-center">
                  No fields yet.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-6">
              {Object.entries(fromUsSections).map(([section, sectionFields]) => (
                <div key={section} className="space-y-4">
                  <h3 className="text-lg font-medium text-muted-foreground border-b pb-2">
                    {section}
                  </h3>
                  <div className="space-y-4">
                    {(sectionFields as Record<string, unknown>[]).map((field) => (
                      <FieldRow
                        key={String(field.id)}
                        field={{
                          id: String(field.id),
                          section: String(field.section),
                          field_name: String(field.field_name),
                          field_type: String(field.field_type),
                          value: field.value,
                          status: field.status as "pending" | "confirmed",
                          party_type: field.party_type as "from_us" | "from_you"
                        }}
                        orgSlug=""
                        sessionId={sessionId}
                        comments={[]} // TODO: Load comments for each field

                      />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* FROM YOU Column (Editable) */}
        <div className="space-y-6">
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-semibold">FROM YOU</h2>
            <Badge variant="outline">
              {fromYouFields.length} {fromYouFields.length === 1 ? 'field' : 'fields'}
            </Badge>
            <Badge variant="default" className="text-xs">Editable</Badge>
          </div>
          
          {Object.keys(fromYouSections).length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <p className="text-muted-foreground text-center">
                  No fields yet. Fields will appear here when the organizer adds them.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-6">
              {Object.entries(fromYouSections).map(([section, sectionFields]) => (
                <div key={section} className="space-y-4">
                  <h3 className="text-lg font-medium text-muted-foreground border-b pb-2">
                    {section}
                  </h3>
                  <div className="space-y-4">
                    {(sectionFields as Record<string, unknown>[]).map((field) => (
                      <FieldRow
                        key={String(field.id)}
                        field={{
                          id: String(field.id),
                          section: String(field.section),
                          field_name: String(field.field_name),
                          field_type: String(field.field_type),
                          value: field.value,
                          status: field.status as "pending" | "confirmed",
                          party_type: field.party_type as "from_us" | "from_you"
                        }}
                        orgSlug=""
                        sessionId={sessionId}
                        comments={[]} // TODO: Load comments for each field

                      />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}