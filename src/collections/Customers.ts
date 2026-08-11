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
      name: 'rallyUpDonorId',
      type: 'text',
      index: true,
      admin: {
        description: 'External RallyUp donor ID from the latest import',
      },
    },
    {
      name: 'address',
      type: 'text',
      required: true,
    },
    {
      name: 'address2',
      type: 'text',
      required: false,
    },
    {
      name: 'address3',
      type: 'text',
      required: false,
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
      name: 'state',
      type: 'text',
      required: false,
    },
    {
      name: 'country',
      type: 'text',
      required: false,
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
      required: false,
      admin: {
        description:
          'Legacy scout assignment. RallyUp imports assign scout credit on orders instead.',
      },
    },
  ],
  timestamps: true,
}
