import { Buffer } from 'node:buffer'

import { describe, expect, it } from 'vitest'
import { PDFDocument, StandardFonts } from 'pdf-lib'

import {
  fitTextToWidth,
  formatDoorhangerDate,
  generateDoorhangerPDF,
  truncateTextToWidth,
  wrapTextToWidth,
} from '@/utilities/generateDoorhangerPDF'
import { generateQRCodeDataURL } from '@/utilities/generateQRCode'

async function getHelveticaFont() {
  const doc = await PDFDocument.create()
  return doc.embedFont(StandardFonts.Helvetica)
}

async function getQRCodeBuffer(url: string) {
  const dataUrl = await generateQRCodeDataURL(url)
  return Buffer.from(dataUrl.replace(/^data:image\/png;base64,/, ''), 'base64')
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

describe('doorhanger PDF generation', () => {
  it('creates a single portrait letter page for the side-by-side flyer layout', async () => {
    const pdfBuffer = await generateDoorhangerPDF({
      scoutName: 'William P. Seth',
      saleEndDate: '2027-03-21',
      deliveryDate: '2027-03-28',
      qrCodeBuffer: await getQRCodeBuffer('https://example.com/fundraiser'),
      troopName: '771',
      flyerEmail: 'scout@example.com',
      flyerPhone: '972-835-0410',
    })

    expect(pdfBuffer.byteLength).toBeGreaterThan(50_000)

    const pdfDoc = await PDFDocument.load(new Uint8Array(pdfBuffer))
    const pages = pdfDoc.getPages()

    expect(pages).toHaveLength(1)

    const { width, height } = pages[0].getSize()
    expect(width).toBe(612)
    expect(height).toBe(792)
    expect(height).toBeGreaterThan(width)
  })
})
