import { auth, currentUser } from '@clerk/nextjs/server'
import { cookies, headers } from 'next/headers'
import { redirect } from 'next/navigation'
import type { Payload } from 'payload'

import type { Scout, User } from '@/payload-types'
import { buildSignInRedirectUrl } from './authUrls'
import { getIdentityFromClerkUser } from './clerkUser'
import { syncClerkUser } from './clerkUserSync'
import { DEV_AUTH_COOKIE_NAME, isDevAuthEnabled, resolveDevAuthContext } from './devAuth'

export type ScoutAuthContext = {
  clerkUserId: string
  scout: Scout
  user: User
}

function hasScoutRole(user: User | null | undefined) {
  return Boolean(user?.roles?.includes('scout'))
}

async function resolveUser(payload: Payload) {
  let userId: string | null = null

  try {
    const authState = await auth()
    userId = authState.userId
  } catch (error) {
    if (!isDevAuthEnabled()) {
      throw error
    }
  }

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

async function getDevScoutAuthContext(payload: Payload): Promise<ScoutAuthContext | null> {
  if (!isDevAuthEnabled()) {
    return null
  }

  const cookieStore = await cookies()
  const context = await resolveDevAuthContext(
    payload,
    cookieStore.get(DEV_AUTH_COOKIE_NAME)?.value,
  )

  if (!context) {
    return null
  }

  return {
    clerkUserId: context.user.clerkUserId || `dev:${context.user.id}`,
    scout: context.scout,
    user: context.user,
  }
}

export async function getScoutAuthContext(payload: Payload): Promise<ScoutAuthContext | null> {
  const resolved = await resolveUser(payload)

  if (resolved && hasScoutRole(resolved.user)) {
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

    let scout = scoutResult.docs[0] as Scout | undefined

    if (!scout && resolved.user.email) {
      // First login for a scout whose record came from the RallyUp import:
      // link it by email instead of requiring an admin to do it by hand.
      const unlinkedByEmail = await payload.find({
        collection: 'scouts',
        depth: 0,
        limit: 1,
        where: {
          and: [
            {
              email: {
                equals: resolved.user.email,
              },
            },
            {
              user: {
                exists: false,
              },
            },
          ],
        },
      })

      const unlinkedScout = unlinkedByEmail.docs[0] as Scout | undefined

      if (unlinkedScout) {
        scout = (await payload.update({
          collection: 'scouts',
          id: unlinkedScout.id,
          data: {
            user: resolved.user.id,
          },
        })) as Scout
      }
    }

    if (scout) {
      return {
        clerkUserId: resolved.clerkUserId,
        scout,
        user: resolved.user,
      }
    }
  }

  return getDevScoutAuthContext(payload)
}

export async function requireScoutAuthContext(payload: Payload) {
  const context = await getScoutAuthContext(payload)

  if (!context) {
    const requestHeaders = await headers()
    const host = requestHeaders.get('x-forwarded-host') ?? requestHeaders.get('host')
    const proto = requestHeaders.get('x-forwarded-proto') ?? 'https'
    const pathname = requestHeaders.get('x-pathname') ?? requestHeaders.get('x-invoke-path') ?? '/'
    const returnBackUrl = host ? `${proto}://${host}${pathname}` : null

    if (isDevAuthEnabled()) {
      const devLoginUrl = new URL('/dev/login', returnBackUrl || 'http://localhost:3000')
      if (returnBackUrl) {
        devLoginUrl.searchParams.set('returnBackUrl', returnBackUrl)
      }
      redirect(devLoginUrl.toString())
    }

    redirect(buildSignInRedirectUrl(returnBackUrl))
  }

  return context
}
