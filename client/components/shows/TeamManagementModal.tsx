'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Users,
  UserPlus,
  Trash2,
  Music,
  Wrench,
  Building,
  Mail,
  Phone,
  Search,
  Loader2,
} from 'lucide-react'
import { assignPersonToShow, removePersonFromShow } from '@/lib/actions/show-team'
import { toast } from 'sonner'

interface Person {
  id: string
  name: string
  member_type: string | null
  email: string | null
  phone: string | null
  duty?: string
}

interface TeamManagementModalProps {
  showId: string
  assignedTeam: Person[]
  availablePeople: Person[]
}

const getRoleIcon = (memberType: string | null) => {
  switch (memberType) {
    case 'Artist':
      return Music
    case 'Agent':
    case 'Manager':
      return Building
    case 'Crew':
      return Wrench
    default:
      return Users
  }
}

export function TeamManagementModal({
  showId,
  assignedTeam,
  availablePeople,
}: TeamManagementModalProps) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedPerson, setSelectedPerson] = useState<string | null>(null)
  const [duty, setDuty] = useState('')
  const [isAdding, setIsAdding] = useState(false)
  const [removingId, setRemovingId] = useState<string | null>(null)

  // Filter available people based on search
  const filteredAvailablePeople = availablePeople.filter((person) => {
    if (!searchQuery.trim()) return true
    const query = searchQuery.toLowerCase()
    return (
      person.name?.toLowerCase().includes(query) ||
      person.email?.toLowerCase().includes(query) ||
      person.member_type?.toLowerCase().includes(query)
    )
  })

  const handleAddPerson = async () => {
    if (!selectedPerson) return

    setIsAdding(true)
    try {
      const formData = new FormData()
      formData.append('showId', showId)
      formData.append('personId', selectedPerson)
      formData.append('duty', duty)

      await assignPersonToShow(formData)
      
      const person = availablePeople.find(p => p.id === selectedPerson)
      toast.success(`Added ${person?.name} to show`)
      
      setSelectedPerson(null)
      setDuty('')
      setSearchQuery('')
      router.refresh()
    } catch (error) {
      console.error('Error adding person:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to add person')
    } finally {
      setIsAdding(false)
    }
  }

  const handleRemovePerson = async (personId: string, personName: string) => {
    if (!confirm(`Remove ${personName} from this show?`)) {
      return
    }

    setRemovingId(personId)
    try {
      await removePersonFromShow(showId, personId)
      toast.success(`Removed ${personName} from show`)
      router.refresh()
    } catch (error) {
      console.error('Error removing person:', error)
      toast.error('Failed to remove person')
    } finally {
      setRemovingId(null)
    }
  }

  // Group assigned team by member type
  const artistTeam = assignedTeam.filter((p) => p.member_type === 'Artist')
  const crewTeam = assignedTeam.filter((p) => p.member_type === 'Crew')
  const promoterTeam = assignedTeam.filter(
    (p) => p.member_type === 'Agent' || p.member_type === 'Manager'
  )

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Users className="w-4 h-4 mr-2" />
          Manage Team ({assignedTeam.length})
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Team Management</DialogTitle>
          <DialogDescription>
            Add or remove people from this show. Manage their duties and roles.
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="assigned" className="flex-1 flex flex-col overflow-hidden">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="assigned">
              Assigned Team ({assignedTeam.length})
            </TabsTrigger>
            <TabsTrigger value="add">Add People ({availablePeople.length})</TabsTrigger>
          </TabsList>

          {/* Assigned Team Tab */}
          <TabsContent value="assigned" className="flex-1 mt-4 overflow-hidden">
            {assignedTeam.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <Users className="w-12 h-12 text-muted-foreground mb-4" />
                <p className="text-muted-foreground">No team members assigned yet</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Switch to the &quot;Add People&quot; tab to get started
                </p>
              </div>
            ) : (
              <ScrollArea className="h-[450px] pr-4">
                <div className="space-y-6">
                  {/* Artists */}
                  {artistTeam.length > 0 && (
                    <div>
                      <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
                        <Music className="w-4 h-4" />
                        Artists ({artistTeam.length})
                      </h3>
                      <div className="space-y-2">
                        {artistTeam.map((person) => (
                          <TeamMemberCard
                            key={person.id}
                            person={person}
                            onRemove={handleRemovePerson}
                            isRemoving={removingId === person.id}
                          />
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Crew */}
                  {crewTeam.length > 0 && (
                    <div>
                      <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
                        <Wrench className="w-4 h-4" />
                        Crew ({crewTeam.length})
                      </h3>
                      <div className="space-y-2">
                        {crewTeam.map((person) => (
                          <TeamMemberCard
                            key={person.id}
                            person={person}
                            onRemove={handleRemovePerson}
                            isRemoving={removingId === person.id}
                          />
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Promoter Team */}
                  {promoterTeam.length > 0 && (
                    <div>
                      <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
                        <Building className="w-4 h-4" />
                        Promoter Team ({promoterTeam.length})
                      </h3>
                      <div className="space-y-2">
                        {promoterTeam.map((person) => (
                          <TeamMemberCard
                            key={person.id}
                            person={person}
                            onRemove={handleRemovePerson}
                            isRemoving={removingId === person.id}
                          />
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </ScrollArea>
            )}
          </TabsContent>

          {/* Add People Tab */}
          <TabsContent value="add" className="flex-1 mt-4 overflow-hidden flex flex-col">
            <div className="space-y-4 flex-1 flex flex-col overflow-hidden">
              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                <Input
                  placeholder="Search people..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>

              {availablePeople.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <Users className="w-12 h-12 text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">
                    All people have been assigned to this show
                  </p>
                </div>
              ) : filteredAvailablePeople.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <Users className="w-12 h-12 text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">
                    No people found matching &quot;{searchQuery}&quot;
                  </p>
                </div>
              ) : (
                <ScrollArea className="flex-1 pr-4">
                  <div className="space-y-2">
                    {filteredAvailablePeople.map((person) => {
                      const RoleIcon = getRoleIcon(person.member_type)
                      const isSelected = selectedPerson === person.id

                      return (
                        <div
                          key={person.id}
                          onClick={() =>
                            setSelectedPerson(isSelected ? null : person.id)
                          }
                          className={`rounded-lg border p-3 cursor-pointer transition-all ${
                            isSelected
                              ? 'border-primary bg-primary/5'
                              : 'border-border hover:border-primary/50 hover:bg-accent/50'
                          }`}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1 space-y-1">
                              <div className="flex items-center gap-2">
                                <h4 className="font-semibold text-sm">{person.name}</h4>
                                {person.member_type && (
                                  <Badge variant="outline" className="text-xs">
                                    <RoleIcon className="w-3 h-3 mr-1" />
                                    {person.member_type}
                                  </Badge>
                                )}
                              </div>
                              <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
                                {person.email && (
                                  <div className="flex items-center gap-1">
                                    <Mail className="w-3 h-3" />
                                    <span>{person.email}</span>
                                  </div>
                                )}
                                {person.phone && (
                                  <div className="flex items-center gap-1">
                                    <Phone className="w-3 h-3" />
                                    <span>{person.phone}</span>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </ScrollArea>
              )}

              {/* Add Person Form */}
              {selectedPerson && (
                <div className="border-t pt-4 space-y-3">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">
                      Duty (Optional)
                    </label>
                    <Input
                      placeholder="e.g., Sound Engineer, Stage Manager"
                      value={duty}
                      onChange={(e) => setDuty(e.target.value)}
                      disabled={isAdding}
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button
                      onClick={() => {
                        setSelectedPerson(null)
                        setDuty('')
                      }}
                      variant="outline"
                      disabled={isAdding}
                      className="flex-1"
                    >
                      Cancel
                    </Button>
                    <Button
                      onClick={handleAddPerson}
                      disabled={isAdding}
                      className="flex-1"
                    >
                      {isAdding && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                      <UserPlus className="w-4 h-4 mr-2" />
                      Add to Show
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  )
}

// Team Member Card Component
interface TeamMemberCardProps {
  person: Person
  onRemove: (id: string, name: string) => void
  isRemoving: boolean
}

function TeamMemberCard({
  person,
  onRemove,
  isRemoving,
}: TeamMemberCardProps) {
  const RoleIcon = getRoleIcon(person.member_type)

  return (
    <div className="rounded-lg border border-input bg-card p-3">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 space-y-2">
          <div className="flex items-center gap-2 flex-wrap">
            <h4 className="font-semibold text-sm">{person.name}</h4>
            {person.member_type && (
              <Badge variant="outline" className="text-xs">
                <RoleIcon className="w-3 h-3 mr-1" />
                {person.member_type}
              </Badge>
            )}
            {person.duty && (
              <Badge variant="secondary" className="text-xs">
                {person.duty}
              </Badge>
            )}
          </div>
          <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
            {person.email && (
              <div className="flex items-center gap-1">
                <Mail className="w-3 h-3" />
                <span>{person.email}</span>
              </div>
            )}
            {person.phone && (
              <div className="flex items-center gap-1">
                <Phone className="w-3 h-3" />
                <span>{person.phone}</span>
              </div>
            )}
          </div>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onRemove(person.id, person.name)}
          disabled={isRemoving}
          className="text-destructive hover:text-destructive hover:bg-destructive/10"
        >
          {isRemoving ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Trash2 className="w-4 h-4" />
          )}
        </Button>
      </div>
    </div>
  )
}
