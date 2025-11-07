/**
 * Reserved slugs that cannot be used for organization names.
 * These prevent conflicts with system routes and common paths.
 */
export const RESERVED_SLUGS = [
  'admin',
  'api',
  'auth',
  'app',
  'dashboard',
  'settings',
  'billing',
  'profile',
  'user',
  'users',
  'organization',
  'organizations',
  'team',
  'teams',
  'public',
  'private',
  'static',
  'assets',
  'docs',
  'help',
  'support',
  'about',
  'contact',
  'terms',
  'privacy',
  'login',
  'logout',
  'signup',
  'signin',
  'register',
  'home',
  'index',
  'new',
  'create',
  'edit',
  'delete',
  'update',
  's', // Used for short links
  'debug', // Used for debug routes
] as const

/**
 * Check if a slug is reserved
 */
export function isReservedSlug(slug: string): boolean {
  return (RESERVED_SLUGS as readonly string[]).includes(slug)
}
