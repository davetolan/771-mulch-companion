import type { CollectionConfig } from 'payload'

import { authenticated } from '../../access/authenticated'

export const Campaigns: CollectionConfig = {
  slug: 'campaigns',
  access: {
    admin: authenticated,
    create: authenticated,
    delete: authenticated,
    read: authenticated,
    update: authenticated,
  },
  admin: {
    defaultColumns: ['name', 'season', 'active', 'saleEndDate', 'deliveryDate'],
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
      name: 'season',
      type: 'text',
      required: true,
      admin: {
        description: 'Fundraiser year or season (e.g., "2026 Spring", "Spring 2026")',
      },
    },
    {
      name: 'saleStartDate',
      type: 'date',
      required: true,
      admin: {
        description: 'When the campaign begins',
      },
    },
    {
      name: 'saleEndDate',
      type: 'date',
      required: true,
      admin: {
        description: 'When this campaign ends and orders close',
      },
    },
    {
      name: 'deliveryDate',
      type: 'date',
      required: true,
      admin: {
        description: 'When mulch will be delivered to customers',
      },
    },
    {
      name: 'active',
      type: 'checkbox',
      defaultValue: false,
      admin: {
        description: 'Mark as active to make this the current campaign for flyer generation',
      },
    },
    {
      name: 'flyerHeadline',
      type: 'text',
      required: true,
      admin: {
        description: 'Main headline for printed flyers',
      },
    },
    {
      name: 'flyerBody',
      type: 'textarea',
      required: true,
      admin: {
        description: 'Body text for printed flyers',
      },
    },
  ],
  timestamps: true,
}
