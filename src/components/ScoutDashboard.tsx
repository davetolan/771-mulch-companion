'use client'

import type { Scout, Campaign, User } from '@/payload-types'
import { format } from 'date-fns'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { generateQRCodeDataURL } from '@/utilities/generateQRCode'
import { renderEmailTemplate } from '@/utilities/renderEmailTemplate'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import MulchDoorHangerFlyer from './MulchDoorHangerFlyer'

interface ScoutDashboardProps {
  scout: Scout
  campaign: Campaign | null
  previousCampaign: Campaign | null
  outreachDraft: {
    id: number | null
    currentCampaignId: number
    previousCampaignId: number
    subjectTemplate: string
    bodyTemplate: string
  } | null
  previousCampaignCustomers: Array<{
    id: number
    email: string
    name: string
    previousOrder: string
    lastSentAt: string | null
    lastSentStatus: 'failed' | 'sent' | null
  }>
  recentSendHistory: Array<{
    customerId: number
    customerName: string
    id: number
    recipientEmail: string
    sentAt: string
    status: 'failed' | 'sent'
    subject: string
  }>
  user: User
}

export function ScoutDashboard({
  scout,
  campaign,
  previousCampaign,
  outreachDraft,
  previousCampaignCustomers,
  recentSendHistory,
  user,
}: ScoutDashboardProps) {
  const router = useRouter()
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string | null>(null)
  const [qrError, setQrError] = useState<string | null>(null)
  const [isDownloading, setIsDownloading] = useState(false)
  const [downloadError, setDownloadError] = useState<string | null>(null)
  const [downloadMessage, setDownloadMessage] = useState<string | null>(null)
  const [isPreviewing, setIsPreviewing] = useState(false)
  const [flyerEmail, setFlyerEmail] = useState(scout.flyerEmail ?? '')
  const [flyerPhone, setFlyerPhone] = useState(scout.flyerPhone ?? '')
  const [subjectTemplate, setSubjectTemplate] = useState(outreachDraft?.subjectTemplate ?? '')
  const [bodyTemplate, setBodyTemplate] = useState(outreachDraft?.bodyTemplate ?? '')
  const [selectedCustomerIds, setSelectedCustomerIds] = useState<number[]>(
    previousCampaignCustomers.map((customer) => customer.id),
  )
  const [previewCustomerId, setPreviewCustomerId] = useState<number | null>(
    previousCampaignCustomers[0]?.id ?? null,
  )
  const [copyMessage, setCopyMessage] = useState<string | null>(null)
  const [saveMessage, setSaveMessage] = useState<string | null>(null)
  const [sendMessage, setSendMessage] = useState<string | null>(null)
  const [isSavingDraft, setIsSavingDraft] = useState(false)
  const [isSendingEmails, setIsSendingEmails] = useState(false)
  const [isSavingFlyerContact, setIsSavingFlyerContact] = useState(false)
  const [flyerContactMessage, setFlyerContactMessage] = useState<string | null>(null)

  useEffect(() => {
    if (!scout?.externalFundraisingUrl) {
      setQrCodeDataUrl(null)
      setQrError('No external fundraising URL available.')
      return
    }

    generateQRCodeDataURL(scout.externalFundraisingUrl)
      .then((dataUrl) => {
        setQrCodeDataUrl(dataUrl)
        setQrError(null)
      })
      .catch((error) => {
        console.error('QR code generation failed', error)
        setQrError('Could not generate QR code.')
        setQrCodeDataUrl(null)
      })
  }, [scout.externalFundraisingUrl])

  const handleDownloadFlyer = async () => {
    if (!campaign) {
      setDownloadError('No active campaign available.')
      return
    }

    setIsDownloading(true)
    setDownloadError(null)
    setDownloadMessage(null)

    try {
      const response = await fetch('/api/generate-doorhanger-pdf', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          scoutName: scout.displayName,
          campaignName: campaign.name,
          saleEndDate: format(new Date(campaign.saleEndDate), 'MMM dd, yyyy'),
          deliveryDate: format(new Date(campaign.deliveryDate), 'MMM dd, yyyy'),
          externalFundraisingUrl: scout.externalFundraisingUrl,
          troopName: '771',
          flyerEmail: flyerEmail || scout.email,
          flyerPhone,
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to generate PDF')
      }

      // Get the PDF blob and create a download link
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${scout.displayName}_doorhanger.pdf`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
      setDownloadMessage('Flyer PDF downloaded. If it did not open automatically, check your Downloads folder.')
    } catch (error) {
      console.error('Download error:', error)
      setDownloadError(
        error instanceof Error ? error.message : 'Failed to download flyer. Please try again.',
      )
    } finally {
      setIsDownloading(false)
    }
  }

  const handleLogout = () => {
    document.cookie = 'payload-token=; path=/; max-age=0; samesite=lax'
    window.location.href = '/login'
  }

  const handleSaveFlyerContact = async () => {
    setIsSavingFlyerContact(true)
    setFlyerContactMessage(null)

    try {
      const response = await fetch('/api/scout/profile', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          flyerEmail,
          flyerPhone,
        }),
      })

      const payload = (await response.json()) as { message?: string }

      if (!response.ok) {
        throw new Error(payload.message || 'Unable to save flyer contact details')
      }

      setFlyerContactMessage('Flyer contact details saved.')
      router.refresh()
    } catch (error) {
      setFlyerContactMessage(
        error instanceof Error ? error.message : 'Unable to save flyer contact details',
      )
    } finally {
      setIsSavingFlyerContact(false)
    }
  }

  const selectedRecipients = previousCampaignCustomers.filter((customer) =>
    selectedCustomerIds.includes(customer.id),
  )
  const canDownloadFlyer = Boolean(qrCodeDataUrl) && !isDownloading
  const flyerContactSummary = flyerPhone
    ? `Flyer contact: ${flyerEmail || scout.email} and ${flyerPhone}`
    : `Flyer contact: ${flyerEmail || scout.email}`

  const previewCustomer =
    previousCampaignCustomers.find((customer) => customer.id === previewCustomerId) ||
    selectedRecipients[0] ||
    previousCampaignCustomers[0] ||
    null

  const renderedPreview =
    campaign && previousCampaign && previewCustomer
      ? renderEmailTemplate({
          campaignName: campaign.name,
          campaignSeason: campaign.season,
          customerFirstName: previewCustomer.name.trim().split(/\s+/)[0] || previewCustomer.name,
          customerName: previewCustomer.name,
          deliveryDate: campaign.deliveryDate,
          fundraisingUrl: scout.externalFundraisingUrl,
          previousCampaignName: previousCampaign.name,
          previousCampaignSeason: previousCampaign.season,
          previousOrder: previewCustomer.previousOrder,
          saleEndDate: campaign.saleEndDate,
          scoutName: scout.displayName,
          template: {
            body: bodyTemplate,
            subject: subjectTemplate,
          },
        })
      : null

  const toggleCustomer = (customerId: number, checked: boolean) => {
    setSelectedCustomerIds((current) =>
      checked ? [...new Set([...current, customerId])] : current.filter((id) => id !== customerId),
    )
  }

  const handleSelectAllCustomers = () => {
    setSelectedCustomerIds(previousCampaignCustomers.map((customer) => customer.id))
  }

  const handleClearSelectedCustomers = () => {
    setSelectedCustomerIds([])
  }

  const handleSaveDraft = async () => {
    if (!outreachDraft) return

    setIsSavingDraft(true)
    setSaveMessage(null)

    try {
      const response = await fetch('/api/scout/outreach/draft', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          bodyTemplate,
          currentCampaignId: outreachDraft.currentCampaignId,
          previousCampaignId: outreachDraft.previousCampaignId,
          subjectTemplate,
        }),
      })

      const payload = (await response.json()) as { message?: string }

      if (!response.ok) {
        throw new Error(payload.message || 'Unable to save draft')
      }

      setSaveMessage('Draft saved.')
      router.refresh()
    } catch (error) {
      setSaveMessage(error instanceof Error ? error.message : 'Unable to save draft')
    } finally {
      setIsSavingDraft(false)
    }
  }

  const handleSendEmails = async () => {
    if (!outreachDraft || selectedCustomerIds.length === 0) return

    setIsSendingEmails(true)
    setSendMessage(null)

    try {
      const response = await fetch('/api/scout/outreach/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          bodyTemplate,
          currentCampaignId: outreachDraft.currentCampaignId,
          customerIds: selectedCustomerIds,
          previousCampaignId: outreachDraft.previousCampaignId,
          subjectTemplate,
        }),
      })

      const payload = (await response.json()) as {
        failedCount?: number
        message?: string
        sentCount?: number
      }

      if (!response.ok) {
        throw new Error(payload.message || 'Unable to send emails')
      }

      setSendMessage(
        `Sent ${payload.sentCount ?? 0} email${payload.sentCount === 1 ? '' : 's'}${payload.failedCount ? `, ${payload.failedCount} failed` : ''}.`,
      )
      router.refresh()
    } catch (error) {
      setSendMessage(error instanceof Error ? error.message : 'Unable to send emails')
    } finally {
      setIsSendingEmails(false)
    }
  }

  const handleCopyPreview = async () => {
    if (!renderedPreview) return

    try {
      await navigator.clipboard.writeText(
        `Subject: ${renderedPreview.subject}\n\n${renderedPreview.body}`,
      )
      setCopyMessage('Copied email preview.')
    } catch (error) {
      console.error('Copy preview failed', error)
      setCopyMessage('Could not copy email preview.')
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 text-gray-900">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="bg-white shadow rounded-lg p-6 mb-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">
                Welcome, {scout.displayName}!
              </h1>
              <p className="text-gray-600">Your personal fundraiser dashboard</p>
            </div>

            <button
              type="button"
              onClick={handleLogout}
              className="rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white transition duration-200 hover:bg-gray-700"
            >
              Logout
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Scout Information */}
          <div className="bg-white shadow rounded-lg p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Your Information</h2>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700">Name</label>
                <p className="text-gray-900">{scout.displayName}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Email</label>
                <p className="text-gray-900">{scout.email}</p>
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700">Flyer Email</label>
                <Input
                  value={flyerEmail}
                  onChange={(event) => setFlyerEmail(event.target.value)}
                  placeholder={scout.email}
                  type="email"
                />
                <p className="mt-1 text-xs text-gray-500">
                  Leave blank to use your main email address.
                </p>
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700">Flyer Phone</label>
                <Input
                  value={flyerPhone}
                  onChange={(event) => setFlyerPhone(event.target.value)}
                  placeholder="Optional phone number"
                  type="text"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Fundraising Link</label>
                <a
                  href={scout.externalFundraisingUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:text-blue-800 underline break-all"
                >
                  {scout.externalFundraisingUrl}
                </a>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Status</label>
                <span
                  className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                    scout.active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                  }`}
                >
                  {scout.active ? 'Active' : 'Inactive'}
                </span>
              </div>
              <div className="pt-2">
                <button
                  type="button"
                  onClick={handleSaveFlyerContact}
                  disabled={isSavingFlyerContact}
                  className="rounded-lg bg-slate-800 px-4 py-2 text-sm font-medium text-white transition duration-200 hover:bg-slate-700 disabled:opacity-50"
                >
                  {isSavingFlyerContact ? 'Saving...' : 'Save Flyer Contact'}
                </button>
                {flyerContactMessage && (
                  <p className="mt-2 text-sm text-gray-600">{flyerContactMessage}</p>
                )}
              </div>
            </div>
          </div>

          {/* Current Campaign */}
          <div className="bg-white shadow rounded-lg p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Current Campaign</h2>
            {campaign ? (
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Campaign Name</label>
                  <p className="text-gray-900">{campaign.name}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Season</label>
                  <p className="text-gray-900">{campaign.season}</p>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Sale Starts</label>
                    <p className="text-gray-900">
                      {format(new Date(campaign.saleStartDate), 'MMM dd, yyyy')}
                    </p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Sale Ends</label>
                    <p className="text-gray-900">
                      {format(new Date(campaign.saleEndDate), 'MMM dd, yyyy')}
                    </p>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Delivery Date</label>
                  <p className="text-gray-900">
                    {format(new Date(campaign.deliveryDate), 'MMM dd, yyyy')}
                  </p>
                </div>
              </div>
            ) : (
              <p className="text-gray-500">No active campaign currently set up.</p>
            )}
          </div>
        </div>

        {/* Flyer Download Section */}
        {campaign && (
          <div className="bg-white shadow rounded-lg p-6 mt-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Download Your Flyer</h2>
            <p className="text-gray-600 mb-4">
              Generate and download a printable PDF door hanger with your personal QR code and the
              current campaign information.
            </p>

            <div className="mb-4 rounded-lg border border-blue-200 bg-blue-50 p-4 text-sm text-blue-900">
              <p className="font-medium">Preview before you download</p>
              <p className="mt-1">
                The PDF download is designed to match this flyer preview and uses your saved flyer
                contact details.
              </p>
              <p className="mt-2">{flyerContactSummary}</p>
            </div>

            {qrError && (
              <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                {qrError}
              </div>
            )}

            {downloadError && (
              <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                {downloadError}
              </div>
            )}

            {downloadMessage && (
              <div className="mb-4 rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">
                {downloadMessage}
              </div>
            )}

            {qrCodeDataUrl ? (
              <div className="flex flex-col items-center gap-3 mb-4">
                <img
                  src={qrCodeDataUrl}
                  alt="Scout fundraising QR code"
                  className="w-40 h-40 border rounded-lg"
                />
                <p className="text-sm text-gray-600 text-center">
                  Scan this code to go directly to your fundraising page.
                </p>
              </div>
            ) : (
              <p className="text-gray-500 mb-4">Generating QR code...</p>
            )}

            <div className="flex flex-wrap items-center gap-3">
              <button
                onClick={handleDownloadFlyer}
                disabled={!canDownloadFlyer}
                className={`${
                  !canDownloadFlyer
                    ? 'bg-gray-400 cursor-not-allowed'
                    : 'bg-blue-600 hover:bg-blue-700'
                } text-white font-medium py-2 px-4 rounded-lg transition duration-200`}
              >
                {isDownloading ? 'Generating PDF...' : 'Download Flyer PDF'}
              </button>

              <button
                onClick={() => setIsPreviewing((state) => !state)}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-medium py-2 px-4 rounded-lg transition duration-200"
                type="button"
              >
                {isPreviewing ? 'Hide Preview' : 'Preview Flyer'}
              </button>
            </div>

            {!qrCodeDataUrl && !qrError && (
              <p className="mt-3 text-sm text-gray-500">
                The download button will be available as soon as your QR code is ready.
              </p>
            )}

            {isPreviewing && (
              <div className="mt-6 rounded-lg border border-blue-200 bg-white p-4 shadow-sm">
                <h3 className="mb-3 text-lg font-semibold text-gray-900">Flyer Preview</h3>
                <p className="mb-4 text-sm text-gray-600">
                  This preview reflects the same flyer layout used for the PDF download.
                </p>
                <MulchDoorHangerFlyer
                  scoutName={scout.displayName}
                  fundraiserUrl={scout.externalFundraisingUrl}
                  orderDeadline={format(new Date(campaign.saleEndDate), 'MMM dd, yyyy')}
                  deliveryDate={format(new Date(campaign.deliveryDate), 'MMM dd, yyyy')}
                  phone={flyerPhone || undefined}
                  email={flyerEmail || scout.email}
                  troopNumber="771"
                  products={['Black', 'Hardwood', 'Cedar', 'Compost', 'Soil']}
                  backgroundImageUrl="/images/scout-flag.jpg.png"
                />
              </div>
            )}
          </div>
        )}

        <div className="bg-white shadow rounded-lg p-6 mt-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Email Previous Customers</h2>
          {campaign ? (
            <div className="space-y-4">
              <p className="text-gray-600">
                Edit your outreach draft, preview merge variables for a specific customer, choose
                who should receive it, and send through Resend.
              </p>

              <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950">
                Emails sent from this tool will not come directly from your personal email address.
                They will be sent from the Troop 771 sending address, such as
                `troop771@tolantech.com`, and replies will go to your flyer email when one is set.
                If you want the message to come from your own inbox, use the preview and `Copy
                Preview`, then send it from your email account instead.
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="rounded-lg border border-gray-200 p-4">
                  <p className="text-sm font-medium text-gray-700">Previous Campaign</p>
                  <p className="mt-1 text-gray-900">
                    {previousCampaign ? previousCampaign.name : 'No previous campaign found'}
                  </p>
                </div>
                <div className="rounded-lg border border-gray-200 p-4">
                  <p className="text-sm font-medium text-gray-700">Recipients</p>
                  <p className="mt-1 text-gray-900">
                    {previousCampaignCustomers.length} customer
                    {previousCampaignCustomers.length === 1 ? '' : 's'}
                  </p>
                </div>
              </div>

              <div className="rounded-lg border border-blue-200 bg-blue-50 p-4 text-sm text-blue-900">
                <p className="font-medium">Supported merge variables</p>
                <p className="mt-2">
                  {'{{customerName}}'}, {'{{customerFirstName}}'}, {'{{previousOrder}}'},{' '}
                  {'{{previousCampaignName}}'}, {'{{previousCampaignSeason}}'}, {'{{scoutName}}'},
                  {' {{campaignName}}'}, {'{{campaignSeason}}'}, {'{{saleEndDate}}'},{' '}
                  {'{{deliveryDate}}'}, {'{{fundraisingUrl}}'}
                </p>
              </div>

              {!previousCampaign && (
                <p className="text-sm text-gray-500">
                  Add or keep an older campaign in the system to target previous customers.
                </p>
              )}

              {previousCampaign && previousCampaignCustomers.length === 0 && (
                <p className="text-sm text-gray-500">
                  No customer orders were found for you in {previousCampaign.name}.
                </p>
              )}

              {!outreachDraft && (
                <p className="text-sm text-gray-500">
                  No active outreach email template is available yet. Create one in the `Email
                  Templates` collection.
                </p>
              )}

              {outreachDraft && previousCampaignCustomers.length > 0 && (
                <>
                  <div className="grid grid-cols-1 gap-4">
                    <div>
                      <label className="mb-2 block text-sm font-medium text-gray-700">
                        Subject Template
                      </label>
                      <Input
                        value={subjectTemplate}
                        onChange={(event) => setSubjectTemplate(event.target.value)}
                      />
                    </div>
                    <div>
                      <label className="mb-2 block text-sm font-medium text-gray-700">
                        Body Template
                      </label>
                      <Textarea
                        rows={10}
                        value={bodyTemplate}
                        onChange={(event) => setBodyTemplate(event.target.value)}
                      />
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-3">
                    <button
                      type="button"
                      onClick={handleSaveDraft}
                      disabled={isSavingDraft}
                      className="rounded-lg bg-slate-800 px-4 py-2 text-sm font-medium text-white transition duration-200 hover:bg-slate-700 disabled:opacity-50"
                    >
                      {isSavingDraft ? 'Saving...' : 'Save Draft'}
                    </button>
                    <button
                      type="button"
                      onClick={handleSendEmails}
                      disabled={isSendingEmails || selectedCustomerIds.length === 0}
                      className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition duration-200 hover:bg-blue-700 disabled:opacity-50"
                    >
                      {isSendingEmails
                        ? 'Sending...'
                        : `Send to ${selectedCustomerIds.length} customer${selectedCustomerIds.length === 1 ? '' : 's'}`}
                    </button>
                  </div>

                  {saveMessage && <p className="text-sm text-gray-600">{saveMessage}</p>}
                  {sendMessage && <p className="text-sm text-gray-600">{sendMessage}</p>}

                  <div className="rounded-lg border border-gray-200 p-4">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <h3 className="text-lg font-semibold text-gray-900">Recipients</h3>
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={handleSelectAllCustomers}
                          className="rounded-lg bg-slate-100 px-3 py-2 text-sm font-medium text-slate-900 transition duration-200 hover:bg-slate-200"
                        >
                          Select All
                        </button>
                        <button
                          type="button"
                          onClick={handleClearSelectedCustomers}
                          className="rounded-lg bg-slate-100 px-3 py-2 text-sm font-medium text-slate-900 transition duration-200 hover:bg-slate-200"
                        >
                          Clear
                        </button>
                      </div>
                    </div>

                    <div className="mt-4 space-y-3">
                      {previousCampaignCustomers.map((customer) => (
                        <label
                          key={customer.id}
                          className="flex items-start gap-3 rounded-lg border border-gray-200 p-3"
                        >
                          <Checkbox
                            checked={selectedCustomerIds.includes(customer.id)}
                            onCheckedChange={(checked) =>
                              toggleCustomer(customer.id, checked === true)
                            }
                          />
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center justify-between gap-2">
                              <div>
                                <p className="font-medium text-gray-900">{customer.name}</p>
                                <p className="text-sm text-gray-600">{customer.email}</p>
                              </div>
                              <button
                                type="button"
                                onClick={() => setPreviewCustomerId(customer.id)}
                                className="rounded-lg bg-slate-100 px-3 py-1.5 text-sm font-medium text-slate-900 transition duration-200 hover:bg-slate-200"
                              >
                                Preview
                              </button>
                            </div>
                            <p className="mt-2 text-sm text-gray-700">
                              Previous order: {customer.previousOrder}
                            </p>
                            {customer.lastSentAt && (
                              <p className="mt-1 text-xs text-gray-500">
                                Last send: {format(new Date(customer.lastSentAt), 'MMM dd, yyyy h:mm a')} (
                                {customer.lastSentStatus})
                              </p>
                            )}
                          </div>
                        </label>
                      ))}
                    </div>
                  </div>

                  {renderedPreview && previewCustomer && (
                    <div className="rounded-lg border border-gray-200 p-4">
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <h3 className="text-lg font-semibold text-gray-900">Preview</h3>
                        <button
                          type="button"
                          onClick={handleCopyPreview}
                          className="rounded-lg bg-slate-100 px-3 py-2 text-sm font-medium text-slate-900 transition duration-200 hover:bg-slate-200"
                        >
                          Copy Preview
                        </button>
                      </div>
                      <p className="mt-2 text-sm text-gray-600">
                        Showing merged preview for {previewCustomer.name}
                      </p>
                      {copyMessage && <p className="mt-2 text-sm text-gray-600">{copyMessage}</p>}
                      <p className="mt-4 text-sm font-medium text-gray-700">Subject</p>
                      <p className="mt-1 text-gray-900">{renderedPreview.subject}</p>
                      <p className="mt-4 text-sm font-medium text-gray-700">Body</p>
                      <pre className="mt-1 whitespace-pre-wrap font-sans text-gray-900">
                        {renderedPreview.body}
                      </pre>
                    </div>
                  )}

                  <div className="rounded-lg border border-gray-200 p-4">
                    <h3 className="text-lg font-semibold text-gray-900">Send History</h3>
                    {recentSendHistory.length > 0 ? (
                      <div className="mt-3 space-y-3">
                        {recentSendHistory.map((entry) => (
                          <div
                            key={entry.id}
                            className="rounded-lg border border-gray-200 p-3 text-sm text-gray-700"
                          >
                            <div className="flex flex-wrap items-center justify-between gap-2">
                              <p className="font-medium text-gray-900">
                                {entry.customerName} ({entry.recipientEmail})
                              </p>
                              <span
                                className={`rounded-full px-2 py-1 text-xs font-semibold ${
                                  entry.status === 'sent'
                                    ? 'bg-green-100 text-green-800'
                                    : 'bg-red-100 text-red-800'
                                }`}
                              >
                                {entry.status}
                              </span>
                            </div>
                            <p className="mt-1">{entry.subject}</p>
                            <p className="mt-1 text-xs text-gray-500">
                              {format(new Date(entry.sentAt), 'MMM dd, yyyy h:mm a')}
                            </p>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="mt-3 text-sm text-gray-500">
                        No outreach emails have been sent for this campaign yet.
                      </p>
                    )}
                  </div>
                </>
              )}
            </div>
          ) : (
            <p className="text-gray-500">No active campaign is available for outreach.</p>
          )}
        </div>
      </div>
    </div>
  )
}
