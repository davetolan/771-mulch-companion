'use client'

import React, { useEffect, useMemo, useState } from 'react'

type CampaignOption = {
  id: number
  name: string
  season?: string | null
}

type ImportIssue = {
  message: string
  paymentId?: string
  participantId?: string
  row?: number
}

type ImportResult = {
  campaign?: {
    id: number
    name: string
  }
  donationOnlyRows?: number
  donations?: number
  duplicateOrderKeys?: number
  imported?: boolean
  issues?: ImportIssue[]
  participants?: number
  productOrderRows?: number
  products?: string[]
  results?: {
    customersCreated: number
    customersUpdated: number
    ordersCreated: number
    ordersUpdated: number
    scoutsCreated: number
    scoutsUpdated: number
  }
  skippedDonationRows?: number
  statuses?: Record<string, number>
  uniqueOrderKeys?: number
}

const baseClass = 'rallyup-import'

const postImportFiles = async ({
  action,
  campaignId,
  donations,
  participants,
}: {
  action: 'import' | 'preview'
  campaignId: string
  donations: File
  participants: File
}) => {
  const formData = new FormData()
  formData.append('action', action)
  formData.append('campaignId', campaignId)
  formData.append('participants', participants)
  formData.append('donations', donations)

  const response = await fetch('/api/rallyup/import', {
    body: formData,
    credentials: 'include',
    method: 'POST',
  })

  const payload = (await response.json()) as ImportResult & { message?: string }

  if (!response.ok) {
    throw new Error(payload.message || 'RallyUp import failed')
  }

  return payload
}

const SummaryGrid: React.FC<{ result: ImportResult }> = ({ result }) => {
  const entries = [
    ['Participants', result.participants],
    ['Donation rows', result.donations],
    ['Product orders', result.productOrderRows],
    ['Donation-only rows', result.donationOnlyRows],
    ['Skipped rows', result.skippedDonationRows],
    ['Unique order keys', result.uniqueOrderKeys],
    ['Duplicate order keys', result.duplicateOrderKeys],
  ]

  return (
    <div className={`${baseClass}__summary`}>
      {entries.map(([label, value]) => (
        <div className={`${baseClass}__summary-item`} key={label}>
          <strong>{value ?? 0}</strong>
          <span>{label}</span>
        </div>
      ))}
    </div>
  )
}

const ResultDetails: React.FC<{ result: ImportResult }> = ({ result }) => {
  const statuses = Object.entries(result.statuses || {})
  const results = result.results

  return (
    <div className={`${baseClass}__details`}>
      {result.campaign && (
        <p>
          Campaign: <strong>{result.campaign.name}</strong>
        </p>
      )}

      <SummaryGrid result={result} />

      {result.products && result.products.length > 0 && (
        <p>
          Products found: <strong>{result.products.join(', ')}</strong>
        </p>
      )}

      {statuses.length > 0 && (
        <p>
          Statuses:{' '}
          <strong>
            {statuses.map(([status, count]) => `${status}: ${count}`).join(', ')}
          </strong>
        </p>
      )}

      {results && (
        <div className={`${baseClass}__results`}>
          <p>
            Scouts: {results.scoutsCreated} created, {results.scoutsUpdated} updated
          </p>
          <p>
            Customers: {results.customersCreated} created, {results.customersUpdated} updated
          </p>
          <p>
            Orders: {results.ordersCreated} created, {results.ordersUpdated} updated
          </p>
        </div>
      )}

      {result.issues && result.issues.length > 0 && (
        <div className={`${baseClass}__issues`}>
          <h3>Issues</h3>
          <ul>
            {result.issues.map((issue, index) => (
              <li key={`${issue.message}-${index}`}>
                {issue.row ? `Row ${issue.row}: ` : ''}
                {issue.message}
                {issue.paymentId ? ` PaymentID ${issue.paymentId}.` : ''}
                {issue.participantId ? ` ParticipantID ${issue.participantId}.` : ''}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}

const RallyUpImportAdmin: React.FC = () => {
  const [campaigns, setCampaigns] = useState<CampaignOption[]>([])
  const [campaignId, setCampaignId] = useState('')
  const [participants, setParticipants] = useState<File | null>(null)
  const [donations, setDonations] = useState<File | null>(null)
  const [result, setResult] = useState<ImportResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loadingAction, setLoadingAction] = useState<'import' | 'preview' | null>(null)

  useEffect(() => {
    const loadCampaigns = async () => {
      const response = await fetch('/api/campaigns?limit=100&sort=-saleStartDate', {
        credentials: 'include',
      })
      const payload = (await response.json()) as { docs?: CampaignOption[]; message?: string }

      if (!response.ok) {
        throw new Error(payload.message || 'Unable to load campaigns')
      }

      setCampaigns(payload.docs || [])
    }

    loadCampaigns().catch((loadError) => {
      setError(loadError instanceof Error ? loadError.message : 'Unable to load campaigns')
    })
  }, [])

  const canSubmit = useMemo(
    () => Boolean(campaignId && participants && donations && !loadingAction),
    [campaignId, donations, loadingAction, participants],
  )

  const handleSubmit = async (action: 'import' | 'preview') => {
    if (!participants || !donations || !campaignId) return

    setLoadingAction(action)
    setError(null)

    try {
      const nextResult = await postImportFiles({
        action,
        campaignId,
        donations,
        participants,
      })
      setResult(nextResult)
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'RallyUp import failed')
    } finally {
      setLoadingAction(null)
    }
  }

  return (
    <main className={baseClass}>
      <h1>RallyUp Import</h1>
      <p>
        Upload the RallyUp participants and donations CSV exports, preview validation results, then
        import scouts, customers, and campaign orders.
      </p>

      <div className={`${baseClass}__form`}>
        <label>
          <span>Campaign</span>
          <select value={campaignId} onChange={(event) => setCampaignId(event.target.value)}>
            <option value="">Select a campaign</option>
            {campaigns.map((campaign) => (
              <option key={campaign.id} value={campaign.id}>
                {campaign.name}
                {campaign.season ? ` (${campaign.season})` : ''}
              </option>
            ))}
          </select>
        </label>

        <label>
          <span>participants.csv</span>
          <input
            accept=".csv,text/csv"
            type="file"
            onChange={(event) => setParticipants(event.target.files?.[0] || null)}
          />
        </label>

        <label>
          <span>donations.csv</span>
          <input
            accept=".csv,text/csv"
            type="file"
            onChange={(event) => setDonations(event.target.files?.[0] || null)}
          />
        </label>

        <div className={`${baseClass}__actions`}>
          <button disabled={!canSubmit} onClick={() => handleSubmit('preview')} type="button">
            {loadingAction === 'preview' ? 'Previewing...' : 'Preview'}
          </button>
          <button disabled={!canSubmit} onClick={() => handleSubmit('import')} type="button">
            {loadingAction === 'import' ? 'Importing...' : 'Import'}
          </button>
        </div>
      </div>

      {error && <div className={`${baseClass}__error`}>{error}</div>}

      {result && (
        <section className={`${baseClass}__result`}>
          <h2>{result.imported ? 'Import Complete' : 'Preview Results'}</h2>
          <ResultDetails result={result} />
        </section>
      )}
    </main>
  )
}

export default RallyUpImportAdmin
