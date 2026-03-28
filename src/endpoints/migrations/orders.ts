import type { Payload, PayloadRequest } from 'payload'

export const migrateOrders = async ({
  payload,
  req,
}: {
  payload: Payload
  req: PayloadRequest
}) => {
  const existingOrders = await payload.find({
    collection: 'orders',
    depth: 0,
    limit: 1,
    overrideAccess: false,
    req,
    where: {},
  })

  payload.logger.info(`Found ${existingOrders.totalDocs} existing orders`)

  return existingOrders.totalDocs
}
