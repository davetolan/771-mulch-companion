import type { CollectionConfig } from 'payload'

import { adminOnly } from '../../access/scoutAccess'
import { adminOrScoutSelf } from '../../access/scoutAccess'

export const Scouts: CollectionConfig = {
  slug: 'scouts',
  access: {
    admin: adminOnly,
    create: adminOnly,
    delete: adminOnly,
    read: adminOrScoutSelf,
    update: adminOrScoutSelf,
  },
  admin: {
    defaultColumns: ['displayName', 'email', 'active', 'externalFundraisingUrl'],
    useAsTitle: 'displayName',
  },
  fields: [
    {
      name: 'firstName',
      type: 'text',
      required: true,
    },
    {
      name: 'lastName',
      type: 'text',
      required: true,
    },
    {
      name: 'displayName',
      type: 'text',
      required: true,
      admin: {
        description: 'Name to display on flyers and public pages',
      },
    },
    {
      name: 'email',
      type: 'email',
      required: true,
      unique: true,
    },
    {
      name: 'flyerEmail',
      type: 'email',
      required: false,
      admin: {
        description: 'Optional email shown on printed flyers (default uses scout email)',
      },
    },
    {
      name: 'flyerPhone',
      type: 'text',
      required: false,
      admin: {
        description: 'Optional phone number shown on printed flyers (default blank)',
      },
    },
    {
      name: 'externalFundraisingUrl',
      type: 'text',
      required: true,
      validate: (value: string | string[] | null | undefined) => {
        const url = Array.isArray(value) ? value[0] : value

        if (!url) return 'External fundraising URL is required'

        try {
          // Validate that it's a proper URL
          new URL(url)
          return true
        } catch {
          return 'Please enter a valid URL (e.g., https://example.com)'
        }
      },
      admin: {
        description:
          'Full URL from external fundraising system (e.g., https://fundraising-system.com/scout/abc123)',
      },
    },
    {
      name: 'slug',
      type: 'text',
      unique: true,
      admin: {
        description: 'Unique identifier for URLs (auto-generated from display name)',
        hidden: true,
      },
    },
    {
      name: 'active',
      type: 'checkbox',
      defaultValue: true,
      admin: {
        description: 'Inactive scouts will not appear in flyer generation or public listings',
      },
    },
    {
      name: 'user',
      type: 'relationship',
      relationTo: 'users',
      admin: {
        description: 'Optional associated Payload user account',
      },
    },
  ],
  timestamps: true,
  hooks: {
    beforeChange: [
      async ({ data }) => {
        // Auto-generate slug from displayName if not provided
        if (!data.slug && data.displayName) {
          data.slug = data.displayName
            .toLowerCase()
            .trim()
            .replace(/\s+/g, '-')
            .replace(/[^\w-]/g, '')
        }

        return data
      },
    ],
  },
}
