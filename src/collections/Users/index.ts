import type { CollectionConfig } from 'payload'
import { APIError } from 'payload'

import { adminOnly } from '../../access/scoutAccess'

export const Users: CollectionConfig = {
  slug: 'users',
  access: {
    admin: adminOnly,
    create: adminOnly,
    delete: adminOnly,
    read: adminOnly,
    update: adminOnly,
  },
  hooks: {
    beforeLogin: [
      async ({ user, req }) => {
        // Allow scout login through dedicated API path
        if (req?.pathname?.includes('/api/scout/login')) {
          return user
        }

        // Admin login only for regular admin login flow
        if (!user?.roles?.includes('admin')) {
          throw new APIError('Admin login only', 403)
        }

        return user
      },
    ],
  },
  admin: {
    defaultColumns: ['name', 'email', 'roles'],
    useAsTitle: 'name',
  },
  auth: true,
  fields: [
    {
      name: 'name',
      type: 'text',
    },
    {
      name: 'roles',
      type: 'select',
      hasMany: true,
      options: [
        {
          label: 'Admin',
          value: 'admin',
        },
        {
          label: 'Scout',
          value: 'scout',
        },
      ],
      defaultValue: ['scout'],
      required: true,
      saveToJWT: true,
    },
  ],
  timestamps: true,
}
