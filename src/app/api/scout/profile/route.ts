import { NextResponse } from 'next/server'
import { createLocalReq, getPayload } from 'payload'

import { getScoutSession } from '@/utilities/getScoutSession'
import config from '@payload-config'

export async function POST(request: Request) {
  const payload = await getPayload({ config })

  try {
    const { scout, user } = await getScoutSession({
      headers: new Headers(request.headers),
      payload,
    })

    const body = await request.json()
    const flyerEmail =
      typeof body?.flyerEmail === 'string' ? body.flyerEmail.trim().toLowerCase() : ''
    const flyerPhone = typeof body?.flyerPhone === 'string' ? body.flyerPhone.trim() : ''

    const req = await createLocalReq({ user }, payload)

    const updatedScout = await payload.update({
      collection: 'scouts',
      id: scout.id,
      data: {
        flyerEmail: flyerEmail || null,
        flyerPhone: flyerPhone || '',
      },
      overrideAccess: false,
      req,
    })

    return NextResponse.json({
      scout: {
        flyerEmail: updatedScout.flyerEmail || '',
        flyerPhone: updatedScout.flyerPhone || '',
        id: updatedScout.id,
      },
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to update scout profile'
    return NextResponse.json({ message }, { status: 500 })
  }
}
