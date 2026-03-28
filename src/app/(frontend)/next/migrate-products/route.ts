import { createLocalReq, getPayload } from 'payload'
import { headers } from 'next/headers'

import { migrateProducts } from '@/endpoints/migrations/products'
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
    const createdCount = await migrateProducts({ payload, req })

    return new Response(JSON.stringify({ success: true, createdCount }), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    })
  } catch (error) {
    payload.logger.error({ err: error, message: 'Products migration failed' })
    return new Response(JSON.stringify({ success: false, error: 'Migration failed' }), {
      status: 500,
      headers: { 'content-type': 'application/json' },
    })
  }
}
