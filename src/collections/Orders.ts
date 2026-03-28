import type { CollectionConfig } from 'payload'

import { adminOnly } from '@/access/scoutAccess'

type OrderItemValue = {
  product?: number | string | { id: number | string } | null
  count?: number | null
}

export const Orders: CollectionConfig = {
  slug: 'orders',
  access: {
    admin: adminOnly,
    create: adminOnly,
    delete: adminOnly,
    read: adminOnly,
    update: adminOnly,
  },
  admin: {
    defaultColumns: ['customer', 'campaign', 'totalProductCount', 'createdAt'],
  },
  fields: [
    {
      name: 'customer',
      type: 'relationship',
      relationTo: 'customers',
      required: true,
      index: true,
    },
    {
      name: 'campaign',
      type: 'relationship',
      relationTo: 'campaigns',
      required: true,
      index: true,
    },
    {
      name: 'items',
      type: 'array',
      minRows: 1,
      required: true,
      validate: (value) => {
        if (!Array.isArray(value) || value.length === 0) {
          return 'At least one product is required'
        }

        const seen = new Set<string>()

        for (const item of value as OrderItemValue[]) {
          const productValue =
            typeof item?.product === 'object' && item.product !== null && 'id' in item.product
              ? String(item.product.id)
              : item?.product != null
                ? String(item.product)
                : null

          if (!productValue) {
            continue
          }

          if (seen.has(productValue)) {
            return 'Each product can only be added once per order'
          }

          seen.add(productValue)
        }

        return true
      },
      fields: [
        {
          name: 'product',
          type: 'relationship',
          relationTo: 'products',
          required: true,
          filterOptions: {
            active: {
              equals: true,
            },
          },
        },
        {
          name: 'count',
          type: 'number',
          min: 1,
          required: true,
          admin: {
            step: 1,
          },
        },
      ],
    },
    {
      name: 'totalProductCount',
      type: 'number',
      virtual: true,
      admin: {
        description: 'Calculated total quantity across all products in this order',
        readOnly: true,
      },
      hooks: {
        afterRead: [
          ({ siblingData }) =>
            Array.isArray(siblingData.items)
              ? siblingData.items.reduce((sum: number, item: { count?: number | null }) => {
                  return sum + (typeof item?.count === 'number' ? item.count : 0)
                }, 0)
              : 0,
        ],
      },
    },
  ],
  timestamps: true,
}
