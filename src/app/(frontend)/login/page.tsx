import { headers } from 'next/headers'
import { redirect } from 'next/navigation'

import { buildSignInRedirectUrl } from '@/lib/authUrls'

export default async function ScoutLoginPage() {
  const requestHeaders = await headers()
  const host = requestHeaders.get('x-forwarded-host') ?? requestHeaders.get('host')
  const proto = requestHeaders.get('x-forwarded-proto') ?? 'https'
  const returnBackUrl = host ? `${proto}://${host}/dashboard` : null

  redirect(buildSignInRedirectUrl(returnBackUrl))
}
