import { NextResponse } from 'next/server'
import { createLocalReq, getPayload } from 'payload'

import { getScoutSession } from '@/utilities/getScoutSession'
import config from '@payload-config'

export async function POST(request: Request) {
  const payload = await getPayload({ config })

  try {
    const { user, scout } = await getScoutSession({
      headers: new Headers(request.headers),
      payload,
    })

    const body = await request.json()
    const currentCampaignId = Number(body?.currentCampaignId)
    const previousCampaignId = Number(body?.previousCampaignId)
    const subjectTemplate = String(body?.subjectTemplate || '').trim()
    const bodyTemplate = String(body?.bodyTemplate || '').trim()

    if (!currentCampaignId || !previousCampaignId || !subjectTemplate || !bodyTemplate) {
      return NextResponse.json({ message: 'Missing required draft fields' }, { status: 400 })
    }

    const req = await createLocalReq({ user }, payload)

    const existing = await payload.find({
      collection: 'scout-email-campaigns',
      depth: 0,
      limit: 1,
      overrideAccess: false,
      req,
      where: {
        and: [
          {
            scout: {
              equals: scout.id,
            },
          },
          {
            currentCampaign: {
              equals: currentCampaignId,
            },
          },
          {
            previousCampaign: {
              equals: previousCampaignId,
            },
          },
        ],
      },
    })

    const savedDraft =
      existing.docs[0] != null
        ? await payload.update({
            collection: 'scout-email-campaigns',
            id: existing.docs[0].id,
            data: {
              bodyTemplate,
              subjectTemplate,
            },
            overrideAccess: false,
            req,
          })
        : await payload.create({
            collection: 'scout-email-campaigns',
            data: {
              scout: scout.id,
              currentCampaign: currentCampaignId,
              previousCampaign: previousCampaignId,
              bodyTemplate,
              subjectTemplate,
            },
            overrideAccess: false,
            req,
          })

    return NextResponse.json({
      draft: {
        bodyTemplate: savedDraft.bodyTemplate,
        id: savedDraft.id,
        subjectTemplate: savedDraft.subjectTemplate,
      },
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to save outreach draft'
    return NextResponse.json({ message }, { status: 500 })
  }
}
