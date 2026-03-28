'use client'

import { usePathname } from 'next/navigation'

export function RouteChrome() {
  const pathname = usePathname()

  if (pathname !== '/dashboard') {
    return null
  }

  return <style>{'#site-header{display:none;}'}</style>
}
