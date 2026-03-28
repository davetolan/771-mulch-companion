import type { Payload, PayloadRequest } from 'payload'

import { productSeeds } from '@/endpoints/seed/products'

export const migrateProducts = async ({
  payload,
  req,
}: {
  payload: Payload
  req: PayloadRequest
}) => {
  let createdCount = 0

  for (const product of productSeeds) {
    const existingProduct = await payload.find({
      collection: 'products',
      depth: 0,
      limit: 1,
      overrideAccess: false,
      req,
      where: {
        name: {
          equals: product.name,
        },
      },
    })

    if (existingProduct.totalDocs > 0) {
      continue
    }

    await payload.create({
      collection: 'products',
      data: product,
      overrideAccess: false,
      req,
    })

    createdCount += 1
  }

  return createdCount
}
