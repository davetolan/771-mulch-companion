'use client'

import type { Scout, Campaign, User } from '@/payload-types'
import { format } from 'date-fns'

interface ScoutDashboardProps {
  scout: Scout
  campaign: Campaign | null
  user: User
}

export function ScoutDashboard({ scout, campaign, user }: ScoutDashboardProps) {
  const handleDownloadFlyer = async () => {
    // TODO: Implement flyer PDF generation and download
    alert('Flyer download will be implemented next')
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="bg-white shadow rounded-lg p-6 mb-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Welcome, {scout.displayName}!
          </h1>
          <p className="text-gray-600">
            Your personal fundraiser dashboard
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Scout Information */}
          <div className="bg-white shadow rounded-lg p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">
              Your Information
            </h2>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Name
                </label>
                <p className="text-gray-900">{scout.displayName}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Email
                </label>
                <p className="text-gray-900">{scout.email}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Fundraising Link
                </label>
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
                <label className="block text-sm font-medium text-gray-700">
                  Status
                </label>
                <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                  scout.active
                    ? 'bg-green-100 text-green-800'
                    : 'bg-red-100 text-red-800'
                }`}>
                  {scout.active ? 'Active' : 'Inactive'}
                </span>
              </div>
            </div>
          </div>

          {/* Current Campaign */}
          <div className="bg-white shadow rounded-lg p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">
              Current Campaign
            </h2>
            {campaign ? (
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Campaign Name
                  </label>
                  <p className="text-gray-900">{campaign.name}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Season
                  </label>
                  <p className="text-gray-900">{campaign.season}</p>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Sale Starts
                    </label>
                    <p className="text-gray-900">
                      {format(new Date(campaign.saleStartDate), 'MMM dd, yyyy')}
                    </p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Sale Ends
                    </label>
                    <p className="text-gray-900">
                      {format(new Date(campaign.saleEndDate), 'MMM dd, yyyy')}
                    </p>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Delivery Date
                  </label>
                  <p className="text-gray-900">
                    {format(new Date(campaign.deliveryDate), 'MMM dd, yyyy')}
                  </p>
                </div>
              </div>
            ) : (
              <p className="text-gray-500">
                No active campaign currently set up.
              </p>
            )}
          </div>
        </div>

        {/* Flyer Download Section */}
        {campaign && (
          <div className="bg-white shadow rounded-lg p-6 mt-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">
              Download Your Flyer
            </h2>
            <p className="text-gray-600 mb-4">
              Generate and download a printable PDF flyer with your personal QR code
              and the current campaign information.
            </p>
            <button
              onClick={handleDownloadFlyer}
              className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg transition duration-200"
            >
              Download Flyer PDF
            </button>
          </div>
        )}

        {/* Campaign Details */}
        {campaign && (
          <div className="bg-white shadow rounded-lg p-6 mt-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">
              Campaign Details
            </h2>
            <div className="prose prose-gray max-w-none">
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                {campaign.flyerHeadline}
              </h3>
              <p className="text-gray-700 whitespace-pre-line">
                {campaign.flyerBody}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
