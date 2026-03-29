'use client'

import { usePathname } from 'next/navigation'

export function RouteChrome() {
  const pathname = usePathname()

  if (pathname === '/dashboard') {
    return <style>{'#site-header{display:none;}'}</style>
  }

  if (pathname === '/login') {
    return <style>{'#site-header,#site-footer{display:none;}'}</style>
  }

  if (pathname !== '/dashboard') {
    return null
  }

  return null
}
