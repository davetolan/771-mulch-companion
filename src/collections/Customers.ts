import type { CollectionConfig } from 'payload'

import { adminOnly } from '@/access/scoutAccess'
import { adminOrScoutSelf } from '@/access/scoutAccess'

export const Customers: CollectionConfig = {
  slug: 'customers',
  access: {
    admin: adminOnly,
    create: adminOrScoutSelf, // Allow scouts to create customers
    delete: adminOrScoutSelf,
    read: adminOrScoutSelf,
    update: adminOrScoutSelf,
  },
  admin: {
    defaultColumns: ['name', 'email', 'phoneNumber', 'city', 'scout'],
    useAsTitle: 'name',
  },
  fields: [
    {
      name: 'name',
      type: 'text',
      required: true,
    },
    {
      name: 'address',
      type: 'text',
      required: true,
    },
    {
      name: 'city',
      type: 'text',
      required: true,
    },
    {
      name: 'zip',
      type: 'text',
      required: true,
    },
    {
      name: 'phoneNumber',
      type: 'text',
      required: true,
    },
    {
      name: 'email',
      type: 'email',
      required: true,
    },
    {
      name: 'scout',
      type: 'relationship',
      relationTo: 'scouts',
      required: true,
      admin: {
        description: 'The scout this customer is assigned to',
      },
    },
  ],
  timestamps: true,
}