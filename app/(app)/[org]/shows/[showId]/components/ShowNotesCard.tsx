import { FileText } from 'lucide-react'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

interface ShowNotesCardProps {
  notes: string
}

export function ShowNotesCard({ notes }: ShowNotesCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <FileText className="h-4 w-4" />
          Notes
        </CardTitle>
        <CardDescription>Internal context for your team</CardDescription>
      </CardHeader>
      <CardContent>
        <p className="whitespace-pre-line text-sm leading-relaxed text-foreground">{notes}</p>
      </CardContent>
    </Card>
  )
}
