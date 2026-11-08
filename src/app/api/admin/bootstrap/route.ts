import { NextResponse } from 'next/server'
import { getPayload } from 'payload'

import config from '@payload-config'

function timingSafeStringEqual(left: string, right: string) {
  if (left.length !== right.length) return false

  let result = 0
  for (let index = 0; index < left.length; index += 1) {
    result |= left.charCodeAt(index) ^ right.charCodeAt(index)
  }

  return result === 0
}

export async function POST(request: Request) {
  const secret = process.env.PAYLOAD_SECRET?.trim() || ''
  const provided = request.headers.get('x-bootstrap-secret')?.trim() || ''

  if (!secret || !provided || !timingSafeStringEqual(provided, secret)) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
  }

  const { email, name, password } = await request.json()

  if (!email || !name || !password) {
    return NextResponse.json({ message: 'email, name, and password are required' }, { status: 400 })
  }

  const payload = await getPayload({ config })

  const existingAdmin = await payload.find({
    collection: 'users',
    depth: 0,
    limit: 1,
    where: {
      roles: {
        contains: 'admin',
      },
    },
  })

  if (existingAdmin.docs.length > 0) {
    return NextResponse.json({ message: 'An admin user already exists.' }, { status: 403 })
  }

  const existingByEmail = await payload.find({
    collection: 'users',
    depth: 0,
    limit: 1,
    where: {
      email: {
        equals: email,
      },
    },
  })

  const existingUser = existingByEmail.docs[0]

  const user = existingUser
    ? await payload.update({
        collection: 'users',
        id: existingUser.id,
        data: {
          name,
          password,
          roles: Array.from(new Set([...(existingUser.roles || []), 'admin'])),
        },
      })
    : await payload.create({
        collection: 'users',
        data: {
          email,
          name,
          password,
          roles: ['admin'],
        },
      })

  return NextResponse.json({ email: user.email, id: user.id, upgraded: Boolean(existingUser) })
}
