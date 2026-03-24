import { NextResponse } from 'next/server'
import { createLocalReq, getPayload } from 'payload'
import config from '@/payload.config'

export async function POST(request: Request) {
  const body = await request.json()
  const email = String(body?.email || '').trim().toLowerCase()
  const password = String(body?.password || '')

  if (!email || !password) {
    return NextResponse.json({ message: 'Email and password are required' }, { status: 400 })
  }

  const payload = await getPayload({ config })

  try {
    const loginResponse = await payload.login({
      collection: 'users',
      data: {
        email,
        password,
      },
      urlSuffix: '/api/scout/login',
    } as any)

    const user = loginResponse.user as any

    if (!user || !Array.isArray(user.roles) || !user.roles.includes('scout')) {
      return NextResponse.json({ message: 'This login is for Scout accounts only.' }, { status: 403 })
    }

    const res = NextResponse.json({
      token: loginResponse.token,
      user,
    })

    const maxAge = 60 * 60 * 24 * 7
    res.cookies.set('payload-token', String(loginResponse.token), {
      path: '/',
      maxAge,
      sameSite: 'lax',
    })

    return res
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Login failed'
    return NextResponse.json({ message }, { status: 401 })
  }
}
