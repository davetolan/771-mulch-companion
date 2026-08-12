import { NextResponse } from 'next/server'

import { buildSignInRedirectUrl } from '@/lib/authUrls'

export async function POST(request: Request) {
  return NextResponse.json(
    {
      message: 'Scout password login has moved to Clerk.',
      signInUrl: buildSignInRedirectUrl(request.headers.get('referer')),
    },
    { status: 410 },
  )
}
