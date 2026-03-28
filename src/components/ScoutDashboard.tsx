'use client'

import type { Scout, Campaign, User } from '@/payload-types'
import { format } from 'date-fns'
import { useEffect, useState } from 'react'
import { generateQRCodeDataURL } from '@/utilities/generateQRCode'
import MulchDoorHangerFlyer from './MulchDoorHangerFlyer'

interface ScoutDashboardProps {
  scout: Scout
  campaign: Campaign | null
  user: User
}

export function ScoutDashboard({ scout, campaign, user }: ScoutDashboardProps) {
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string | null>(null)
  const [qrError, setQrError] = useState<string | null>(null)
  const [isDownloading, setIsDownloading] = useState(false)
  const [downloadError, setDownloadError] = useState<string | null>(null)
  const [isPreviewing, setIsPreviewing] = useState(false)

  useEffect(() => {
    if (!scout?.externalFundraisingUrl) {
      setQrError('No external fundraising URL available.')
      return
    }

    generateQRCodeDataURL(scout.externalFundraisingUrl)
      .then(setQrCodeDataUrl)
      .catch((error) => {
        console.error('QR code generation failed', error)
        setQrError('Could not generate QR code.')
      })
  }, [scout.externalFundraisingUrl])

  const handleDownloadFlyer = async () => {
    if (!campaign) {
      setDownloadError('No active campaign available.')
      return
    }

    setIsDownloading(true)
    setDownloadError(null)

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
          troopName: 'Scout Troop Mulch Fundraiser',
          flyerHeadline: campaign.flyerHeadline,
          flyerBody: campaign.flyerBody,
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
    } catch (error) {
      console.error('Download error:', error)
      setDownloadError(
        error instanceof Error ? error.message : 'Failed to download flyer. Please try again.',
      )
    } finally {
      setIsDownloading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="bg-white shadow rounded-lg p-6 mb-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Welcome, {scout.displayName}!</h1>
          <p className="text-gray-600">Your personal fundraiser dashboard</p>
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

            {qrError && <p className="text-red-600 mb-2">{qrError}</p>}

            {downloadError && <p className="text-red-600 mb-2">{downloadError}</p>}

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
                disabled={isDownloading || !qrCodeDataUrl}
                className={`${
                  isDownloading || !qrCodeDataUrl
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

            {isPreviewing && (
              <div className="mt-6 rounded-lg border border-blue-200 bg-white p-4 shadow-sm">
                <h3 className="mb-3 text-lg font-semibold text-gray-900">Flyer Preview</h3>
                <MulchDoorHangerFlyer
                  scoutName={scout.displayName}
                  fundraiserUrl={scout.externalFundraisingUrl}
                  orderDeadline={format(new Date(campaign.saleEndDate), 'MMM dd, yyyy')}
                  deliveryDate={format(new Date(campaign.deliveryDate), 'MMM dd, yyyy')}
                  phone={undefined}
                  email={scout.email}
                  troopNumber="771"
                  products={['Hardwood', 'Black', 'Cedar', 'Potting Soil', 'Manure']}
                  backgroundImageUrl="/images/scout-flag.jpg"
                />
              </div>
            )}
          </div>
        )}

        {/* Campaign Details */}
        {campaign && (
          <div className="bg-white shadow rounded-lg p-6 mt-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Campaign Details</h2>
            <div className="prose prose-gray max-w-none">
              <h3 className="text-lg font-medium text-gray-900 mb-2">{campaign.flyerHeadline}</h3>
              <p className="text-gray-700 whitespace-pre-line">{campaign.flyerBody}</p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
