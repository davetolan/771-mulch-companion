'use client'

import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import { getClientSideURL } from '@/utilities/getURL'

export default function ScoutLoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    setLoading(true)
    setError(null)

    try {
      const res = await fetch(`${getClientSideURL()}/api/scout/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email,
          password,
        }),
      })

      const payload = await res.json()

      if (!res.ok) {
        throw new Error(payload?.message || 'Login failed')
      }

      const { token, user } = payload

      if (!user || !user.roles?.includes('scout')) {
        throw new Error('This login is for Scout accounts only.')
      }

      document.cookie = `payload-token=${token}; path=/; max-age=${60 * 60 * 24 * 7}; samesite=lax`

      router.push('/dashboard')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Login failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="mx-auto max-w-md px-4 py-10">
      <h1 className="text-3xl font-bold">Scout Login</h1>
      <p className="mt-2 text-sm text-gray-600">Use your Scout account credentials to access your fundraiser dashboard.</p>

      <form onSubmit={handleSubmit} className="mt-8 grid gap-4">
        <label className="block">
          <span className="text-sm font-medium text-gray-700">Email</span>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="mt-1 block w-full rounded border px-3 py-2"
          />
        </label>

        <label className="block">
          <span className="text-sm font-medium text-gray-700">Password</span>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            className="mt-1 block w-full rounded border px-3 py-2"
          />
        </label>

        {error && <div className="rounded border border-red-300 bg-red-50 p-3 text-sm text-red-700">{error}</div>}

        <button
          type="submit"
          disabled={loading}
          className="rounded bg-primary px-4 py-2 text-white disabled:opacity-50"
        >
          {loading ? 'Signing in…' : 'Sign in'}
        </button>

        <p className="text-xs text-gray-500">Admin users should use <a className="text-primary underline" href="/admin/login">admin login</a>.</p>
      </form>
    </main>
  )
}
