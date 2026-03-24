'use client'

import React from 'react'

import type { Header as HeaderType } from '@/payload-types'

import { CMSLink } from '@/components/Link'
import Link from 'next/link'
import { SearchIcon } from 'lucide-react'
import { useAuth } from '@payloadcms/ui'

export const HeaderNav: React.FC<{ data: HeaderType }> = ({ data }) => {
  const navItems = data?.navItems || []
  const { user } = useAuth()

  return (
    <nav className="flex gap-3 items-center">
      {navItems.map(({ link }, i) => {
        return <CMSLink key={i} {...link} appearance="link" />
      })}
      {!user && (
        <Link href="/login" className="text-primary hover:text-primary/80">
          Login
        </Link>
      )}
      {user?.roles?.includes('scout') && (
        <Link href="/dashboard" className="text-primary hover:text-primary/80">
          Dashboard
        </Link>
      )}
      <Link href="/search">
        <span className="sr-only">Search</span>
        <SearchIcon className="w-5 text-primary" />
      </Link>
    </nav>
  )
}
