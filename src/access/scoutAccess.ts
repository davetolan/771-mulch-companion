import type { AccessArgs } from 'payload'

import type { User } from '@/payload-types'

type AdminOnly = (args: AccessArgs<User>) => boolean
type AdminOrScout = (args: AccessArgs<User>) => boolean
type AdminOrScoutSelf = (args: AccessArgs<User>) => boolean | { user?: { equals: string | number } }
type AdminOrScoutOwnedByScout = (
  args: AccessArgs<User>,
) => Promise<boolean | { scout?: { equals: number } }>

export const adminOnly: AdminOnly = ({ req: { user } }) => {
  return user?.roles?.includes('admin') || false
}

export const adminOrScout: AdminOrScout = ({ req: { user } }) => {
  return Boolean(user?.roles?.includes('admin') || user?.roles?.includes('scout'))
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

export const adminOrScoutOwnedByScout: AdminOrScoutOwnedByScout = async ({
  req: { user, payload },
}) => {
  if (user?.roles?.includes('admin')) return true
  if (!user?.roles?.includes('scout')) return false

  const scoutResult = await payload.find({
    collection: 'scouts',
    depth: 0,
    limit: 1,
    where: {
      user: {
        equals: user.id,
      },
    },
  })

  const scout = scoutResult.docs[0]

  if (!scout) {
    return false
  }

  return {
    scout: {
      equals: scout.id,
    },
  }
}
