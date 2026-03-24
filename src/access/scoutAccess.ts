import type { AccessArgs } from 'payload'

import type { User } from '@/payload-types'

type AdminOnly = (args: AccessArgs<User>) => boolean
type AdminOrScoutSelf = (args: AccessArgs<User>) => boolean | { user?: { equals: string | number } }

export const adminOnly: AdminOnly = ({ req: { user } }) => {
  return user?.roles?.includes('admin') || false
}

export const adminOrScoutSelf: AdminOrScoutSelf = ({ req: { user }, id }) => {
  // Admins can see all
  if (user?.roles?.includes('admin')) return true

  // Scouts can only see their own record
  if (user?.roles?.includes('scout') && id) {
    return {
      user: {
        equals: user.id,
      },
    }
  }

  return false
}
