import type { Payload, PayloadRequest } from 'payload'

type CSVRow = Record<string, string>

export type RallyUpImportAction = 'import' | 'preview'

type RallyUpImportArgs = {
  action: RallyUpImportAction
  campaignId: number
  donationsCSV: string
  participantsCSV: string
  payload: Payload
  req: PayloadRequest
}

type ParsedItem = {
  productName: string
  quantity: number
  rallyUpName: string
}

type ImportIssue = {
  message: string
  paymentId?: string
  participantId?: string
  row?: number
}

const PARTICIPANT_ID_HEADER = '"ID"'

const REQUIRED_PARTICIPANT_HEADERS = [
  PARTICIPANT_ID_HEADER,
  'Full Name',
  'First Name',
  'Last Name',
  'Email',
  'Amount Raised',
  'Registered By Name',
  'Registered By Email',
  'Registration Title',
  'Neighborhood Name (If Applicable)',
  'Team Member Sharing Link',
]

const REQUIRED_DONATION_HEADERS = [
  'PaymentID',
  'Donor Name',
  'First Name',
  'Last Name',
  'Phone',
  'Delivery First Name',
  'Delivery Last Name',
  'Address 1',
  'Address 2',
  'Address 3',
  'City',
  'Country',
  'State',
  'Zip Code',
  'Email',
  'Contribution Date',
  'Last Updated Date',
  'Paid Date',
  'Amount',
  'Store amount',
  'Total Amount',
  'Flat amount',
  'Item Amount',
  'Total RallyUp Fee',
  'Processing Fee',
  'Fees Paid by Donor',
  'After Fees',
  'Status',
  'ParticipantID',
  'Payment Type',
  'Check Number',
  'Processing Type',
  'Source',
  'Fund Code',
  'Item 1',
  'Item 2',
  'Item 3',
  'Delivery Instructions',
  'Anonymous Donation?',
  'Delivered?',
  'Comment',
  'Cancellation Reason',
  'DonorID',
]

const PRODUCT_NAME_MAP: Record<string, string> = {
  'Black Hardwood Mulch': 'Black',
  'Cedar Mulch': 'Cedar',
  'Compost Manure': 'Compost',
  'Hardwood Mulch': 'Hardwood',
  'Potting Soil': 'Soil',
}

const normalizeHeader = (value: string) => value.trim()

const normalizeValue = (value: string | null | undefined) => String(value || '').trim()

const normalizeEmail = (value: string | null | undefined) => normalizeValue(value).toLowerCase()

const parseCSV = (input: string): { headers: string[]; rows: CSVRow[] } => {
  const text = input.replace(/^\uFEFF/, '')
  const records: string[][] = []
  let field = ''
  let record: string[] = []
  let inQuotes = false

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index]
    const next = text[index + 1]

    if (char === '"') {
      if (inQuotes && next === '"') {
        field += '"'
        index += 1
      } else {
        inQuotes = !inQuotes
      }
      continue
    }

    if (char === ',' && !inQuotes) {
      record.push(field)
      field = ''
      continue
    }

    if ((char === '\n' || char === '\r') && !inQuotes) {
      if (char === '\r' && next === '\n') {
        index += 1
      }
      record.push(field)
      records.push(record)
      field = ''
      record = []
      continue
    }

    field += char
  }

  if (field || record.length > 0) {
    record.push(field)
    records.push(record)
  }

  const [headerRecord, ...dataRecords] = records.filter((entry) =>
    entry.some((value) => normalizeValue(value)),
  )

  if (!headerRecord) {
    return { headers: [], rows: [] }
  }

  const headers = headerRecord.map(normalizeHeader)
  const rows = dataRecords.map((dataRecord) => {
    return headers.reduce<CSVRow>((row, header, index) => {
      row[header] = normalizeValue(dataRecord[index])
      return row
    }, {})
  })

  return { headers, rows }
}

const assertHeaders = (label: string, headers: string[], requiredHeaders: string[]) => {
  const missing = requiredHeaders.filter((header) => !headers.includes(header))

  if (missing.length > 0) {
    throw new Error(`${label} is missing required headers: ${missing.join(', ')}`)
  }
}

const parseMoney = (value: string) => {
  const normalized = normalizeValue(value).replace(/[$,]/g, '')
  if (!normalized) return undefined

  const parsed = Number(normalized)
  return Number.isFinite(parsed) ? parsed : undefined
}

const parseDate = (value: string) => {
  const normalized = normalizeValue(value)
  if (!normalized) return undefined

  const parsed = new Date(normalized)
  return Number.isNaN(parsed.getTime()) ? undefined : parsed.toISOString()
}

const parseBoolean = (value: string) => normalizeValue(value).toLowerCase() === 'yes'

const parseItem = (value: string): ParsedItem | null => {
  const normalized = normalizeValue(value)
  if (!normalized) return null

  const match = normalized.match(/^(.*) \(Qty:(\d+)\)$/)
  if (!match) {
    throw new Error(`Cannot parse RallyUp item value: ${normalized}`)
  }

  const rallyUpName = match[1]
  const productName = PRODUCT_NAME_MAP[rallyUpName]

  if (!productName) {
    throw new Error(`No Payload product mapping exists for RallyUp item: ${rallyUpName}`)
  }

  return {
    productName,
    quantity: Number(match[2]),
    rallyUpName,
  }
}

const getDonationItems = (donation: CSVRow) => {
  return ['Item 1', 'Item 2', 'Item 3'].flatMap((field) => {
    const item = parseItem(donation[field])
    return item ? [item] : []
  })
}

const slugify = (value: string) =>
  value
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^\w-]/g, '')

const getCustomerName = (donation: CSVRow) => {
  const deliveryName = `${donation['Delivery First Name']} ${donation['Delivery Last Name']}`.trim()
  return deliveryName || donation['Donor Name'] || `${donation['First Name']} ${donation['Last Name']}`.trim()
}

export const runRallyUpImport = async ({
  action,
  campaignId,
  donationsCSV,
  participantsCSV,
  payload,
  req,
}: RallyUpImportArgs) => {
  const participants = parseCSV(participantsCSV)
  const donations = parseCSV(donationsCSV)

  assertHeaders('participants.csv', participants.headers, REQUIRED_PARTICIPANT_HEADERS)
  assertHeaders('donations.csv', donations.headers, REQUIRED_DONATION_HEADERS)

  const campaign = await payload.findByID({
    collection: 'campaigns',
    id: campaignId,
    depth: 0,
    overrideAccess: false,
    req,
  })

  const participantsById = new Map(
    participants.rows.map((participant) => [participant[PARTICIPANT_ID_HEADER], participant]),
  )
  const donationItemsByKey = new Map<string, ParsedItem[]>()
  const issues: ImportIssue[] = []
  const blockingIssues: ImportIssue[] = []
  const skippedDonationRows = new Set<number>()
  const statuses = new Map<string, number>()
  const productNames = new Set<string>()
  const uniqueOrderKeys = new Set<string>()
  const duplicateOrderKeys = new Set<string>()

  donations.rows.forEach((donation, index) => {
    const paymentId = donation.PaymentID
    const participantId = donation.ParticipantID
    const key = `${paymentId}:${participantId}`

    statuses.set(donation.Status, (statuses.get(donation.Status) || 0) + 1)

    if (!paymentId || !participantId) {
      skippedDonationRows.add(index)
      issues.push({
        message: 'Donation row is missing PaymentID or ParticipantID',
        paymentId,
        participantId,
        row: index + 2,
      })
      return
    }

    if (uniqueOrderKeys.has(key)) {
      duplicateOrderKeys.add(key)
    }
    uniqueOrderKeys.add(key)

    if (!participantsById.has(participantId)) {
      skippedDonationRows.add(index)
      issues.push({
        message: 'Donation ParticipantID does not exist in participants.csv',
        paymentId,
        participantId,
        row: index + 2,
      })
    }

    try {
      const items = getDonationItems(donation)
      donationItemsByKey.set(key, items)
      items.forEach((item) => productNames.add(item.productName))
    } catch (error) {
      const issue = {
        message: error instanceof Error ? error.message : 'Unable to parse donation item',
        paymentId,
        participantId,
        row: index + 2,
      }
      issues.push(issue)
      blockingIssues.push(issue)
    }
  })

  const products = await payload.find({
    collection: 'products',
    depth: 0,
    limit: 100,
    overrideAccess: false,
    req,
    where: {
      name: {
        in: Array.from(productNames),
      },
    },
  })

  const productsByName = new Map(products.docs.map((product) => [product.name, product]))

  for (const productName of productNames) {
    if (!productsByName.has(productName)) {
      const issue = {
        message: `Payload product "${productName}" does not exist`,
      }
      issues.push(issue)
      blockingIssues.push(issue)
    }
  }

  const summary = {
    campaign: {
      id: campaign.id,
      name: campaign.name,
    },
    donationOnlyRows: Array.from(donationItemsByKey.values()).filter((items) => items.length === 0)
      .length,
    donations: donations.rows.length,
    duplicateOrderKeys: duplicateOrderKeys.size,
    issues,
    participants: participants.rows.length,
    productOrderRows: Array.from(donationItemsByKey.values()).filter((items) => items.length > 0)
      .length,
    products: Array.from(productNames).sort(),
    skippedDonationRows: skippedDonationRows.size,
    statuses: Object.fromEntries(statuses),
    uniqueOrderKeys: uniqueOrderKeys.size,
  }

  if (blockingIssues.length > 0 || action === 'preview') {
    return {
      ...summary,
      imported: false,
      results: {
        customersCreated: 0,
        customersUpdated: 0,
        ordersCreated: 0,
        ordersUpdated: 0,
        scoutsCreated: 0,
        scoutsUpdated: 0,
      },
    }
  }

  const results = {
    customersCreated: 0,
    customersUpdated: 0,
    ordersCreated: 0,
    ordersUpdated: 0,
    scoutsCreated: 0,
    scoutsUpdated: 0,
  }

  const scoutsByParticipantId = new Map<string, number>()

  for (const participant of participants.rows) {
    const participantId = participant[PARTICIPANT_ID_HEADER]
    const email = normalizeEmail(participant.Email)
    const fullName = participant['Full Name'] || `${participant['First Name']} ${participant['Last Name']}`.trim()

    if (!participantId || !email || !fullName || !participant['Team Member Sharing Link']) {
      throw new Error(`Participant ${participantId || '(missing ID)'} is missing required scout data`)
    }

    const existingScout = await payload.find({
      collection: 'scouts',
      depth: 0,
      limit: 1,
      overrideAccess: false,
      req,
      where: {
        or: [
          {
            rallyUpParticipantId: {
              equals: participantId,
            },
          },
          {
            email: {
              equals: email,
            },
          },
        ],
      },
    })

    const scoutData = {
      active: true,
      amountRaised: parseMoney(participant['Amount Raised']),
      displayName: fullName,
      email,
      externalFundraisingUrl: participant['Team Member Sharing Link'],
      firstName: participant['First Name'] || fullName,
      flyerPhone: participant['Phone Number'],
      lastName: participant['Last Name'] || fullName,
      neighborhoodName: participant['Neighborhood Name (If Applicable)'],
      rallyUpParticipantId: participantId,
      registeredByEmail: normalizeEmail(participant['Registered By Email']) || undefined,
      registeredByName: participant['Registered By Name'],
      registrationTitle: participant['Registration Title'],
      slug: slugify(fullName),
    }

    const scout = existingScout.docs[0]
      ? await payload.update({
          collection: 'scouts',
          id: existingScout.docs[0].id,
          data: scoutData,
          overrideAccess: false,
          req,
        })
      : await payload.create({
          collection: 'scouts',
          data: scoutData,
          overrideAccess: false,
          req,
        })

    if (existingScout.docs[0]) {
      results.scoutsUpdated += 1
    } else {
      results.scoutsCreated += 1
    }

    scoutsByParticipantId.set(participantId, scout.id)
  }

  const customersByEmail = new Map<string, number>()

  for (const [donationIndex, donation] of donations.rows.entries()) {
    if (skippedDonationRows.has(donationIndex)) {
      continue
    }

    const email = normalizeEmail(donation.Email)
    const participantId = donation.ParticipantID
    const paymentId = donation.PaymentID
    const scoutId = scoutsByParticipantId.get(participantId)

    if (!email) {
      throw new Error(`Donation ${paymentId} is missing customer email`)
    }
    if (!scoutId) {
      throw new Error(`Donation ${paymentId} references unknown participant ${participantId}`)
    }

    const existingCustomer =
      customersByEmail.get(email) == null
        ? await payload.find({
            collection: 'customers',
            depth: 0,
            limit: 1,
            overrideAccess: false,
            req,
            where: {
              email: {
                equals: email,
              },
            },
          })
        : null

    const customerData = {
      address: donation['Address 1'] || 'Unknown',
      address2: donation['Address 2'],
      address3: donation['Address 3'],
      city: donation.City || 'Unknown',
      country: donation.Country,
      email,
      name: getCustomerName(donation) || email,
      phoneNumber: donation.Phone || 'Unknown',
      rallyUpDonorId: donation.DonorID,
      state: donation.State,
      zip: donation['Zip Code'] || 'Unknown',
    }

    const customerIdFromCache = customersByEmail.get(email)
    const customer =
      customerIdFromCache != null
        ? await payload.update({
            collection: 'customers',
            id: customerIdFromCache,
            data: customerData,
            overrideAccess: false,
            req,
          })
        : existingCustomer?.docs[0]
          ? await payload.update({
              collection: 'customers',
              id: existingCustomer.docs[0].id,
              data: customerData,
              overrideAccess: false,
              req,
            })
          : await payload.create({
              collection: 'customers',
              data: customerData,
              overrideAccess: false,
              req,
            })

    if (customerIdFromCache != null || existingCustomer?.docs[0]) {
      results.customersUpdated += 1
    } else {
      results.customersCreated += 1
    }

    customersByEmail.set(email, customer.id)

    const key = `${paymentId}:${participantId}`
    const parsedItems = donationItemsByKey.get(key) || []
    const orderType: 'donation' | 'product_order' =
      parsedItems.length > 0 ? 'product_order' : 'donation'
    const items = parsedItems.map((item) => {
      const product = productsByName.get(item.productName)
      if (!product) {
        throw new Error(`Payload product "${item.productName}" does not exist`)
      }

      return {
        count: item.quantity,
        product: product.id,
        rallyUpProductName: item.rallyUpName,
      }
    })

    const existingOrder = await payload.find({
      collection: 'orders',
      depth: 0,
      limit: 1,
      overrideAccess: false,
      req,
      where: {
        and: [
          {
            campaign: {
              equals: campaign.id,
            },
          },
          {
            rallyUpPaymentId: {
              equals: paymentId,
            },
          },
          {
            rallyUpParticipantId: {
              equals: participantId,
            },
          },
        ],
      },
    })

    const orderData = {
      afterFees: parseMoney(donation['After Fees']),
      amount: parseMoney(donation.Amount),
      anonymousDonation: parseBoolean(donation['Anonymous Donation?']),
      campaign: campaign.id,
      cancellationReason: donation['Cancellation Reason'],
      checkNumber: donation['Check Number'],
      comment: donation.Comment,
      contributionDate: parseDate(donation['Contribution Date']),
      customer: customer.id,
      delivered: parseBoolean(donation['Delivered?']),
      deliveryInstructions: donation['Delivery Instructions'],
      feesPaidByDonor: parseMoney(donation['Fees Paid by Donor']),
      flatAmount: parseMoney(donation['Flat amount']),
      fundCode: donation['Fund Code'],
      itemAmount: parseMoney(donation['Item Amount']),
      items,
      lastUpdatedDate: parseDate(donation['Last Updated Date']),
      paidDate: parseDate(donation['Paid Date']),
      paymentType: donation['Payment Type'],
      processingFee: parseMoney(donation['Processing Fee']),
      processingType: donation['Processing Type'],
      rallyUpParticipantId: participantId,
      rallyUpPaymentId: paymentId,
      rallyUpStatus: donation.Status,
      scout: scoutId,
      source: donation.Source,
      storeAmount: parseMoney(donation['Store amount']),
      totalAmount: parseMoney(donation['Total Amount']),
      totalRallyUpFee: parseMoney(donation['Total RallyUp Fee']),
      type: orderType,
    }

    if (existingOrder.docs[0]) {
      await payload.update({
        collection: 'orders',
        id: existingOrder.docs[0].id,
        data: orderData,
        overrideAccess: false,
        req,
      })
      results.ordersUpdated += 1
    } else {
      await payload.create({
        collection: 'orders',
        data: orderData,
        overrideAccess: false,
        req,
      })
      results.ordersCreated += 1
    }
  }

  return {
    ...summary,
    imported: true,
    results,
  }
}
