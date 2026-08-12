import type { CollectionConfig } from 'payload'

import { adminOnly } from '@/access/scoutAccess'

export const ClerkWebhookEvents: CollectionConfig = {
  slug: 'clerk-webhook-events',
  access: {
    admin: adminOnly,
    create: adminOnly,
    delete: adminOnly,
    read: adminOnly,
    update: adminOnly,
  },
  admin: {
    defaultColumns: ['svixId', 'eventType', 'status', 'processedAt', 'createdAt'],
    useAsTitle: 'svixId',
  },
  fields: [
    {
      name: 'svixId',
      type: 'text',
      required: true,
      unique: true,
      index: true,
    },
    {
      name: 'eventId',
      type: 'text',
      required: true,
      index: true,
    },
    {
      name: 'eventType',
      type: 'select',
      options: [
        {
          label: 'User created',
          value: 'user.created',
        },
        {
          label: 'User updated',
          value: 'user.updated',
        },
      ],
      required: true,
    },
    {
      name: 'status',
      type: 'select',
      defaultValue: 'received',
      options: [
        {
          label: 'Received',
          value: 'received',
        },
        {
          label: 'Processed',
          value: 'processed',
        },
        {
          label: 'Failed',
          value: 'failed',
        },
      ],
      required: true,
    },
    {
      name: 'processedAt',
      type: 'date',
    },
  ],
  timestamps: true,
}
