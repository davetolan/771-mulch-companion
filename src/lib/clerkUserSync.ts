import type { Payload } from 'payload'

import type { User } from '@/payload-types'
import { normalizeEmail, normalizeName } from './clerkUser'

export type SyncClerkUserInput = {
  clerkUserId: string
  email: string
  name: string
}

function isUniqueConstraintError(error: unknown) {
  if (!error || typeof error !== 'object') return false

  const record = error as { code?: unknown; name?: unknown; message?: unknown }
  const message = typeof record.message === 'string' ? record.message.toLowerCase() : ''

  return (
    record.code === '23505' ||
    record.code === 'P2002' ||
    message.includes('unique') ||
    message.includes('duplicate')
  )
}

async function findUserByClerkUserId(payload: Payload, clerkUserId: string) {
  const result = await payload.find({
    collection: 'users',
    depth: 0,
    limit: 1,
    where: {
      clerkUserId: {
        equals: clerkUserId,
      },
    },
  })

  return result.docs[0] as User | undefined
}

async function findUserByEmail(payload: Payload, email: string) {
  const result = await payload.find({
    collection: 'users',
    depth: 0,
    limit: 1,
    where: {
      email: {
        equals: email,
      },
    },
  })

  return result.docs[0] as User | undefined
}

async function findUserByClerkUserIdOrEmail(payload: Payload, clerkUserId: string, email: string) {
  const result = await payload.find({
    collection: 'users',
    depth: 0,
    limit: 1,
    where: {
      or: [
        {
          clerkUserId: {
            equals: clerkUserId,
          },
        },
        {
          email: {
            equals: email,
          },
        },
      ],
    },
  })

  return result.docs[0] as User | undefined
}

export async function syncClerkUser(
  payload: Payload,
  { clerkUserId, email, name }: SyncClerkUserInput,
) {
  const normalizedClerkUserId = clerkUserId.trim()
  const normalizedEmail = normalizeEmail(email)
  const normalizedName = normalizeName(name)

  if (!normalizedClerkUserId || !normalizedEmail || !normalizedName) {
    throw new Error('clerkUserId, email, and name are required to sync a Clerk user.')
  }

  const existingByClerkId = await findUserByClerkUserId(payload, normalizedClerkUserId)

  if (existingByClerkId) {
    return payload.update({
      collection: 'users',
      id: existingByClerkId.id,
      data: {
        email: normalizedEmail,
        name: normalizedName,
      },
    })
  }

  const existingByEmail = await findUserByEmail(payload, normalizedEmail)

  if (existingByEmail) {
    return payload.update({
      collection: 'users',
      id: existingByEmail.id,
      data: {
        clerkUserId: normalizedClerkUserId,
        name: normalizedName,
      },
    })
  }

  try {
    return await payload.create({
      collection: 'users',
      data: {
        clerkUserId: normalizedClerkUserId,
        email: normalizedEmail,
        name: normalizedName,
        roles: ['scout'],
      },
    })
  } catch (error) {
    if (!isUniqueConstraintError(error)) {
      throw error
    }

    const userCreatedByConcurrentSync = await findUserByClerkUserIdOrEmail(
      payload,
      normalizedClerkUserId,
      normalizedEmail,
    )

    if (!userCreatedByConcurrentSync) {
      throw error
    }

    return payload.update({
      collection: 'users',
      id: userCreatedByConcurrentSync.id,
      data: {
        clerkUserId: normalizedClerkUserId,
        email: normalizedEmail,
        name: normalizedName,
      },
    })
  }
}
