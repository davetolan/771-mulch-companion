import { notFound } from 'next/navigation'
import { getPayload } from 'payload'

import { isDevAuthEnabled } from '@/lib/devAuth'
import config from '@payload-config'

type SearchParams = Promise<{
  returnBackUrl?: string
}>

export default async function DevLoginPage({ searchParams }: { searchParams: SearchParams }) {
  if (!isDevAuthEnabled()) {
    notFound()
  }

  const { returnBackUrl } = await searchParams
  const payload = await getPayload({ config })
  const scoutResult = await payload.find({
    collection: 'scouts',
    depth: 1,
    limit: 200,
    sort: 'displayName',
  })

  const scoutOptions = scoutResult.docs.flatMap((scout) => {
    if (
      typeof scout.user !== 'object' ||
      scout.user === null ||
      !scout.user.roles?.includes('scout')
    ) {
      return []
    }

    return [
      {
        email: scout.user.email,
        scoutName: scout.displayName,
        userId: scout.user.id,
      },
    ]
  })

  return (
    <main className="mx-auto max-w-md px-4 py-10 text-gray-900">
      <style>{'#site-header,#site-footer{display:none !important;}'}</style>
      <h1 className="text-3xl font-bold">Development Login</h1>
      <p className="mt-2 text-sm text-gray-600">
        Choose a local scout-linked user for development. This page is disabled unless dev auth is
        explicitly enabled.
      </p>

      <form action="/api/dev/login" className="mt-8 grid gap-4" method="post">
        <input name="returnBackUrl" type="hidden" value={returnBackUrl || '/dashboard'} />

        <label className="block">
          <span className="text-sm font-medium text-gray-700">Scout</span>
          <select
            className="mt-1 block w-full rounded border bg-white px-3 py-2 text-gray-900"
            disabled={scoutOptions.length === 0}
            name="userId"
            required
          >
            <option value="">Select a scout</option>
            {scoutOptions.map((option) => (
              <option key={option.userId} value={option.userId}>
                {option.scoutName} ({option.email})
              </option>
            ))}
          </select>
        </label>

        {scoutOptions.length === 0 && (
          <div className="rounded border border-amber-300 bg-amber-50 p-3 text-sm text-amber-800">
            No local scout-linked users were found.
          </div>
        )}

        <button
          className="rounded bg-slate-900 px-4 py-2 text-white transition duration-200 hover:bg-slate-700 disabled:opacity-50"
          disabled={scoutOptions.length === 0}
          type="submit"
        >
          Continue
        </button>
      </form>
    </main>
  )
}
