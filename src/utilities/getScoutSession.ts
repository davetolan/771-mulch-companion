import type { Payload } from 'payload'

import { getScoutAuthContext } from '@/lib/serverAuth'

export const getScoutSession = async ({
  payload,
}: {
  payload: Payload
}) => {
  const context = await getScoutAuthContext(payload)

  if (!context) {
    throw new Error('Scout authentication required')
  }

  return context
}
