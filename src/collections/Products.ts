import type { CollectionConfig } from 'payload'

import { adminOnly } from '@/access/scoutAccess'

export const Products: CollectionConfig = {
  slug: 'products',
  access: {
    admin: adminOnly,
    create: adminOnly,
    delete: adminOnly,
    read: () => true, // Public read access
    update: adminOnly,
  },
  admin: {
    defaultColumns: ['name', 'active'],
    useAsTitle: 'name',
  },
  fields: [
    {
      name: 'name',
      type: 'text',
      index: true,
      required: true,
      unique: true,
    },
    {
      name: 'description',
      type: 'textarea',
      required: false,
    },
    {
      name: 'active',
      type: 'checkbox',
      defaultValue: true,
      admin: {
        description: 'Whether this product is currently available',
      },
    },
  ],
  timestamps: true,
}
