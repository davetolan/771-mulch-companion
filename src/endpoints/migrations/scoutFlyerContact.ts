import type { Payload, PayloadRequest } from 'payload'

export const migrateScoutFlyerContact = async ({ payload, req }: { payload: Payload; req: PayloadRequest }) => {
  const limit = 100
  let page = 1
  let totalUpdated = 0

  while (true) {
    const result = await payload.find({
      collection: 'scouts',
      where: {},
      depth: 0,
      page,
      limit,
      req,
    })

    if (!result.docs || result.docs.length === 0) break

    for (const scout of result.docs) {
      const updateData: Record<string, unknown> = {}

      if (!scout.flyerEmail && scout.email) {
        updateData.flyerEmail = scout.email
      }

      if (scout.flyerPhone == null) {
        updateData.flyerPhone = ''
      }

      if (Object.keys(updateData).length > 0) {
        await payload.update({
          collection: 'scouts',
          id: scout.id,
          data: updateData,
          req,
        })

        totalUpdated += 1
      }
    }

    if (result.totalDocs <= page * limit) break
    page += 1
  }

  return totalUpdated
}
