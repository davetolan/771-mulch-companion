import { NextResponse } from 'next/server'
import { getPayload } from 'payload'

import {
  getSvixHeaders,
  parseClerkUserEvent,
  verifySvixSignature,
} from '@/lib/clerkWebhook'
import { processClerkWebhookEvent } from '@/lib/clerkWebhookHandler'
import config from '@payload-config'

export async function POST(request: Request) {
  const secret = process.env.CLERK_WEBHOOK_SIGNING_SECRET?.trim()
  if (!secret) {
    console.error('[clerk-webhook] Missing CLERK_WEBHOOK_SIGNING_SECRET environment variable.')
    return NextResponse.json({ error: 'Webhook endpoint is not configured.' }, { status: 500 })
  }

  const body = await request.text()
  const svixHeaders = getSvixHeaders(request.headers)

  if (!svixHeaders) {
    console.warn('[clerk-webhook] Missing required Svix headers.')
    return NextResponse.json({ error: 'Missing webhook signature headers.' }, { status: 400 })
  }

  const signatureCheck = verifySvixSignature({ body, headers: svixHeaders, secret })
  if (!signatureCheck.ok) {
    if (signatureCheck.reason === 'stale') {
      console.warn(`[clerk-webhook] Replayed or stale webhook rejected: ${svixHeaders.svixId}`)
    } else {
      console.warn(`[clerk-webhook] Signature verification failed: ${svixHeaders.svixId}`)
    }
    return NextResponse.json({ error: 'Invalid webhook signature.' }, { status: 400 })
  }

  const event = parseClerkUserEvent(body)
  if (!event) {
    console.warn(`[clerk-webhook] Ignoring unsupported or malformed event: ${svixHeaders.svixId}`)
    return NextResponse.json({ received: true, ignored: true }, { status: 200 })
  }

  const payload = await getPayload({ config })

  try {
    const result = await processClerkWebhookEvent({
      event,
      payload,
      svixId: svixHeaders.svixId,
    })

    if (result.duplicate) {
      console.info(`[clerk-webhook] Duplicate webhook ignored: ${svixHeaders.svixId}`)
      return NextResponse.json({ received: true, duplicate: true }, { status: 200 })
    }

    console.info(`[clerk-webhook] Processed ${event.type} for ${event.user.id}`)
    return NextResponse.json({ received: true }, { status: 200 })
  } catch (error) {
    console.error(`[clerk-webhook] Failed processing ${event.type} for ${event.user.id}`, error)
    return NextResponse.json({ error: 'Unable to sync Clerk user.' }, { status: 500 })
  }
}
