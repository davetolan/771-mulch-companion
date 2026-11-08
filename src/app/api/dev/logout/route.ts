import { NextResponse } from 'next/server'

import { DEV_AUTH_COOKIE_NAME, isDevAuthEnabled } from '@/lib/devAuth'

export async function GET(request: Request) {
  const redirectPath = isDevAuthEnabled() ? '/dev/login' : '/login'
  const response = NextResponse.redirect(new URL(redirectPath, request.url))

  response.cookies.set(DEV_AUTH_COOKIE_NAME, '', {
    maxAge: 0,
    path: '/',
  })
  response.cookies.set('payload-token', '', {
    maxAge: 0,
    path: '/',
  })

  return response
}
