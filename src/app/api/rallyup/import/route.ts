import { NextResponse } from 'next/server'
import { createLocalReq, getPayload } from 'payload'

import config from '@payload-config'
import { runRallyUpImport, type RallyUpImportAction } from '@/utilities/rallyUpImport'

const readCSVFile = async (formData: FormData, field: string) => {
  const value = formData.get(field)

  if (!(value instanceof File)) {
    throw new Error(`${field} is required`)
  }

  return value.text()
}

export async function POST(request: Request) {
  const payload = await getPayload({ config })

  try {
    const { user } = await payload.auth({
      headers: new Headers(request.headers),
    })

    if (!user?.roles?.includes('admin')) {
      return NextResponse.json({ message: 'Admin access required' }, { status: 403 })
    }

    const formData = await request.formData()
    const action = String(formData.get('action') || 'preview') as RallyUpImportAction
    const campaignId = Number(formData.get('campaignId'))

    if (action !== 'preview' && action !== 'import') {
      return NextResponse.json({ message: 'Invalid import action' }, { status: 400 })
    }

    if (!campaignId) {
      return NextResponse.json({ message: 'Campaign is required' }, { status: 400 })
    }

    const [participantsCSV, donationsCSV] = await Promise.all([
      readCSVFile(formData, 'participants'),
      readCSVFile(formData, 'donations'),
    ])

    const req = await createLocalReq({ user }, payload)
    const result = await runRallyUpImport({
      action,
      campaignId,
      donationsCSV,
      participantsCSV,
      payload,
      req,
    })

    return NextResponse.json(result)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to import RallyUp files'
    payload.logger.error({ err: error, message })
    return NextResponse.json({ message }, { status: 500 })
  }
}
