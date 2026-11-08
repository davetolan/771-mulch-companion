import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server'
import { NextResponse, type NextFetchEvent, type NextRequest } from 'next/server'

import { protectedRoutePatterns } from './src/lib/authGuards'
import { getClerkPublishableKey, getSignInUrl, getSignUpUrl } from './src/lib/authUrls'
import { DEV_AUTH_COOKIE_NAME, isDevAuthEnabled, verifyDevAuthCookieValue } from './src/lib/devAuth'

const isProtectedRoute = createRouteMatcher([...protectedRoutePatterns])

const clerkAuthMiddleware = clerkMiddleware(
  async (auth, req) => {
    if (isProtectedRoute(req)) {
      const authState = await auth()

      if (!authState.userId) {
        return authState.redirectToSignIn({
          returnBackUrl: req.url,
        })
      }
    }
  },
  () => ({
    publishableKey: getClerkPublishableKey(),
    signInUrl: getSignInUrl(),
    signUpUrl: getSignUpUrl(),
  }),
)

export default async function middleware(req: NextRequest, event: NextFetchEvent) {
  const clerkPublishableKey = getClerkPublishableKey()

  if (isDevAuthEnabled()) {
    if (isProtectedRoute(req)) {
      const devAuthPayload = await verifyDevAuthCookieValue(
        req.cookies.get(DEV_AUTH_COOKIE_NAME)?.value,
      )

      if (devAuthPayload) {
        return NextResponse.next()
      }

      if (!clerkPublishableKey) {
        const loginUrl = new URL('/dev/login', req.url)
        loginUrl.searchParams.set('returnBackUrl', req.url)
        return NextResponse.redirect(loginUrl)
      }
    } else if (!clerkPublishableKey) {
      return NextResponse.next()
    }
  }

  return clerkAuthMiddleware(req, event)
}

export const config = {
  matcher: [
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    '/(api|trpc)(.*)',
  ],
}
