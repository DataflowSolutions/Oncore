# Role System Documentation

## Overview

Oncore uses a comprehensive role-based access control (RBAC) system to manage permissions for both organization members and show collaborators.

## Organization Roles

Organization roles are defined in the `org_role` enum and control access to organization-wide resources.

### Available Roles

| Role | Description | Permissions |
|------|-------------|-------------|
| **Owner** | Full control of the organization | • All admin permissions<br>• Can delete organization<br>• Can transfer ownership<br>• Billing management |
| **Admin** | Administrative access | • Manage team members<br>• Invite/remove users<br>• Manage settings<br>• Create/edit all content |
| **Editor** | Content management | • Create and edit shows<br>• Manage artists and venues<br>• Create advancing sessions<br>• Upload files<br>• View all data |
| **Viewer** | Read-only access | • View all organization data<br>• Cannot create or edit<br>• Cannot invite users |

### How Roles Are Assigned

1. **Organization Creation**: The user who creates an organization automatically receives the `owner` role.

2. **Invitations**: When inviting a new team member:
   - Select the person from the People page
   - Click "Invite"
   - Choose their role from the dialog
   - They receive an email invitation
   - Upon accepting, they're added to `org_members` with the selected role

3. **Role Changes**: Admins and owners can update user roles in the team settings.

## Show Collaboration Roles

Show-specific roles are defined in the `show_collab_role` enum for cross-organization collaboration.

### Available Roles

| Role | Description | Permissions |
|------|-------------|-------------|
| **Promoter Editor** | Can edit show details | • Edit advancing fields<br>• Upload files<br>• Comment on fields<br>• View all show data |
| **Promoter Viewer** | Read-only show access | • View advancing fields<br>• View files<br>• View comments<br>• Cannot edit |

### How Show Roles Are Assigned

1. Navigate to a show
2. Click "Invite Collaborator"
3. Enter email and select role
4. External users receive invitation to collaborate on specific shows

## Database Structure

### Tables

#### `org_members`
```sql
CREATE TABLE org_members (
  org_id uuid REFERENCES organizations(id),
  user_id uuid NOT NULL,
  role org_role NOT NULL,
  created_at timestamptz DEFAULT now(),
  PRIMARY KEY (org_id, user_id)
);
```

#### `invitations`
```sql
CREATE TABLE invitations (
  id uuid PRIMARY KEY,
  org_id uuid REFERENCES organizations(id),
  person_id uuid REFERENCES people(id),
  email text NOT NULL,
  role org_role NOT NULL DEFAULT 'viewer',
  token text UNIQUE NOT NULL,
  expires_at timestamptz NOT NULL,
  accepted_at timestamptz,
  created_by uuid,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
```

#### `show_collaborators`
```sql
CREATE TABLE show_collaborators (
  id uuid PRIMARY KEY,
  show_id uuid REFERENCES shows(id),
  user_id uuid,
  email text NOT NULL,
  role show_collab_role NOT NULL DEFAULT 'promoter_editor',
  invited_by uuid,
  accepted_at timestamptz,
  created_at timestamptz DEFAULT now(),
  UNIQUE (show_id, email)
);
```

## Permission Functions

### Check Functions

These helper functions check user permissions:

```sql
-- Check if user is org member
is_org_member(p_org_id uuid) RETURNS boolean

-- Check if user is org editor (editor, admin, or owner)
is_org_editor(p_org_id uuid) RETURNS boolean

-- Check if user can access show
app_can_access_show(p_show_id uuid) RETURNS boolean

-- Get user's role in show
app_get_show_role(p_show_id uuid) RETURNS text
```

### RPC Functions

#### Invite Person
```typescript
invitePerson(
  personId: string, 
  role: 'owner' | 'admin' | 'editor' | 'viewer' = 'viewer'
): Promise<{ success: boolean; ... }>
```

Creates an invitation with specified role.

#### Accept Invitation
```sql
accept_invitation(p_token text, p_user_id uuid) 
RETURNS jsonb
```

Accepts invitation and adds user to org with the role specified in invitation.

#### Invite Show Collaborator
```typescript
app_invite_collaborator(
  p_show_id: string,
  p_email: string,
  p_role?: 'promoter_editor' | 'promoter_viewer'
): Promise<string>
```

Invites external user to collaborate on specific show.

## Row Level Security (RLS)

All tables use RLS policies to enforce role-based access:

### Organization Members
- **Owners/Admins**: Can view and manage all members
- **Editors/Viewers**: Can view members but not manage

### Shows
- **Org Members**: Full access to org shows
- **Show Collaborators**: Access limited to invited shows only

### Advancing Sessions
- **Org Editors**: Can create and manage sessions
- **Org Viewers**: Read-only access
- **Show Collaborators**: Access based on show role

## Implementation Example

### Inviting a Team Member

```typescript
import { invitePerson } from '@/lib/actions/invitations';

// Invite with viewer role (default)
await invitePerson(personId);

// Invite with specific role
await invitePerson(personId, 'editor');
```

### Checking Permissions in Components

```typescript
import { getSupabaseServer } from '@/lib/supabase/server';

const supabase = await getSupabaseServer();

// Check if user can edit
const { data } = await supabase.rpc('is_org_editor', { 
  p_org_id: orgId 
});

if (data) {
  // Show edit UI
}
```

### Protecting Server Actions

```typescript
'use server'

export async function updateShow(showId: string, data: any) {
  const supabase = await getSupabaseServer();
  
  // Get show's org_id
  const { data: show } = await supabase
    .from('shows')
    .select('org_id')
    .eq('id', showId)
    .single();
    
  // Check permission
  const { data: canEdit } = await supabase
    .rpc('is_org_editor', { p_org_id: show.org_id });
    
  if (!canEdit) {
    throw new Error('Permission denied');
  }
  
  // Proceed with update...
}
```

## Best Practices

1. **Default to Least Privilege**: Always default to `viewer` role when inviting
2. **Owner Role**: Use sparingly - only for trusted co-founders
3. **Regular Audits**: Periodically review team members and their roles
4. **Remove Access**: Remove users promptly when they leave
5. **Show Collaborators**: Use for external promoters/venues, not internal team
6. **Validate Permissions**: Always check permissions in server actions
7. **UI Hints**: Show/hide UI elements based on user role

## Migration History

- `20250918144101_initial_schema.sql` - Created `org_role` enum and `org_members` table
- `20251001000000_invitation_system.sql` - Added invitations table (without role)
- `20250124000000_add_role_to_invitations.sql` - **Added role field to invitations**

## Related Files

- `/lib/actions/invitations.ts` - Invitation actions with role support
- `/lib/database.types.ts` - TypeScript types for roles
- `/components/team/PeoplePageClient.tsx` - UI for role selection
- `/supabase/migrations/*.sql` - Database schema and functions
