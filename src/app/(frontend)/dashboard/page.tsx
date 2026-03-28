import { getPayload } from 'payload'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import config from '@/payload.config'

import { ScoutDashboard } from '@/components/ScoutDashboard'

const summarizePreviousOrder = (
  items:
    | {
        count: number
        id?: string | null
        product: number | { name: string }
      }[]
    | null
    | undefined,
) => {
  return (items || [])
    .map((item) => {
      const productName =
        typeof item.product === 'object' && item.product !== null && 'name' in item.product
          ? String(item.product.name)
          : 'Product'

      return `${productName} x${item.count}`
    })
    .join(', ')
}

export default async function DashboardPage() {
  const payload = await getPayload({ config })
  const cookieStore = await cookies()
  const token = cookieStore.get('payload-token')?.value

  if (!token) {
    redirect('/login')
  }

  try {
    // Verify the user is authenticated
    const headers = new Headers()
    headers.set('authorization', `JWT ${token}`)
    const { user } = await payload.auth({ headers })

    if (!user || !user.roles?.includes('scout')) {
      redirect('/login')
    }

    // Find the scout record associated with this user
    const scout = await payload.find({
      collection: 'scouts',
      where: {
        user: {
          equals: user.id,
        },
      },
      limit: 1,
    })

    if (!scout.docs.length) {
      // Scout record not found - redirect to admin or show error
      redirect('/admin')
    }

    // Get the active campaign
    const activeCampaign = await payload.find({
      collection: 'campaigns',
      where: {
        active: {
          equals: true,
        },
      },
      limit: 1,
    })

    const currentCampaign = activeCampaign.docs[0] || null

    const previousCampaignResult = currentCampaign
      ? await payload.find({
          collection: 'campaigns',
          where: {
            and: [
              {
                id: {
                  not_equals: currentCampaign.id,
                },
              },
              {
                saleEndDate: {
                  less_than: currentCampaign.saleStartDate,
                },
              },
            ],
          },
          sort: '-saleEndDate',
          limit: 1,
        })
      : { docs: [] }

    const previousCampaign = previousCampaignResult.docs[0] || null

    const emailTemplateResult = await payload.find({
      collection: 'email-templates',
      where: {
        and: [
          {
            active: {
              equals: true,
            },
          },
          {
            purpose: {
              equals: 'previous-campaign-outreach',
            },
          },
        ],
      },
      sort: '-updatedAt',
      limit: 1,
    })

    const emailTemplate = emailTemplateResult.docs[0] || null

    const existingDraftResult =
      currentCampaign && previousCampaign
        ? await payload.find({
            collection: 'scout-email-campaigns',
            depth: 0,
            limit: 1,
            where: {
              and: [
                {
                  scout: {
                    equals: scout.docs[0].id,
                  },
                },
                {
                  currentCampaign: {
                    equals: currentCampaign.id,
                  },
                },
                {
                  previousCampaign: {
                    equals: previousCampaign.id,
                  },
                },
              ],
            },
          })
        : { docs: [] }

    const existingDraft = existingDraftResult.docs[0] || null

    const scoutCustomers = await payload.find({
      collection: 'customers',
      depth: 0,
      limit: 200,
      where: {
        scout: {
          equals: scout.docs[0].id,
        },
      },
    })

    const customerIds = scoutCustomers.docs.map((customer) => customer.id)

    const previousCampaignOrders =
      previousCampaign && customerIds.length > 0
        ? await payload.find({
            collection: 'orders',
            depth: 1,
            limit: 200,
            where: {
              and: [
                {
                  campaign: {
                    equals: previousCampaign.id,
                  },
                },
                {
                  customer: {
                    in: customerIds,
                  },
                },
              ],
            },
          })
        : { docs: [] }

    const previousCampaignCustomers = Array.from(
      new Map(
        previousCampaignOrders.docs.flatMap((order) => {
          const customer = order.customer

          if (
            typeof customer !== 'object' ||
            customer === null ||
            typeof customer.id !== 'number' ||
            typeof customer.email !== 'string' ||
            customer.email.length === 0 ||
            typeof customer.name !== 'string'
          ) {
            return []
          }

          return [
            [
              customer.id,
              {
                email: customer.email,
                id: customer.id,
                name: customer.name,
                previousOrder: summarizePreviousOrder(order.items),
              },
            ] as const,
          ]
        }),
      ).values(),
    )

    const sendHistoryResult =
      currentCampaign
        ? await payload.find({
            collection: 'scout-email-send-logs',
            depth: 1,
            limit: 100,
            sort: '-sentAt',
            where: {
              and: [
                {
                  scout: {
                    equals: scout.docs[0].id,
                  },
                },
                {
                  currentCampaign: {
                    equals: currentCampaign.id,
                  },
                },
              ],
            },
          })
        : { docs: [] }

    const latestSendByCustomer = new Map(
      sendHistoryResult.docs.flatMap((log) => {
        const customer = log.customer

        if (
          typeof customer !== 'object' ||
          customer === null ||
          typeof customer.id !== 'number' ||
          !log.sentAt
        ) {
          return []
        }

        return [[customer.id, { sentAt: log.sentAt, status: log.status }]] as const
      }),
    )

    const previousCampaignRecipients = previousCampaignCustomers.map((customer) => ({
      ...customer,
      lastSentAt: latestSendByCustomer.get(customer.id)?.sentAt ?? null,
      lastSentStatus: latestSendByCustomer.get(customer.id)?.status ?? null,
    }))

    const recentSendHistory = sendHistoryResult.docs.flatMap((log) => {
      const customer = log.customer

      if (
        typeof customer !== 'object' ||
        customer === null ||
        typeof customer.id !== 'number' ||
        typeof customer.name !== 'string'
      ) {
        return []
      }

      return [
        {
          customerId: customer.id,
          customerName: customer.name,
          id: log.id,
          recipientEmail: log.recipientEmail,
          sentAt: log.sentAt,
          status: log.status,
          subject: log.subject,
        },
      ]
    })

    const outreachDraft =
      currentCampaign && previousCampaign
        ? {
            bodyTemplate:
              emailTemplate?.body ||
              existingDraft?.bodyTemplate ||
              'Hi {{customerFirstName}},\n\nThank you for supporting {{previousCampaignName}}. I would love your support again for {{campaignName}}.\n\nYour previous order: {{previousOrder}}\n\nOrder here: {{fundraisingUrl}}\nOrders close on {{saleEndDate}}.\n\nThank you!\n{{scoutName}}',
            currentCampaignId: currentCampaign.id,
            id: existingDraft?.id ?? null,
            previousCampaignId: previousCampaign.id,
            subjectTemplate:
              emailTemplate?.subject ||
              existingDraft?.subjectTemplate ||
              'Support {{scoutName}} in {{campaignName}}',
          }
        : null

    return (
      <ScoutDashboard
        scout={scout.docs[0]}
        campaign={currentCampaign}
        outreachDraft={outreachDraft}
        previousCampaign={previousCampaign}
        previousCampaignCustomers={previousCampaignRecipients}
        recentSendHistory={recentSendHistory}
        user={user}
      />
    )
  } catch (error) {
    console.error('Dashboard error:', error)
    redirect('/admin/login')
  }
}
