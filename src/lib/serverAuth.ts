import { auth, currentUser } from '@clerk/nextjs/server'
import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import type { Payload } from 'payload'

import type { Scout, User } from '@/payload-types'
import { buildSignInRedirectUrl } from './authUrls'
import { getIdentityFromClerkUser } from './clerkUser'
import { syncClerkUser } from './clerkUserSync'

export type ScoutAuthContext = {
  clerkUserId: string
  scout: Scout
  user: User
}

function hasScoutRole(user: User | null | undefined) {
  return Boolean(user?.roles?.includes('scout'))
}

async function resolveUser(payload: Payload) {
  const { userId } = await auth()
  if (!userId) return null

  const clerkUser = await currentUser()
  if (!clerkUser) return null

  const identity = getIdentityFromClerkUser(userId, clerkUser)
  const user = (await syncClerkUser(payload, identity)) as User

  return {
    clerkUserId: identity.clerkUserId,
    user,
  }
}

export async function getScoutAuthContext(payload: Payload): Promise<ScoutAuthContext | null> {
  const resolved = await resolveUser(payload)

  if (!resolved || !hasScoutRole(resolved.user)) {
    return null
  }

  const scoutResult = await payload.find({
    collection: 'scouts',
    depth: 0,
    limit: 1,
    where: {
      user: {
        equals: resolved.user.id,
      },
    },
  })

  const scout = scoutResult.docs[0] as Scout | undefined

  if (!scout) {
    return null
  }

  return {
    clerkUserId: resolved.clerkUserId,
    scout,
    user: resolved.user,
  }
}

export async function requireScoutAuthContext(payload: Payload) {
  const context = await getScoutAuthContext(payload)

  if (!context) {
    const requestHeaders = await headers()
    const host = requestHeaders.get('x-forwarded-host') ?? requestHeaders.get('host')
    const proto = requestHeaders.get('x-forwarded-proto') ?? 'https'
    const pathname = requestHeaders.get('x-pathname') ?? requestHeaders.get('x-invoke-path') ?? '/'
    const returnBackUrl = host ? `${proto}://${host}${pathname}` : null

    redirect(buildSignInRedirectUrl(returnBackUrl))
  }

  return context
}
