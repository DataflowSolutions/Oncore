'use client'

import { Users, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface TeamMember {
  id: string
  name: string
  email: string | null
  phone: string | null
  member_type: string | null
  duty?: string
}

interface TeamMembersGridProps {
  title: string
  teamMembers: TeamMember[]
  onUnassign: (personId: string, personName: string) => void
}

export function TeamMembersGrid({ title, teamMembers, onUnassign }: TeamMembersGridProps) {
  if (teamMembers.length === 0) {
    return (
      <div className="border border-neutral-800 rounded-lg overflow-hidden bg-neutral-900/30">
        <div className="p-4 border-b border-neutral-800 bg-neutral-900/50">
          <div className="flex items-center space-x-2">
            <Users className="w-4 h-4 text-neutral-400" />
            <h4 className="text-sm font-medium text-neutral-100">{title}</h4>
          </div>
        </div>
        <div className="p-6">
          <div className="text-center py-8">
            <Users className="w-8 h-8 text-neutral-600 mx-auto mb-2" />
            <p className="text-sm text-neutral-500">No team members assigned</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="border border-neutral-800 rounded-lg overflow-hidden bg-neutral-900/30">
      <div className="p-4 border-b border-neutral-800 bg-neutral-900/50">
        <div className="flex items-center space-x-2">
          <Users className="w-4 h-4 text-neutral-400" />
          <h4 className="text-sm font-medium text-neutral-100">{title}</h4>
          <span className="text-xs text-neutral-500">
            {teamMembers.length} member{teamMembers.length !== 1 ? 's' : ''}
          </span>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-neutral-800 bg-neutral-900/20">
              <th className="w-12 px-4 py-3 text-left">
                <span className="text-xs text-neutral-500">#</span>
              </th>
              <th className="px-4 py-3 text-left">
                <span className="text-xs font-medium text-neutral-400 uppercase tracking-wider">
                  Name
                </span>
              </th>
              <th className="px-4 py-3 text-left">
                <span className="text-xs font-medium text-neutral-400 uppercase tracking-wider">
                  Phone
                </span>
              </th>
              <th className="px-4 py-3 text-left">
                <span className="text-xs font-medium text-neutral-400 uppercase tracking-wider">
                  Email
                </span>
              </th>
              <th className="px-4 py-3 text-left">
                <span className="text-xs font-medium text-neutral-400 uppercase tracking-wider">
                  Role
                </span>
              </th>
              <th className="w-12 px-4 py-3 text-center">
                <span className="text-xs font-medium text-neutral-400 uppercase tracking-wider">
                  
                </span>
              </th>
            </tr>
          </thead>
          <tbody>
            {teamMembers.map((member, index) => (
              <tr key={member.id} className="border-b border-neutral-800/50 hover:bg-neutral-900/20">
                <td className="px-4 py-3">
                  <span className="text-sm text-neutral-500">{index + 1}</span>
                </td>
                <td className="px-4 py-3">
                  <span className="text-sm text-neutral-100 font-medium">{member.name}</span>
                </td>
                <td className="px-4 py-3">
                  <span className="text-sm text-neutral-300">{member.phone || '-'}</span>
                </td>
                <td className="px-4 py-3">
                  <span className="text-sm text-neutral-300">{member.email || '-'}</span>
                </td>
                <td className="px-4 py-3">
                  <span className="text-sm text-neutral-300">{member.member_type || '-'}</span>
                </td>
                <td className="px-4 py-3 text-center">
                  <Button
                    onClick={() => {
                      if (confirm(`Do you want to unassign ${member.name} from this show?`)) {
                        onUnassign(member.id, member.name)
                      }
                    }}
                    size="sm"
                    variant="ghost"
                    className="h-8 w-8 p-0 text-red-400 hover:text-red-300 hover:bg-red-950/30"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}