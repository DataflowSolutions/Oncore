export type OrgRole = 'owner' | 'admin' | 'editor' | 'viewer'

/**
 * Get role permissions information
 * This is a client-safe utility function (not a server action)
 */
export function getRolePermissions(role: OrgRole) {
  const permissions = {
    owner: {
      label: 'Owner',
      description: 'Full control including billing and organization deletion',
      permissions: [
        'Manage all shows and events',
        'Manage team members and roles',
        'Manage billing and subscriptions',
        'Delete organization',
        'Access all settings'
      ],
      color: 'purple'
    },
    admin: {
      label: 'Admin',
      description: 'Manage organization and team, except billing and deletion',
      permissions: [
        'Manage all shows and events',
        'Manage team members and roles',
        'Cannot change owner roles',
        'Cannot delete organization',
        'Access most settings'
      ],
      color: 'blue'
    },
    editor: {
      label: 'Editor',
      description: 'Create and modify content',
      permissions: [
        'Create and edit shows',
        'Manage show assignments',
        'View team members',
        'Cannot manage team roles',
        'Limited settings access'
      ],
      color: 'green'
    },
    viewer: {
      label: 'Viewer',
      description: 'Read-only access to organization data',
      permissions: [
        'View shows and events',
        'View team members',
        'Cannot create or edit',
        'Cannot manage team',
        'Minimal settings access'
      ],
      color: 'gray'
    }
  }

  return permissions[role]
}
