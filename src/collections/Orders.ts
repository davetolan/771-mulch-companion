import type { CollectionConfig } from 'payload'

import { adminOnly, adminOrScoutOwnedByScout } from '@/access/scoutAccess'

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
    read: adminOrScoutOwnedByScout,
    update: adminOnly,
  },
  admin: {
    defaultColumns: ['customer', 'scout', 'campaign', 'type', 'rallyUpStatus', 'totalProductCount'],
  },
  fields: [
    {
      name: 'type',
      type: 'select',
      defaultValue: 'product_order',
      required: true,
      options: [
        {
          label: 'Product Order',
          value: 'product_order',
        },
        {
          label: 'Donation',
          value: 'donation',
        },
      ],
    },
    {
      name: 'rallyUpPaymentId',
      type: 'text',
      index: true,
      admin: {
        description: 'External RallyUp PaymentID',
      },
    },
    {
      name: 'rallyUpParticipantId',
      type: 'text',
      index: true,
      admin: {
        description: 'External RallyUp ParticipantID credited for this order',
      },
    },
    {
      name: 'customer',
      type: 'relationship',
      relationTo: 'customers',
      required: true,
      index: true,
    },
    {
      name: 'scout',
      type: 'relationship',
      relationTo: 'scouts',
      required: false,
      index: true,
      admin: {
        description: 'Scout credited for this order. RallyUp imports always set this value.',
      },
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
      required: false,
      validate: (value, { siblingData }) => {
        const orderType = (siblingData as { type?: string } | undefined)?.type

        if (
          orderType !== 'donation' &&
          (!Array.isArray(value) || value.length === 0)
        ) {
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
          name: 'rallyUpProductName',
          type: 'text',
          admin: {
            description: 'Original RallyUp item name, such as Potting Soil or Compost Manure',
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
      name: 'rallyUpStatus',
      type: 'text',
      index: true,
      admin: {
        description: 'Original RallyUp payment status, such as Paid or Voided',
      },
    },
    {
      name: 'paymentType',
      type: 'text',
      admin: {
        description: 'RallyUp payment type, such as Card or Check',
      },
    },
    {
      name: 'checkNumber',
      type: 'text',
    },
    {
      name: 'processingType',
      type: 'text',
    },
    {
      name: 'source',
      type: 'text',
    },
    {
      name: 'fundCode',
      type: 'text',
    },
    {
      name: 'contributionDate',
      type: 'date',
      admin: {
        date: {
          pickerAppearance: 'dayAndTime',
        },
      },
    },
    {
      name: 'paidDate',
      type: 'date',
      admin: {
        date: {
          pickerAppearance: 'dayAndTime',
        },
      },
    },
    {
      name: 'lastUpdatedDate',
      type: 'date',
      admin: {
        date: {
          pickerAppearance: 'dayAndTime',
        },
      },
    },
    {
      name: 'amount',
      type: 'number',
      admin: {
        step: 0.01,
      },
    },
    {
      name: 'storeAmount',
      type: 'number',
      admin: {
        step: 0.01,
      },
    },
    {
      name: 'totalAmount',
      type: 'number',
      admin: {
        step: 0.01,
      },
    },
    {
      name: 'flatAmount',
      type: 'number',
      admin: {
        step: 0.01,
      },
    },
    {
      name: 'itemAmount',
      type: 'number',
      admin: {
        step: 0.01,
      },
    },
    {
      name: 'totalRallyUpFee',
      type: 'number',
      admin: {
        step: 0.01,
      },
    },
    {
      name: 'processingFee',
      type: 'number',
      admin: {
        step: 0.01,
      },
    },
    {
      name: 'feesPaidByDonor',
      type: 'number',
      admin: {
        step: 0.01,
      },
    },
    {
      name: 'afterFees',
      type: 'number',
      admin: {
        step: 0.01,
      },
    },
    {
      name: 'deliveryInstructions',
      type: 'textarea',
    },
    {
      name: 'delivered',
      type: 'checkbox',
      defaultValue: false,
    },
    {
      name: 'anonymousDonation',
      type: 'checkbox',
      defaultValue: false,
    },
    {
      name: 'comment',
      type: 'textarea',
    },
    {
      name: 'cancellationReason',
      type: 'textarea',
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
