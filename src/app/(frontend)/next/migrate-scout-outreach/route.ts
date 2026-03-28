import { createLocalReq, getPayload } from 'payload'
import { headers } from 'next/headers'

import { migrateScoutOutreach } from '@/endpoints/migrations/scoutOutreach'
import config from '@payload-config'

export const maxDuration = 60

export async function POST() {
  const payload = await getPayload({ config })
  const requestHeaders = await headers()

  const { user } = await payload.auth({ headers: requestHeaders })

  if (!user) {
    return new Response('Action forbidden.', { status: 403 })
  }

  try {
    const req = await createLocalReq({ user }, payload)
    const result = await migrateScoutOutreach({ payload, req })

    return new Response(JSON.stringify({ success: true, ...result }), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    })
  } catch (error) {
    payload.logger.error({ err: error, message: 'Scout outreach migration failed' })
    return new Response(JSON.stringify({ success: false, error: 'Migration failed' }), {
      status: 500,
      headers: { 'content-type': 'application/json' },
    })
  }
}
