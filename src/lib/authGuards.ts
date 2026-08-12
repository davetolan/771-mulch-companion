export const protectedRoutePatterns = [
  '/dashboard(.*)',
  '/api/scout/profile(.*)',
  '/api/scout/outreach(.*)',
] as const

const protectedRouteRegexes = [
  /^\/dashboard(?:\/.*)?$/,
  /^\/api\/scout\/profile(?:\/.*)?$/,
  /^\/api\/scout\/outreach(?:\/.*)?$/,
]

export function isClerkProtectedPath(pathname: string) {
  return protectedRouteRegexes.some((regex) => regex.test(pathname))
}
