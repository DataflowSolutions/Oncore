'use client'

import { useState, useTransition } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion'
import { Shield, Users, Crown, Edit, Eye, Trash2, Info, CheckCircle } from 'lucide-react'
import { updateMemberRole, removeMember } from '@/lib/actions/org-members'
import { getRolePermissions, type OrgRole } from '@/lib/utils/role-permissions'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'

interface OrgMemberWithUser {
  created_at: string
  org_id: string
  role: OrgRole
  user_id: string
  user_email: string
  user_name: string | null
}

interface RolesPermissionsTabProps {
  members: OrgMemberWithUser[]
  currentUserRole: OrgRole
  currentUserId: string
  orgId: string
}

const getRoleIcon = (role: OrgRole) => {
  switch (role) {
    case 'owner':
      return Crown
    case 'admin':
      return Shield
    case 'editor':
      return Edit
    case 'viewer':
      return Eye
  }
}

const getRoleBadgeColor = (role: OrgRole) => {
  switch (role) {
    case 'owner':
      return 'bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-400'
    case 'admin':
      return 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400'
    case 'editor':
      return 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400'
    case 'viewer':
      return 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400'
  }
}

export function RolesPermissionsTab({
  members,
  currentUserRole,
  currentUserId,
  orgId,
}: RolesPermissionsTabProps) {
  const [isPending, startTransition] = useTransition()
  const [editingUserId, setEditingUserId] = useState<string | null>(null)
  const [selectedRole, setSelectedRole] = useState<OrgRole>('viewer')
  const [removingUserId, setRemovingUserId] = useState<string | null>(null)
  const router = useRouter()

  const canManageRoles = currentUserRole === 'owner' || currentUserRole === 'admin'

  const handleRoleUpdate = (userId: string) => {
    startTransition(async () => {
      const result = await updateMemberRole(orgId, userId, selectedRole)
      
      if (result.success) {
        toast.success('Role updated successfully')
        setEditingUserId(null)
        router.refresh()
      } else {
        toast.error('Failed to update role', {
          description: result.error
        })
      }
    })
  }

  const handleRemoveMember = (userId: string) => {
    startTransition(async () => {
      const result = await removeMember(orgId, userId)
      
      if (result.success) {
        toast.success('Member removed successfully')
        setRemovingUserId(null)
        router.refresh()
      } else {
        toast.error('Failed to remove member', {
          description: result.error
        })
      }
    })
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  // Group members by role for organization
  const membersByRole = {
    owner: members.filter(m => m.role === 'owner'),
    admin: members.filter(m => m.role === 'admin'),
    editor: members.filter(m => m.role === 'editor'),
    viewer: members.filter(m => m.role === 'viewer'),
  }

  return (
    <div className="space-y-6">
      {/* Role Permissions Guide */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Info className="w-5 h-5" />
            Role Permissions Guide
          </CardTitle>
          <CardDescription>
            Understand what each role can do in your organization
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Accordion type="single" collapsible className="w-full">
            {(['owner', 'admin', 'editor', 'viewer'] as OrgRole[]).map((role) => {
              const roleInfo = getRolePermissions(role)
              const Icon = getRoleIcon(role)
              
              return (
                <AccordionItem key={role} value={role}>
                  <AccordionTrigger>
                    <div className="flex items-center gap-3">
                      <Icon className="w-5 h-5" />
                      <div className="text-left">
                        <div className="font-medium">{roleInfo.label}</div>
                        <div className="text-sm text-muted-foreground">{roleInfo.description}</div>
                      </div>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent>
                    <ul className="space-y-2 pl-8">
                      {roleInfo.permissions.map((permission, idx) => (
                        <li key={idx} className="flex items-start gap-2">
                          <CheckCircle className="w-4 h-4 mt-0.5 text-green-600 dark:text-green-400 flex-shrink-0" />
                          <span className="text-sm">{permission}</span>
                        </li>
                      ))}
                    </ul>
                  </AccordionContent>
                </AccordionItem>
              )
            })}
          </Accordion>
        </CardContent>
      </Card>

      {/* Team Members */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="w-5 h-5" />
            Team Members ({members.length})
          </CardTitle>
          <CardDescription>
            Manage roles and permissions for your team members
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Summary by role */}
          <div className="flex flex-wrap gap-2 pb-4 border-b">
            {(['owner', 'admin', 'editor', 'viewer'] as OrgRole[]).map((role) => {
              const count = membersByRole[role].length
              const Icon = getRoleIcon(role)
              
              return (
                <Badge key={role} variant="outline" className="flex items-center gap-1.5 px-3 py-1">
                  <Icon className="w-3.5 h-3.5" />
                  <span className="capitalize">{role}</span>
                  <span className="text-muted-foreground">({count})</span>
                </Badge>
              )
            })}
          </div>

          {/* Member list */}
          <div className="space-y-2">
            {members.map((member) => {
              const Icon = getRoleIcon(member.role)
              const isCurrentUser = member.user_id === currentUserId
              const isEditing = editingUserId === member.user_id
              const canEditThisMember = canManageRoles && 
                !(currentUserRole === 'admin' && member.role === 'owner')

              return (
                <div
                  key={member.user_id}
                  className="border rounded-lg p-4 hover:bg-accent/50 transition-colors"
                >
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <Icon className="w-4 h-4 flex-shrink-0" />
                        <h4 className="font-medium truncate">
                          {member.user_name || member.user_email}
                          {isCurrentUser && (
                            <span className="text-muted-foreground ml-2">(You)</span>
                          )}
                        </h4>
                      </div>
                      {member.user_name && (
                        <p className="text-sm text-muted-foreground truncate">
                          {member.user_email}
                        </p>
                      )}
                      <div className="flex items-center gap-2 mt-2">
                        <Badge className={getRoleBadgeColor(member.role)}>
                          {member.role}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          Joined {formatDate(member.created_at)}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {isEditing ? (
                        <>
                          <Select value={selectedRole} onValueChange={(value: OrgRole) => setSelectedRole(value)}>
                            <SelectTrigger className="w-[130px]">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="viewer">
                                <div className="flex items-center gap-2">
                                  <Eye className="w-4 h-4" />
                                  Viewer
                                </div>
                              </SelectItem>
                              <SelectItem value="editor">
                                <div className="flex items-center gap-2">
                                  <Edit className="w-4 h-4" />
                                  Editor
                                </div>
                              </SelectItem>
                              <SelectItem value="admin">
                                <div className="flex items-center gap-2">
                                  <Shield className="w-4 h-4" />
                                  Admin
                                </div>
                              </SelectItem>
                              {currentUserRole === 'owner' && (
                                <SelectItem value="owner">
                                  <div className="flex items-center gap-2">
                                    <Crown className="w-4 h-4" />
                                    Owner
                                  </div>
                                </SelectItem>
                              )}
                            </SelectContent>
                          </Select>
                          <Button
                            size="sm"
                            onClick={() => handleRoleUpdate(member.user_id)}
                            disabled={isPending}
                          >
                            Save
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => setEditingUserId(null)}
                            disabled={isPending}
                          >
                            Cancel
                          </Button>
                        </>
                      ) : (
                        <>
                          {canEditThisMember && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setEditingUserId(member.user_id)
                                setSelectedRole(member.role)
                              }}
                              disabled={isPending}
                            >
                              Change Role
                            </Button>
                          )}
                          {canEditThisMember && !isCurrentUser && (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => setRemovingUserId(member.user_id)}
                              disabled={isPending}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>

          {members.length === 0 && (
            <div className="text-center py-12 text-muted-foreground">
              <Users className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>No team members found</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Remove member confirmation dialog */}
      <AlertDialog open={!!removingUserId} onOpenChange={(open: boolean) => !open && setRemovingUserId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Team Member</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove this team member? They will lose all access to this organization.
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => removingUserId && handleRemoveMember(removingUserId)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Remove Member
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
