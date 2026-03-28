import type { CollectionConfig } from 'payload'

import { authenticated } from '@/access/authenticated'
import { adminOnly } from '@/access/scoutAccess'

export const EmailTemplates: CollectionConfig = {
  slug: 'email-templates',
  access: {
    admin: adminOnly,
    create: adminOnly,
    delete: adminOnly,
    read: authenticated,
    update: adminOnly,
  },
  admin: {
    defaultColumns: ['name', 'purpose', 'active', 'updatedAt'],
    useAsTitle: 'name',
  },
  fields: [
    {
      name: 'name',
      type: 'text',
      required: true,
      unique: true,
    },
    {
      name: 'purpose',
      type: 'select',
      required: true,
      defaultValue: 'previous-campaign-outreach',
      options: [
        {
          label: 'Previous Campaign Outreach',
          value: 'previous-campaign-outreach',
        },
      ],
      admin: {
        description: 'What this template is intended to be used for.',
      },
    },
    {
      name: 'subject',
      type: 'text',
      required: true,
      admin: {
        description:
          'Available placeholders: {{customerName}}, {{customerFirstName}}, {{previousOrder}}, {{previousCampaignName}}, {{previousCampaignSeason}}, {{scoutName}}, {{campaignName}}, {{campaignSeason}}, {{saleEndDate}}, {{deliveryDate}}, {{fundraisingUrl}}',
      },
    },
    {
      name: 'body',
      type: 'textarea',
      required: true,
      admin: {
        description:
          'Use plain text. Available placeholders: {{customerName}}, {{customerFirstName}}, {{previousOrder}}, {{previousCampaignName}}, {{previousCampaignSeason}}, {{scoutName}}, {{campaignName}}, {{campaignSeason}}, {{saleEndDate}}, {{deliveryDate}}, {{fundraisingUrl}}',
      },
    },
    {
      name: 'active',
      type: 'checkbox',
      defaultValue: true,
      admin: {
        description: 'Scouts will use the most recently updated active template for this purpose.',
      },
    },
  ],
  timestamps: true,
}
