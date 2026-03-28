import type { Payload, PayloadRequest } from 'payload'

type AccessArgs = {
  overrideAccess?: false
  req?: PayloadRequest
}

const demoCustomers = [
  {
    name: 'Alex Johnson',
    address: '101 Maple Avenue',
    city: 'Hinsdale',
    zip: '60521',
    phoneNumber: '630-555-0101',
    email: 'alex.johnson.demo@example.com',
  },
  {
    name: 'Priya Patel',
    address: '245 Oak Street',
    city: 'Clarendon Hills',
    zip: '60514',
    phoneNumber: '630-555-0102',
    email: 'priya.patel.demo@example.com',
  },
  {
    name: 'Marcus Rivera',
    address: '88 Elm Court',
    city: 'Westmont',
    zip: '60559',
    phoneNumber: '630-555-0103',
    email: 'marcus.rivera.demo@example.com',
  },
] as const

const demoOrders = [
  {
    customerEmail: 'alex.johnson.demo@example.com',
    items: [
      { productName: 'Black', count: 6 },
      { productName: 'Compost', count: 2 },
    ],
  },
  {
    customerEmail: 'priya.patel.demo@example.com',
    items: [
      { productName: 'Hardwood', count: 4 },
      { productName: 'Cedar', count: 3 },
      { productName: 'Soil', count: 2 },
    ],
  },
  {
    customerEmail: 'marcus.rivera.demo@example.com',
    items: [
      { productName: 'Black', count: 3 },
      { productName: 'Hardwood', count: 3 },
      { productName: 'Soil', count: 5 },
    ],
  },
] as const

const historicalCampaignSeed = {
  name: '771 Spring Kickoff',
  season: '2026',
  saleStartDate: '2026-03-01T00:00:00.000Z',
  saleEndDate: '2026-03-31T00:00:00.000Z',
  deliveryDate: '2026-04-18T00:00:00.000Z',
  active: false,
  flyerHeadline: 'Support Troop 771 Spring Mulch Sales',
  flyerBody:
    'Order premium mulch and soil from Troop 771 to support scouting adventures and equipment.',
} as const

const historicalOrders = [
  {
    customerEmail: 'alex.johnson.demo@example.com',
    items: [
      { productName: 'Black', count: 4 },
      { productName: 'Soil', count: 2 },
    ],
  },
  {
    customerEmail: 'priya.patel.demo@example.com',
    items: [
      { productName: 'Hardwood', count: 5 },
      { productName: 'Compost', count: 1 },
    ],
  },
] as const

const getAccessArgs = (req?: PayloadRequest): AccessArgs =>
  req ? { overrideAccess: false, req } : {}

export const seedDemoCustomerOrders = async ({
  payload,
  req,
}: {
  payload: Payload
  req?: PayloadRequest
}) => {
  const accessArgs = getAccessArgs(req)

  const [scoutsResult, campaignsResult, productsResult] = await Promise.all([
    payload.find({
      collection: 'scouts',
      depth: 0,
      limit: 1,
      sort: 'createdAt',
      where: {},
      ...accessArgs,
    }),
    payload.find({
      collection: 'campaigns',
      depth: 0,
      limit: 1,
      sort: 'createdAt',
      where: {
        active: {
          equals: true,
        },
      },
      ...accessArgs,
    }),
    payload.find({
      collection: 'products',
      depth: 0,
      limit: 100,
      sort: 'createdAt',
      where: {
        active: {
          equals: true,
        },
      },
      ...accessArgs,
    }),
  ])

  const scout = scoutsResult.docs[0]
  if (!scout) {
    throw new Error('Cannot seed demo customers without at least one scout')
  }

  const campaign =
    campaignsResult.docs[0] ??
    (
      await payload.find({
        collection: 'campaigns',
        depth: 0,
        limit: 1,
        sort: 'createdAt',
        where: {},
        ...accessArgs,
      })
    ).docs[0]

  if (!campaign) {
    throw new Error('Cannot seed demo orders without at least one campaign')
  }

  const productsByName = new Map(productsResult.docs.map((product) => [product.name, product]))

  for (const order of demoOrders) {
    for (const item of order.items) {
      if (!productsByName.has(item.productName)) {
        throw new Error(`Cannot seed demo orders because product "${item.productName}" is missing`)
      }
    }
  }

  let createdCustomers = 0
  let createdOrders = 0

  const customersByEmail = new Map<string, number>()

  for (const customer of demoCustomers) {
    const existingCustomer = await payload.find({
      collection: 'customers',
      depth: 0,
      limit: 1,
      where: {
        email: {
          equals: customer.email,
        },
      },
      ...accessArgs,
    })

    const customerDoc =
      existingCustomer.docs[0] ??
      (await payload.create({
        collection: 'customers',
        data: {
          ...customer,
          scout: scout.id,
        },
        ...accessArgs,
      }))

    if (existingCustomer.totalDocs === 0) {
      createdCustomers += 1
    }

    customersByEmail.set(customer.email, customerDoc.id)
  }

  for (const order of demoOrders) {
    const customerId = customersByEmail.get(order.customerEmail)

    if (!customerId) {
      throw new Error(`No customer available for ${order.customerEmail}`)
    }

    const existingOrder = await payload.find({
      collection: 'orders',
      depth: 0,
      limit: 1,
      where: {
        and: [
          {
            customer: {
              equals: customerId,
            },
          },
          {
            campaign: {
              equals: campaign.id,
            },
          },
        ],
      },
      ...accessArgs,
    })

    if (existingOrder.totalDocs > 0) {
      continue
    }

    await payload.create({
      collection: 'orders',
      data: {
        customer: customerId,
        campaign: campaign.id,
        items: order.items.map((item) => {
          const product = productsByName.get(item.productName)

          if (!product) {
            throw new Error(`No product available for ${item.productName}`)
          }

          return {
            product: product.id,
            count: item.count,
          }
        }),
      },
      ...accessArgs,
    })

    createdOrders += 1
  }

  payload.logger.info(
    `Seeded demo customer/orders data: ${createdCustomers} customers, ${createdOrders} orders`,
  )

  return {
    createdCustomers,
    createdOrders,
    campaignId: campaign.id,
    scoutId: scout.id,
  }
}

export const seedHistoricalCampaignOrders = async ({
  payload,
  req,
}: {
  payload: Payload
  req?: PayloadRequest
}) => {
  const accessArgs = getAccessArgs(req)

  const [scoutsResult, productsResult] = await Promise.all([
    payload.find({
      collection: 'scouts',
      depth: 0,
      limit: 1,
      sort: 'createdAt',
      where: {},
      ...accessArgs,
    }),
    payload.find({
      collection: 'products',
      depth: 0,
      limit: 100,
      sort: 'createdAt',
      where: {
        active: {
          equals: true,
        },
      },
      ...accessArgs,
    }),
  ])

  const scout = scoutsResult.docs[0]
  if (!scout) {
    throw new Error('Cannot seed historical orders without at least one scout')
  }

  const productsByName = new Map(productsResult.docs.map((product) => [product.name, product]))

  for (const order of historicalOrders) {
    for (const item of order.items) {
      if (!productsByName.has(item.productName)) {
        throw new Error(
          `Cannot seed historical orders because product "${item.productName}" is missing`,
        )
      }
    }
  }

  const existingCampaign = await payload.find({
    collection: 'campaigns',
    depth: 0,
    limit: 1,
    where: {
      name: {
        equals: historicalCampaignSeed.name,
      },
    },
    ...accessArgs,
  })

  const historicalCampaign =
    existingCampaign.docs[0] ??
    (await payload.create({
      collection: 'campaigns',
      data: historicalCampaignSeed,
      ...accessArgs,
    }))

  let createdCampaigns = existingCampaign.totalDocs > 0 ? 0 : 1
  let createdHistoricalOrders = 0

  const customersByEmail = new Map<string, number>()

  for (const customer of demoCustomers) {
    const existingCustomer = await payload.find({
      collection: 'customers',
      depth: 0,
      limit: 1,
      where: {
        email: {
          equals: customer.email,
        },
      },
      ...accessArgs,
    })

    const customerDoc =
      existingCustomer.docs[0] ??
      (await payload.create({
        collection: 'customers',
        data: {
          ...customer,
          scout: scout.id,
        },
        ...accessArgs,
      }))

    customersByEmail.set(customer.email, customerDoc.id)
  }

  for (const order of historicalOrders) {
    const customerId = customersByEmail.get(order.customerEmail)

    if (!customerId) {
      throw new Error(`No customer available for ${order.customerEmail}`)
    }

    const existingOrder = await payload.find({
      collection: 'orders',
      depth: 0,
      limit: 1,
      where: {
        and: [
          {
            customer: {
              equals: customerId,
            },
          },
          {
            campaign: {
              equals: historicalCampaign.id,
            },
          },
        ],
      },
      ...accessArgs,
    })

    if (existingOrder.totalDocs > 0) {
      continue
    }

    await payload.create({
      collection: 'orders',
      data: {
        customer: customerId,
        campaign: historicalCampaign.id,
        items: order.items.map((item) => {
          const product = productsByName.get(item.productName)

          if (!product) {
            throw new Error(`No product available for ${item.productName}`)
          }

          return {
            product: product.id,
            count: item.count,
          }
        }),
      },
      ...accessArgs,
    })

    createdHistoricalOrders += 1
  }

  payload.logger.info(
    `Seeded historical campaign/orders data: ${createdCampaigns} campaigns, ${createdHistoricalOrders} orders`,
  )

  return {
    createdCampaigns,
    createdHistoricalOrders,
    campaignId: historicalCampaign.id,
    scoutId: scout.id,
  }
}
