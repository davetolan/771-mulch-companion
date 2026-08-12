const AUTH_DOMAIN_SIGN_IN_FALLBACK = 'https://auth.troop771.com/sign-in'
const AUTH_DOMAIN_SIGN_UP_FALLBACK = 'https://auth.troop771.com/sign-up'

function getConfiguredUrl(value: string | undefined, fallback: string) {
  const trimmedValue = value?.trim()
  return trimmedValue || fallback
}

export function getSignInUrl() {
  return getConfiguredUrl(process.env.NEXT_PUBLIC_CLERK_SIGN_IN_URL, AUTH_DOMAIN_SIGN_IN_FALLBACK)
}

export function getSignUpUrl() {
  return getConfiguredUrl(process.env.NEXT_PUBLIC_CLERK_SIGN_UP_URL, AUTH_DOMAIN_SIGN_UP_FALLBACK)
}

export function getClerkPublishableKey() {
  const publicKey = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY?.trim()
  if (publicKey) return publicKey

  return process.env.CLERK_PUBLISHABLE_KEY?.trim() || ''
}

const ALLOWED_RETURN_HOSTS = new Set([
  'mulch.troop771.com',
  'auth.troop771.com',
  'localhost:3000',
  'localhost:3001',
])

export function buildSignInRedirectUrl(returnBackUrl?: string | URL | null) {
  const signInUrl = new URL(getSignInUrl())

  if (!returnBackUrl) {
    return signInUrl.toString()
  }

  let candidateUrl: URL

  try {
    candidateUrl = returnBackUrl instanceof URL ? returnBackUrl : new URL(returnBackUrl)
  } catch {
    return signInUrl.toString()
  }

  if (!ALLOWED_RETURN_HOSTS.has(candidateUrl.host)) {
    return signInUrl.toString()
  }

  signInUrl.searchParams.set('redirect_url', candidateUrl.toString())
  return signInUrl.toString()
}
