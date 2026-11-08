import type { Payload } from 'payload'

import type { Scout, User } from '@/payload-types'

export const DEV_AUTH_COOKIE_NAME = 'mulch-dev-auth'
const DEV_AUTH_TTL_MS = 1000 * 60 * 60 * 12

type DevAuthPayload = {
  expiresAt: number
  userId: number | string
}

export type DevAuthContext = {
  scout: Scout
  user: User
}

function base64UrlEncode(value: string | Uint8Array) {
  const base64 =
    typeof value === 'string'
      ? typeof btoa === 'function'
        ? btoa(value)
        : Buffer.from(value, 'utf8').toString('base64')
      : typeof btoa === 'function'
        ? btoa(String.fromCharCode(...value))
        : Buffer.from(value).toString('base64')

  return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '')
}

function base64UrlDecode(value: string) {
  const base64 = value.replace(/-/g, '+').replace(/_/g, '/')
  const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), '=')

  if (typeof atob === 'function') {
    return atob(padded)
  }

  return Buffer.from(padded, 'base64').toString('utf8')
}

function getDevAuthSecret() {
  return process.env.MULCH_DEV_AUTH_SECRET?.trim() || process.env.PAYLOAD_SECRET?.trim() || ''
}

export function isDevAuthEnabled() {
  return process.env.NODE_ENV !== 'production' && process.env.MULCH_DEV_AUTH_ENABLED === 'true'
}

function timingSafeStringEqual(left: string, right: string) {
  if (left.length !== right.length) return false

  let result = 0
  for (let index = 0; index < left.length; index += 1) {
    result |= left.charCodeAt(index) ^ right.charCodeAt(index)
  }

  return result === 0
}

async function signPayload(encodedPayload: string) {
  const secret = getDevAuthSecret()
  if (!secret) {
    throw new Error('MULCH_DEV_AUTH_SECRET or PAYLOAD_SECRET is required for dev auth.')
  }

  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { hash: 'SHA-256', name: 'HMAC' },
    false,
    ['sign'],
  )
  const signature = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(encodedPayload))

  return base64UrlEncode(new Uint8Array(signature))
}

export async function createDevAuthCookieValue(userId: number | string) {
  if (!isDevAuthEnabled()) {
    throw new Error('Dev auth is not enabled.')
  }

  const payload: DevAuthPayload = {
    expiresAt: Date.now() + DEV_AUTH_TTL_MS,
    userId,
  }
  const encodedPayload = base64UrlEncode(JSON.stringify(payload))
  const signature = await signPayload(encodedPayload)

  return `${encodedPayload}.${signature}`
}

export async function verifyDevAuthCookieValue(value: string | null | undefined) {
  if (!isDevAuthEnabled() || !value) {
    return null
  }

  const [encodedPayload, signature, extra] = value.split('.')
  if (!encodedPayload || !signature || extra) {
    return null
  }

  const expectedSignature = await signPayload(encodedPayload)
  if (!timingSafeStringEqual(signature, expectedSignature)) {
    return null
  }

  let payload: DevAuthPayload

  try {
    payload = JSON.parse(base64UrlDecode(encodedPayload)) as DevAuthPayload
  } catch {
    return null
  }

  if (
    !payload ||
    typeof payload !== 'object' ||
    (typeof payload.userId !== 'number' && typeof payload.userId !== 'string') ||
    typeof payload.expiresAt !== 'number' ||
    payload.expiresAt < Date.now()
  ) {
    return null
  }

  return payload
}

export async function resolveDevAuthContext(
  payload: Payload,
  cookieValue: string | null | undefined,
): Promise<DevAuthContext | null> {
  const devAuthPayload = await verifyDevAuthCookieValue(cookieValue)
  if (!devAuthPayload) return null

  const userResult = await payload.find({
    collection: 'users',
    depth: 0,
    limit: 1,
    where: {
      id: {
        equals: devAuthPayload.userId,
      },
    },
  })

  const user = userResult.docs[0] as User | undefined
  if (!user?.roles?.includes('scout')) {
    return null
  }

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

  const scout = scoutResult.docs[0] as Scout | undefined
  if (!scout) {
    return null
  }

  return { scout, user }
}
