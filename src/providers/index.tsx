import React from 'react'
import { ClerkProvider } from '@clerk/nextjs'

import { HeaderThemeProvider } from './HeaderTheme'
import { ThemeProvider } from './Theme'
import { getSignInUrl, getSignUpUrl } from '@/lib/authUrls'

export const Providers: React.FC<{
  children: React.ReactNode
}> = ({ children }) => {
  return (
    <ClerkProvider signInUrl={getSignInUrl()} signUpUrl={getSignUpUrl()}>
      <ThemeProvider>
        <HeaderThemeProvider>{children}</HeaderThemeProvider>
      </ThemeProvider>
    </ClerkProvider>
  )
}
