import type { CollectionConfig } from 'payload'

import { adminOnly, adminOrScout, adminOrScoutOwnedByScout } from '@/access/scoutAccess'

export const ScoutEmailCampaigns: CollectionConfig = {
  slug: 'scout-email-campaigns',
  access: {
    admin: adminOnly,
    create: adminOrScout,
    delete: adminOrScoutOwnedByScout,
    read: adminOrScoutOwnedByScout,
    update: adminOrScoutOwnedByScout,
  },
  admin: {
    defaultColumns: ['scout', 'currentCampaign', 'previousCampaign', 'updatedAt'],
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
      name: 'subjectTemplate',
      type: 'text',
      required: true,
    },
    {
      name: 'bodyTemplate',
      type: 'textarea',
      required: true,
    },
  ],
  timestamps: true,
}
