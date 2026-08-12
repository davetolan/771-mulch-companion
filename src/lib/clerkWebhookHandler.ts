import type { Payload } from 'payload'

import type { ClerkUserEvent } from './clerkWebhook'
import { syncClerkUser } from './clerkUserSync'

function isUniqueConstraintError(error: unknown) {
  if (!error || typeof error !== 'object') return false

  const record = error as { code?: unknown; message?: unknown }
  const message = typeof record.message === 'string' ? record.message.toLowerCase() : ''

  return (
    record.code === '23505' ||
    record.code === 'P2002' ||
    message.includes('unique') ||
    message.includes('duplicate')
  )
}

export async function processClerkWebhookEvent({
  event,
  payload,
  svixId,
}: {
  event: ClerkUserEvent
  payload: Payload
  svixId: string
}) {
  let ledgerEntryId: number | string

  try {
    const ledgerEntry = await payload.create({
      collection: 'clerk-webhook-events',
      data: {
        eventId: event.id,
        eventType: event.type,
        status: 'received',
        svixId,
      },
    })
    ledgerEntryId = ledgerEntry.id
  } catch (error) {
    if (isUniqueConstraintError(error)) {
      return { duplicate: true as const }
    }

    throw error
  }

  try {
    await syncClerkUser(payload, {
      clerkUserId: event.user.id,
      email: event.user.email,
      name: event.user.name,
    })

    await payload.update({
      collection: 'clerk-webhook-events',
      id: ledgerEntryId,
      data: {
        processedAt: new Date().toISOString(),
        status: 'processed',
      },
    })

    return { duplicate: false as const }
  } catch (error) {
    await payload.update({
      collection: 'clerk-webhook-events',
      id: ledgerEntryId,
      data: {
        status: 'failed',
      },
    })

    throw error
  }
}
