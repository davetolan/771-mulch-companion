import type { Payload, PayloadRequest } from 'payload'

import { emailTemplateSeeds } from '@/endpoints/seed/emailTemplates'

export const migrateEmailTemplates = async ({
  payload,
  req,
}: {
  payload: Payload
  req: PayloadRequest
}) => {
  let createdCount = 0
  let updatedCount = 0

  for (const template of emailTemplateSeeds) {
    const existingTemplate = await payload.find({
      collection: 'email-templates',
      depth: 0,
      limit: 1,
      overrideAccess: false,
      req,
      where: {
        name: {
          equals: template.name,
        },
      },
    })

    if (existingTemplate.docs[0]) {
      await payload.update({
        collection: 'email-templates',
        id: existingTemplate.docs[0].id,
        data: template,
        overrideAccess: false,
        req,
      })

      updatedCount += 1
      continue
    }

    await payload.create({
      collection: 'email-templates',
      data: template,
      overrideAccess: false,
      req,
    })

    createdCount += 1
  }

  return {
    createdCount,
    updatedCount,
  }
}
