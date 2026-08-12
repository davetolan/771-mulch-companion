import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server'

import { protectedRoutePatterns } from './src/lib/authGuards'
import { getClerkPublishableKey, getSignInUrl, getSignUpUrl } from './src/lib/authUrls'

const isProtectedRoute = createRouteMatcher([...protectedRoutePatterns])

export default clerkMiddleware(
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

export const config = {
  matcher: [
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    '/(api|trpc)(.*)',
  ],
}
