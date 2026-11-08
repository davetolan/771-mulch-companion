import { beforeEach, describe, expect, it, vi } from 'vitest'

import { buildSignInRedirectUrl, getSignInUrl, getSignUpUrl } from '@/lib/authUrls'
import { isClerkProtectedPath } from '@/lib/authGuards'
import { syncClerkUser } from '@/lib/clerkUserSync'
import { processClerkWebhookEvent } from '@/lib/clerkWebhookHandler'
import type { ClerkUserEvent } from '@/lib/clerkWebhook'
import {
  createDevAuthCookieValue,
  isDevAuthEnabled,
  resolveDevAuthContext,
  verifyDevAuthCookieValue,
} from '@/lib/devAuth'

const ORIGINAL_ENV = process.env

function makePayloadWithUsers(initialUsers: any[]) {
  const users = [...initialUsers]
  const calls: { create: any[]; update: any[] } = { create: [], update: [] }

  const payload = {
    create: vi.fn(async (args: any) => {
      calls.create.push(args)

      if (args.collection === 'users') {
        const created = { id: users.length + 1, ...args.data }
        users.push(created)
        return created
      }

      return { id: args.data?.svixId ?? calls.create.length, ...args.data }
    }),
    find: vi.fn(async (args: any) => {
      if (args.collection !== 'users') return { docs: [] }

      const where = args.where
      let match: any | undefined

      if (where?.clerkUserId?.equals) {
        match = users.find((user) => user.clerkUserId === where.clerkUserId.equals)
      } else if (where?.email?.equals) {
        match = users.find((user) => user.email === where.email.equals)
      } else if (Array.isArray(where?.or)) {
        match = users.find((user) =>
          where.or.some(
            (condition: any) =>
              user.clerkUserId === condition.clerkUserId?.equals ||
              user.email === condition.email?.equals,
          ),
        )
      }

      return { docs: match ? [match] : [] }
    }),
    update: vi.fn(async (args: any) => {
      calls.update.push(args)
      const index = users.findIndex((user) => user.id === args.id)

      if (index >= 0) {
        users[index] = { ...users[index], ...args.data }
        return users[index]
      }

      return { id: args.id, ...args.data }
    }),
  }

  return { calls, payload: payload as any, users }
}

function makePayloadWithDevAuthRecords({
  scouts,
  users,
}: {
  scouts: any[]
  users: any[]
}) {
  const payload = {
    find: vi.fn(async (args: any) => {
      if (args.collection === 'users') {
        const match = users.find((user) => String(user.id) === String(args.where?.id?.equals))
        return { docs: match ? [match] : [] }
      }

      if (args.collection === 'scouts') {
        const match = scouts.find((scout) => String(scout.user) === String(args.where?.user?.equals))
        return { docs: match ? [match] : [] }
      }

      return { docs: [] }
    }),
  }

  return payload as any
}

describe('Clerk auth URL helpers', () => {
  beforeEach(() => {
    vi.resetModules()
    process.env = { ...ORIGINAL_ENV }
    delete process.env.NEXT_PUBLIC_CLERK_SIGN_IN_URL
    delete process.env.NEXT_PUBLIC_CLERK_SIGN_UP_URL
  })

  it('falls back to the shared auth domain', () => {
    expect(getSignInUrl()).toBe('https://auth.troop771.com/sign-in')
    expect(getSignUpUrl()).toBe('https://auth.troop771.com/sign-up')
  })

  it('uses configured URLs and preserves allowed return URLs', () => {
    process.env.NEXT_PUBLIC_CLERK_SIGN_IN_URL = 'https://auth.troop771.com/sign-in'

    expect(buildSignInRedirectUrl('https://mulch.troop771.com/dashboard')).toBe(
      'https://auth.troop771.com/sign-in?redirect_url=https%3A%2F%2Fmulch.troop771.com%2Fdashboard',
    )
  })

  it('drops untrusted return URLs', () => {
    expect(buildSignInRedirectUrl('https://example.com/dashboard')).toBe(
      'https://auth.troop771.com/sign-in',
    )
  })
})

describe('Clerk protected route matching', () => {
  it('matches scout-facing protected paths', () => {
    expect(isClerkProtectedPath('/dashboard')).toBe(true)
    expect(isClerkProtectedPath('/dashboard/orders')).toBe(true)
    expect(isClerkProtectedPath('/api/scout/profile')).toBe(true)
    expect(isClerkProtectedPath('/api/scout/outreach/send')).toBe(true)
  })

  it('does not match public or Payload admin paths', () => {
    expect(isClerkProtectedPath('/')).toBe(false)
    expect(isClerkProtectedPath('/login')).toBe(false)
    expect(isClerkProtectedPath('/admin')).toBe(false)
    expect(isClerkProtectedPath('/api/scout/login')).toBe(false)
  })
})

describe('dev auth', () => {
  beforeEach(() => {
    vi.useRealTimers()
    vi.unstubAllEnvs()
    vi.stubEnv('NODE_ENV', 'test')
    vi.stubEnv('MULCH_DEV_AUTH_ENABLED', 'true')
    vi.stubEnv('MULCH_DEV_AUTH_SECRET', 'test-dev-secret')
  })

  it('is disabled in production even when the env flag is set', () => {
    vi.stubEnv('NODE_ENV', 'production')
    expect(isDevAuthEnabled()).toBe(false)
  })

  it('verifies valid cookies and rejects tampered cookies', async () => {
    const cookieValue = await createDevAuthCookieValue(42)

    await expect(verifyDevAuthCookieValue(cookieValue)).resolves.toMatchObject({ userId: 42 })
    await expect(verifyDevAuthCookieValue(`${cookieValue}tampered`)).resolves.toBeNull()
  })

  it('rejects expired cookies', async () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-01-01T00:00:00Z'))
    const cookieValue = await createDevAuthCookieValue(42)

    vi.setSystemTime(new Date('2026-01-01T13:00:00Z'))

    await expect(verifyDevAuthCookieValue(cookieValue)).resolves.toBeNull()
  })

  it('resolves a local scout-linked user from a valid dev cookie', async () => {
    const cookieValue = await createDevAuthCookieValue(7)
    const payload = makePayloadWithDevAuthRecords({
      scouts: [{ id: 22, displayName: 'Local Scout', user: 7 }],
      users: [{ id: 7, email: 'scout@example.com', name: 'Local Scout', roles: ['scout'] }],
    })

    await expect(resolveDevAuthContext(payload, cookieValue)).resolves.toMatchObject({
      scout: { id: 22 },
      user: { id: 7 },
    })
  })

  it('rejects valid dev cookies for users without a linked scout record', async () => {
    const cookieValue = await createDevAuthCookieValue(7)
    const payload = makePayloadWithDevAuthRecords({
      scouts: [],
      users: [{ id: 7, email: 'scout@example.com', name: 'Local Scout', roles: ['scout'] }],
    })

    await expect(resolveDevAuthContext(payload, cookieValue)).resolves.toBeNull()
  })
})

describe('Clerk local user sync', () => {
  it('updates an existing local user by Clerk ID', async () => {
    const { payload } = makePayloadWithUsers([
      { id: 12, clerkUserId: 'user_123', email: 'old@example.com', name: 'Old Name' },
    ])

    const user = await syncClerkUser(payload, {
      clerkUserId: 'user_123',
      email: 'SCOUT@example.com',
      name: 'Scout Name',
    })

    expect(user).toMatchObject({
      id: 12,
      clerkUserId: 'user_123',
      email: 'scout@example.com',
      name: 'Scout Name',
    })
    expect(payload.create).not.toHaveBeenCalled()
  })

  it('links an existing local user by email', async () => {
    const { payload } = makePayloadWithUsers([
      { id: 9, email: 'scout@example.com', name: 'Scout Existing', roles: ['scout'] },
    ])

    const user = await syncClerkUser(payload, {
      clerkUserId: 'user_999',
      email: 'scout@example.com',
      name: 'Scout Updated',
    })

    expect(user).toMatchObject({
      id: 9,
      clerkUserId: 'user_999',
      email: 'scout@example.com',
      name: 'Scout Updated',
    })
  })

  it('creates a scout local user without password data', async () => {
    const { calls, payload } = makePayloadWithUsers([])

    await syncClerkUser(payload, {
      clerkUserId: 'user_new',
      email: 'new@example.com',
      name: 'New Scout',
    })

    expect(calls.create[0].data).toEqual({
      clerkUserId: 'user_new',
      email: 'new@example.com',
      name: 'New Scout',
      roles: ['scout'],
    })
    expect(calls.create[0].data).not.toHaveProperty('password')
  })
})

describe('Clerk webhook duplicate handling', () => {
  const event: ClerkUserEvent = {
    id: 'evt_123',
    type: 'user.updated',
    user: {
      id: 'user_123',
      email: 'scout@example.com',
      name: 'Scout Name',
    },
  }

  it('does not resync when the Svix ledger insert is duplicate', async () => {
    const duplicateError = Object.assign(new Error('duplicate key value violates unique constraint'), {
      code: '23505',
    })
    const payload = {
      create: vi.fn(async () => {
        throw duplicateError
      }),
      find: vi.fn(),
      update: vi.fn(),
    }

    const result = await processClerkWebhookEvent({
      event,
      payload: payload as any,
      svixId: 'msg_duplicate',
    })

    expect(result).toEqual({ duplicate: true })
    expect(payload.find).not.toHaveBeenCalled()
    expect(payload.update).not.toHaveBeenCalled()
  })
})
