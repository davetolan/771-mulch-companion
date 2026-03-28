import { describe, expect, it } from 'vitest'
import { PDFDocument, StandardFonts } from 'pdf-lib'

import {
  fitTextToWidth,
  formatDoorhangerDate,
  truncateTextToWidth,
  wrapTextToWidth,
} from '@/utilities/generateDoorhangerPDF'

async function getHelveticaFont() {
  const doc = await PDFDocument.create()
  return doc.embedFont(StandardFonts.Helvetica)
}

describe('doorhanger text bounds helpers', () => {
  it('truncates long scout names to fit without overflow', async () => {
    const font = await getHelveticaFont()
    const longScoutName = 'Alexandria-Montgomery Fitzgerald the Third of Troop Seven-Seventy-One'

    const truncated = truncateTextToWidth(longScoutName, font, 15, 165)

    expect(font.widthOfTextAtSize(truncated, 15)).toBeLessThanOrEqual(165)
    expect(truncated.endsWith('…')).toBe(true)
  })

  it('fits long values by reducing font size, then truncating when needed', async () => {
    const font = await getHelveticaFont()
    const longCampaignBody =
      'Our spring campaign includes dyed black mulch, premium hardwood, and delivery support for neighborhoods across the entire district.'

    const fitted = fitTextToWidth(longCampaignBody, font, 16, 160, 11)

    expect(fitted.size).toBeGreaterThanOrEqual(11)
    expect(font.widthOfTextAtSize(fitted.text, fitted.size)).toBeLessThanOrEqual(160)
  })

  it('wraps long contact emails and keeps each line inside bounds', async () => {
    const font = await getHelveticaFont()
    const longContactEmail =
      'troop.771.mulch.fundraiser.super.long.contact.alias+orders-and-delivery-updates@example-really-long-domain.org'

    const lines = wrapTextToWidth(longContactEmail, font, 8, 170, 2)

    expect(lines.length).toBeLessThanOrEqual(2)
    expect(lines.length).toBeGreaterThan(0)

    for (const line of lines) {
      expect(font.widthOfTextAtSize(line, 8)).toBeLessThanOrEqual(170)
    }
  })
})

describe('doorhanger date formatting', () => {
  it('formats ISO date strings to MMM dd, yyyy', () => {
    expect(formatDoorhangerDate('2026-04-15')).toBe('Apr 15, 2026')
  })

  it('keeps already formatted dates unchanged when parsing fails', () => {
    expect(formatDoorhangerDate('Apr 15, 2026')).toBe('Apr 15, 2026')
  })
})
