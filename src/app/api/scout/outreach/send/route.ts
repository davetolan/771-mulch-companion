import { NextResponse } from 'next/server'
import { createLocalReq, getPayload } from 'payload'

import { getScoutSession } from '@/utilities/getScoutSession'
import { renderEmailTemplate } from '@/utilities/renderEmailTemplate'
import { sendWithResend } from '@/utilities/sendWithResend'
import config from '@payload-config'

type CustomerRecord = {
  email: string
  id: number
  name: string
  previousOrder: string
}

const getCustomerFirstName = (name: string) => {
  const [firstName] = name.trim().split(/\s+/)
  return firstName || name
}

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
    const customerIds = Array.isArray(body?.customerIds)
      ? body.customerIds.map((value: unknown) => Number(value)).filter((value: number) => value > 0)
      : []
    const subjectTemplate = String(body?.subjectTemplate || '').trim()
    const bodyTemplate = String(body?.bodyTemplate || '').trim()

    if (
      !currentCampaignId ||
      !previousCampaignId ||
      customerIds.length === 0 ||
      !subjectTemplate ||
      !bodyTemplate
    ) {
      return NextResponse.json({ message: 'Missing required send fields' }, { status: 400 })
    }

    const req = await createLocalReq({ user }, payload)

    const [currentCampaign, previousCampaign, ordersResult, existingDraft] = await Promise.all([
      payload.findByID({
        collection: 'campaigns',
        id: currentCampaignId,
        depth: 0,
        overrideAccess: false,
        req,
      }),
      payload.findByID({
        collection: 'campaigns',
        id: previousCampaignId,
        depth: 0,
        overrideAccess: false,
        req,
      }),
      payload.find({
        collection: 'orders',
        depth: 2,
        limit: 500,
        overrideAccess: false,
        req,
        where: {
          and: [
            {
              campaign: {
                equals: previousCampaignId,
              },
            },
            {
              customer: {
                in: customerIds,
              },
            },
          ],
        },
      }),
      payload.find({
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
      }),
    ])

    const previousCustomersMap = new Map<number, CustomerRecord>()

    for (const order of ordersResult.docs) {
      if (
        typeof order.customer !== 'object' ||
        order.customer === null ||
        typeof order.customer.id !== 'number' ||
        typeof order.customer.email !== 'string' ||
        typeof order.customer.name !== 'string'
      ) {
        continue
      }

      const previousOrder = (order.items || [])
        .map((item) => {
          const productName =
            typeof item.product === 'object' && item.product !== null && 'name' in item.product
              ? String(item.product.name)
              : 'Product'

          return `${productName} x${item.count}`
        })
        .join(', ')

      previousCustomersMap.set(order.customer.id, {
        email: order.customer.email,
        id: order.customer.id,
        name: order.customer.name,
        previousOrder,
      })
    }

    const previousCustomers = Array.from(previousCustomersMap.values())

    if (previousCustomers.length === 0) {
      return NextResponse.json({ message: 'No eligible customers found to send to' }, { status: 400 })
    }

    const outreachDraft =
      existingDraft.docs[0] != null
        ? await payload.update({
            collection: 'scout-email-campaigns',
            id: existingDraft.docs[0].id,
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

    const fromEmail = process.env.RESEND_FROM_EMAIL

    if (!fromEmail) {
      return NextResponse.json({ message: 'Missing RESEND_FROM_EMAIL' }, { status: 500 })
    }

    let sentCount = 0
    let failedCount = 0

    for (const customer of previousCustomers) {
      const rendered = renderEmailTemplate({
        campaignName: currentCampaign.name,
        campaignSeason: currentCampaign.season,
        customerFirstName: getCustomerFirstName(customer.name),
        customerName: customer.name,
        deliveryDate: currentCampaign.deliveryDate,
        fundraisingUrl: scout.externalFundraisingUrl,
        previousCampaignName: previousCampaign.name,
        previousCampaignSeason: previousCampaign.season,
        previousOrder: customer.previousOrder,
        saleEndDate: currentCampaign.saleEndDate,
        scoutName: scout.displayName,
        template: {
          body: bodyTemplate,
          subject: subjectTemplate,
        },
      })

      const sentAt = new Date().toISOString()

      try {
        const resendEmailId = await sendWithResend({
          from: fromEmail,
          replyTo: scout.email,
          subject: rendered.subject,
          text: rendered.body,
          to: customer.email,
        })

        await payload.create({
          collection: 'scout-email-send-logs',
          data: {
            body: rendered.body,
            currentCampaign: currentCampaign.id,
            customer: customer.id,
            emailCampaign: outreachDraft.id,
            previousCampaign: previousCampaign.id,
            recipientEmail: customer.email,
            resendEmailId,
            scout: scout.id,
            sentAt,
            status: 'sent',
            subject: rendered.subject,
          },
          overrideAccess: false,
          req,
        })

        sentCount += 1
      } catch (error) {
        await payload.create({
          collection: 'scout-email-send-logs',
          data: {
            body: rendered.body,
            currentCampaign: currentCampaign.id,
            customer: customer.id,
            emailCampaign: outreachDraft.id,
            errorMessage: error instanceof Error ? error.message : 'Send failed',
            previousCampaign: previousCampaign.id,
            recipientEmail: customer.email,
            scout: scout.id,
            sentAt,
            status: 'failed',
            subject: rendered.subject,
          },
          overrideAccess: false,
          req,
        })

        failedCount += 1
      }
    }

    return NextResponse.json({
      failedCount,
      sentCount,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to send outreach emails'
    return NextResponse.json({ message }, { status: 500 })
  }
}
