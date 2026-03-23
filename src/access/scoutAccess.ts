import type { AccessArgs } from 'payload'

import type { User } from '@/payload-types'

type AdminOnly = (args: AccessArgs<User>) => boolean
type AdminOrScoutSelf = (args: AccessArgs<User>) => boolean | { user?: { equals: string } }

export const adminOnly: AdminOnly = ({ req: { user } }) => {
  return user?.roles?.includes('admin') || false
}

export const adminOrScoutSelf: AdminOrScoutSelf = ({ req: { user }, id, data }) => {
  // Admins can see all
  if (user?.roles?.includes('admin')) return true

  // Scouts can only see their own record
  if (user?.roles?.includes('scout')) {
    // If checking a specific scout (by ID), only allow if it's their own
    if (id) {
      return {
        user: {
          equals: user.id,
        },
      }
    }

    // For operations on data at creation time
    if (data?.user === user.id || data?.id === user.id) {
      return true
    }
  }

  return false
}
