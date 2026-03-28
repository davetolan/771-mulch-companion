import type { CollectionConfig } from 'payload'

import { adminOnly, adminOrScout, adminOrScoutOwnedByScout } from '@/access/scoutAccess'

export const ScoutEmailSendLogs: CollectionConfig = {
  slug: 'scout-email-send-logs',
  access: {
    admin: adminOnly,
    create: adminOrScout,
    delete: adminOnly,
    read: adminOrScoutOwnedByScout,
    update: adminOnly,
  },
  admin: {
    defaultColumns: ['customer', 'recipientEmail', 'status', 'sentAt'],
  },
  fields: [
    {
      name: 'scout',
      type: 'relationship',
      relationTo: 'scouts',
      required: true,
      index: true,
    },
    {
      name: 'emailCampaign',
      type: 'relationship',
      relationTo: 'scout-email-campaigns',
      required: false,
      index: true,
    },
    {
      name: 'currentCampaign',
      type: 'relationship',
      relationTo: 'campaigns',
      required: true,
      index: true,
    },
    {
      name: 'previousCampaign',
      type: 'relationship',
      relationTo: 'campaigns',
      required: true,
      index: true,
    },
    {
      name: 'customer',
      type: 'relationship',
      relationTo: 'customers',
      required: true,
      index: true,
    },
    {
      name: 'recipientEmail',
      type: 'email',
      required: true,
    },
    {
      name: 'subject',
      type: 'text',
      required: true,
    },
    {
      name: 'body',
      type: 'textarea',
      required: true,
    },
    {
      name: 'status',
      type: 'select',
      required: true,
      options: [
        {
          label: 'Sent',
          value: 'sent',
        },
        {
          label: 'Failed',
          value: 'failed',
        },
      ],
    },
    {
      name: 'resendEmailId',
      type: 'text',
      required: false,
    },
    {
      name: 'errorMessage',
      type: 'textarea',
      required: false,
    },
    {
      name: 'sentAt',
      type: 'date',
      required: true,
      admin: {
        date: {
          pickerAppearance: 'dayAndTime',
        },
      },
    },
  ],
  timestamps: true,
}
