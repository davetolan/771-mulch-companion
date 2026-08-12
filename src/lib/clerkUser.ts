export type ClerkIdentity = {
  clerkUserId: string
  email: string
  name: string
}

type ClerkEmailAddress = {
  emailAddress?: string | null
  id?: string | null
}

type ClerkUserLike = {
  emailAddresses: ClerkEmailAddress[]
  firstName?: string | null
  fullName?: string | null
  lastName?: string | null
  primaryEmailAddressId?: string | null
}

export function normalizeEmail(value: string) {
  return value.trim().toLowerCase()
}

export function normalizeName(value: string) {
  return value.trim()
}

export function getNameFromParts({
  firstName,
  fullName,
  lastName,
}: {
  firstName?: string | null
  fullName?: string | null
  lastName?: string | null
}) {
  return (
    fullName?.trim() ||
    [firstName, lastName].filter(Boolean).join(' ').trim() ||
    'Scout'
  )
}

export function getPrimaryEmailFromClerkUser(user: ClerkUserLike) {
  const primaryEmailId = user.primaryEmailAddressId
  const primaryEmail = user.emailAddresses.find((email) => email.id === primaryEmailId)

  return normalizeEmail(primaryEmail?.emailAddress || user.emailAddresses[0]?.emailAddress || '')
}

export function getIdentityFromClerkUser(userId: string, user: ClerkUserLike): ClerkIdentity {
  const clerkUserId = userId.trim()
  const email = getPrimaryEmailFromClerkUser(user)
  const name = getNameFromParts({
    firstName: user.firstName,
    fullName: user.fullName,
    lastName: user.lastName,
  })

  if (!clerkUserId || !email || !name) {
    throw new Error('clerkUserId, email, and name are required to resolve a Clerk identity.')
  }

  return {
    clerkUserId,
    email,
    name,
  }
}
