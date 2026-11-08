import { NextResponse } from 'next/server'
import { getPayload } from 'payload'

import { DEV_AUTH_COOKIE_NAME, createDevAuthCookieValue, isDevAuthEnabled } from '@/lib/devAuth'
import config from '@payload-config'

function getSafeReturnBackUrl(value: FormDataEntryValue | null, request: Request) {
  const fallback = '/dashboard'
  if (typeof value !== 'string' || !value.trim()) return fallback

  try {
    const candidate = new URL(value, request.url)
    const requestUrl = new URL(request.url)

    if (candidate.origin !== requestUrl.origin) {
      return fallback
    }

    return `${candidate.pathname}${candidate.search}${candidate.hash}`
  } catch {
    return fallback
  }
}

export async function POST(request: Request) {
  if (!isDevAuthEnabled()) {
    return NextResponse.json({ message: 'Dev auth is not enabled.' }, { status: 404 })
  }

  const formData = await request.formData()
  const userId = String(formData.get('userId') || '').trim()
  const returnBackUrl = getSafeReturnBackUrl(formData.get('returnBackUrl'), request)

  if (!userId) {
    return NextResponse.json({ message: 'A user is required.' }, { status: 400 })
  }

  const payload = await getPayload({ config })
  const [userResult, scoutResult] = await Promise.all([
    payload.find({
      collection: 'users',
      depth: 0,
      limit: 1,
      where: {
        id: {
          equals: userId,
        },
      },
    }),
    payload.find({
      collection: 'scouts',
      depth: 0,
      limit: 1,
      where: {
        user: {
          equals: userId,
        },
      },
    }),
  ])

  const user = userResult.docs[0]
  const scout = scoutResult.docs[0]

  if (!user?.roles?.includes('scout') || !scout) {
    return NextResponse.json({ message: 'Selected user is not a scout.' }, { status: 403 })
  }

  const response = NextResponse.redirect(new URL(returnBackUrl, request.url))
  response.cookies.set(DEV_AUTH_COOKIE_NAME, await createDevAuthCookieValue(user.id), {
    httpOnly: true,
    maxAge: 60 * 60 * 12,
    path: '/',
    sameSite: 'lax',
  })

  return response
}
