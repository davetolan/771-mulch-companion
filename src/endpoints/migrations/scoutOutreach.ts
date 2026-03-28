import type { Payload, PayloadRequest } from 'payload'

export const migrateScoutOutreach = async ({
  payload,
  req,
}: {
  payload: Payload
  req: PayloadRequest
}) => {
  const [draftsResult, sendLogsResult] = await Promise.all([
    payload.find({
      collection: 'scout-email-campaigns',
      depth: 0,
      limit: 1,
      overrideAccess: false,
      req,
      where: {},
    }),
    payload.find({
      collection: 'scout-email-send-logs',
      depth: 0,
      limit: 1,
      overrideAccess: false,
      req,
      where: {},
    }),
  ])

  payload.logger.info(
    `Found ${draftsResult.totalDocs} scout email drafts and ${sendLogsResult.totalDocs} send logs`,
  )

  return {
    draftCount: draftsResult.totalDocs,
    sendLogCount: sendLogsResult.totalDocs,
  }
}
