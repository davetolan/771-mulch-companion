import type { Payload } from 'payload'

export const getScoutSession = async ({
  headers,
  payload,
}: {
  headers: Headers
  payload: Payload
}) => {
  const { user } = await payload.auth({ headers })

  if (!user || !user.roles?.includes('scout')) {
    throw new Error('Scout authentication required')
  }

  const scoutResult = await payload.find({
    collection: 'scouts',
    depth: 0,
    limit: 1,
    where: {
      user: {
        equals: user.id,
      },
    },
  })

  const scout = scoutResult.docs[0]

  if (!scout) {
    throw new Error('Scout record not found')
  }

  return {
    user,
    scout,
  }
}
