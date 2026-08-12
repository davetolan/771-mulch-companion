import crypto from 'crypto'

const SVIX_TOLERANCE_SECONDS = 300

type SvixHeaders = {
  svixId: string
  svixTimestamp: string
  svixSignature: string
}

export type CanonicalClerkUser = {
  id: string
  email: string
  name: string
}

export type ClerkUserEvent = {
  id: string
  type: 'user.created' | 'user.updated'
  user: CanonicalClerkUser
}

function toRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return null
  }
  return value as Record<string, unknown>
}

function extractRequiredString(record: Record<string, unknown>, key: string) {
  const value = record[key]
  if (typeof value !== 'string') return null
  const normalized = value.trim()
  return normalized || null
}

function extractPrimaryEmail(data: Record<string, unknown>) {
  const primaryId = extractRequiredString(data, 'primary_email_address_id')
  const emailAddresses = data.email_addresses

  if (!Array.isArray(emailAddresses)) {
    return null
  }

  for (const entry of emailAddresses) {
    const emailRecord = toRecord(entry)
    if (!emailRecord) continue

    const email = extractRequiredString(emailRecord, 'email_address')
    if (!email) continue

    const emailId = extractRequiredString(emailRecord, 'id')
    if (primaryId && emailId === primaryId) {
      return email.toLowerCase()
    }
  }

  for (const entry of emailAddresses) {
    const emailRecord = toRecord(entry)
    if (!emailRecord) continue

    const email = extractRequiredString(emailRecord, 'email_address')
    if (email) return email.toLowerCase()
  }

  return null
}

function extractFullName(data: Record<string, unknown>) {
  const fullName = extractRequiredString(data, 'full_name')
  if (fullName) return fullName

  const firstName = extractRequiredString(data, 'first_name')
  const lastName = extractRequiredString(data, 'last_name')
  const composed = [firstName, lastName].filter(Boolean).join(' ').trim()
  return composed || 'Scout'
}

export function parseClerkUserEvent(body: string): ClerkUserEvent | null {
  let payload: unknown

  try {
    payload = JSON.parse(body)
  } catch {
    return null
  }

  const payloadRecord = toRecord(payload)
  if (!payloadRecord) return null

  const id = extractRequiredString(payloadRecord, 'id')
  const type = extractRequiredString(payloadRecord, 'type')
  const data = toRecord(payloadRecord.data)

  if (!id || !data || (type !== 'user.created' && type !== 'user.updated')) {
    return null
  }

  const clerkUserId = extractRequiredString(data, 'id')
  const email = extractPrimaryEmail(data)

  if (!clerkUserId || !email) {
    return null
  }

  return {
    id,
    type,
    user: {
      id: clerkUserId,
      email,
      name: extractFullName(data),
    },
  }
}

export function getSvixHeaders(headers: Headers): SvixHeaders | null {
  const svixId = headers.get('svix-id')?.trim() ?? ''
  const svixTimestamp = headers.get('svix-timestamp')?.trim() ?? ''
  const svixSignature = headers.get('svix-signature')?.trim() ?? ''

  if (!svixId || !svixTimestamp || !svixSignature) {
    return null
  }

  return { svixId, svixTimestamp, svixSignature }
}

function parseSecret(secret: string): Buffer {
  const normalized = secret.startsWith('whsec_') ? secret.slice(6) : secret
  return Buffer.from(normalized, 'base64')
}

function isTimestampFresh(timestamp: string) {
  const parsed = Number(timestamp)
  if (!Number.isFinite(parsed)) return false

  const now = Math.floor(Date.now() / 1000)
  return Math.abs(now - parsed) <= SVIX_TOLERANCE_SECONDS
}

function timingSafeEqual(base64Signature: string, expected: Buffer) {
  let decoded: Buffer
  try {
    decoded = Buffer.from(base64Signature, 'base64')
  } catch {
    return false
  }

  if (decoded.length !== expected.length) {
    return false
  }

  return crypto.timingSafeEqual(decoded, expected)
}

function extractV1Signatures(signatureHeader: string) {
  return signatureHeader
    .split(' ')
    .map((entry) => entry.trim())
    .filter(Boolean)
    .map((entry) => {
      const [version, signature] = entry.split(',')
      if (version !== 'v1' || !signature) return null
      return signature.trim()
    })
    .filter((signature): signature is string => Boolean(signature))
}

export function verifySvixSignature({
  body,
  headers,
  secret,
}: {
  body: string
  headers: SvixHeaders
  secret: string
}): { ok: true } | { ok: false; reason: 'stale' | 'signature' } {
  if (!isTimestampFresh(headers.svixTimestamp)) {
    return { ok: false, reason: 'stale' }
  }

  const signedPayload = `${headers.svixId}.${headers.svixTimestamp}.${body}`
  const expected = crypto.createHmac('sha256', parseSecret(secret)).update(signedPayload).digest()

  const signatures = extractV1Signatures(headers.svixSignature)
  const hasMatch = signatures.some((signature) => timingSafeEqual(signature, expected))

  if (!hasMatch) {
    return { ok: false, reason: 'signature' }
  }

  return { ok: true }
}
