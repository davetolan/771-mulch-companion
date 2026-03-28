import { readFile } from 'node:fs/promises'
import path from 'node:path'

import { format, isValid, parseISO } from 'date-fns'
import { PDFDocument, type PDFFont, type PDFImage, type PDFPage, StandardFonts } from 'pdf-lib'

interface DoorhangerData {
  scoutName: string
  campaignName: string
  saleEndDate: string
  deliveryDate: string
  qrCodeBuffer: Buffer
  troopName?: string
  troopContact?: string
  flyerHeadline?: string
  flyerBody?: string
}

interface TextPlacement {
  x: number
  y: number
  size: number
  maxWidth: number
  minSize?: number
}

interface WrappedTextPlacement extends TextPlacement {
  lineHeight: number
  maxLines: number
}

const TEMPLATE_PDF_PATH = path.join(process.cwd(), 'public', 'templates', 'doorhanger-template.pdf')
const DATE_FORMAT = 'MMM dd, yyyy'

const SCOUT_NAME_X = 50
const TOP_SCOUT_NAME_Y = 674
const BOTTOM_SCOUT_NAME_Y = 365
const SCOUT_NAME_SIZE = 15
const SCOUT_NAME_MAX_WIDTH = 165
const SCOUT_NAME_MIN_SIZE = 11

const SALE_END_X = 42
const TOP_SALE_END_Y = 542
const BOTTOM_SALE_END_Y = 234
const SALE_END_SIZE = 14
const SALE_END_MAX_WIDTH = 190
const SALE_END_MIN_SIZE = 11

const TROOP_CONTACT_X = 54
const TOP_TROOP_CONTACT_Y = 511
const BOTTOM_TROOP_CONTACT_Y = 202
const TROOP_CONTACT_SIZE = 8
const TROOP_CONTACT_MAX_WIDTH = 170
const TROOP_CONTACT_MIN_SIZE = 7

const DELIVERY_X = 72
const TOP_DELIVERY_Y = 440
const BOTTOM_DELIVERY_Y = 132
const DELIVERY_SIZE = 16
const DELIVERY_MAX_WIDTH = 160
const DELIVERY_MIN_SIZE = 11

const QR_X = 77
const TOP_QR_Y = 305
const BOTTOM_QR_Y = -2
const QR_SIZE = 106

const DEFAULT_CONTACT = 'contact@troop771.org'

const TOP_SCOUT_NAME: TextPlacement = {
  x: SCOUT_NAME_X,
  y: TOP_SCOUT_NAME_Y,
  size: SCOUT_NAME_SIZE,
  maxWidth: SCOUT_NAME_MAX_WIDTH,
  minSize: SCOUT_NAME_MIN_SIZE,
}

const BOTTOM_SCOUT_NAME: TextPlacement = {
  x: SCOUT_NAME_X,
  y: BOTTOM_SCOUT_NAME_Y,
  size: SCOUT_NAME_SIZE,
  maxWidth: SCOUT_NAME_MAX_WIDTH,
  minSize: SCOUT_NAME_MIN_SIZE,
}

const TOP_SALE_END: TextPlacement = {
  x: SALE_END_X,
  y: TOP_SALE_END_Y,
  size: SALE_END_SIZE,
  maxWidth: SALE_END_MAX_WIDTH,
  minSize: SALE_END_MIN_SIZE,
}

const BOTTOM_SALE_END: TextPlacement = {
  x: SALE_END_X,
  y: BOTTOM_SALE_END_Y,
  size: SALE_END_SIZE,
  maxWidth: SALE_END_MAX_WIDTH,
  minSize: SALE_END_MIN_SIZE,
}

const TOP_TROOP_CONTACT: WrappedTextPlacement = {
  x: TROOP_CONTACT_X,
  y: TOP_TROOP_CONTACT_Y,
  size: TROOP_CONTACT_SIZE,
  maxWidth: TROOP_CONTACT_MAX_WIDTH,
  minSize: TROOP_CONTACT_MIN_SIZE,
  lineHeight: 9,
  maxLines: 2,
}

const BOTTOM_TROOP_CONTACT: WrappedTextPlacement = {
  x: TROOP_CONTACT_X,
  y: BOTTOM_TROOP_CONTACT_Y,
  size: TROOP_CONTACT_SIZE,
  maxWidth: TROOP_CONTACT_MAX_WIDTH,
  minSize: TROOP_CONTACT_MIN_SIZE,
  lineHeight: 9,
  maxLines: 2,
}

const TOP_DELIVERY: TextPlacement = {
  x: DELIVERY_X,
  y: TOP_DELIVERY_Y,
  size: DELIVERY_SIZE,
  maxWidth: DELIVERY_MAX_WIDTH,
  minSize: DELIVERY_MIN_SIZE,
}

const BOTTOM_DELIVERY: TextPlacement = {
  x: DELIVERY_X,
  y: BOTTOM_DELIVERY_Y,
  size: DELIVERY_SIZE,
  maxWidth: DELIVERY_MAX_WIDTH,
  minSize: DELIVERY_MIN_SIZE,
}

const TOP_QR = { x: QR_X, y: TOP_QR_Y, size: QR_SIZE }
const BOTTOM_QR = { x: QR_X, y: BOTTOM_QR_Y, size: QR_SIZE }

function normalizeWhitespace(value: string): string {
  return value.replace(/\s+/g, ' ').trim()
}

export function truncateTextToWidth(text: string, font: PDFFont, fontSize: number, maxWidth: number): string {
  const normalized = normalizeWhitespace(text)
  if (!normalized) return ''

  if (font.widthOfTextAtSize(normalized, fontSize) <= maxWidth) {
    return normalized
  }

  const ellipsis = '…'
  let truncated = normalized

  while (truncated.length > 0) {
    const next = `${truncated}${ellipsis}`
    if (font.widthOfTextAtSize(next, fontSize) <= maxWidth) {
      return next
    }

    truncated = truncated.slice(0, -1).trimEnd()
  }

  return ellipsis
}

export function fitTextToWidth(
  text: string,
  font: PDFFont,
  size: number,
  maxWidth: number,
  minSize = 8,
): { text: string; size: number } {
  const normalized = normalizeWhitespace(text)
  if (!normalized) return { text: '', size }

  let currentSize = size
  while (currentSize > minSize && font.widthOfTextAtSize(normalized, currentSize) > maxWidth) {
    currentSize -= 0.5
  }

  if (font.widthOfTextAtSize(normalized, currentSize) <= maxWidth) {
    return { text: normalized, size: currentSize }
  }

  return {
    text: truncateTextToWidth(normalized, font, currentSize, maxWidth),
    size: currentSize,
  }
}

export function wrapTextToWidth(
  text: string,
  font: PDFFont,
  fontSize: number,
  maxWidth: number,
  maxLines: number,
): string[] {
  const normalized = normalizeWhitespace(text)
  if (!normalized) return []

  const words = normalized.split(' ')
  const lines: string[] = []
  let currentLine = ''

  for (const word of words) {
    const candidateLine = currentLine ? `${currentLine} ${word}` : word

    if (font.widthOfTextAtSize(candidateLine, fontSize) <= maxWidth) {
      currentLine = candidateLine
      continue
    }

    if (!currentLine) {
      lines.push(truncateTextToWidth(word, font, fontSize, maxWidth))
    } else {
      lines.push(currentLine)
      currentLine = word
    }

    if (lines.length === maxLines) {
      return lines
    }
  }

  if (currentLine && lines.length < maxLines) {
    lines.push(currentLine)
  }

  if (lines.length > maxLines) {
    return lines.slice(0, maxLines)
  }

  if (lines.length === maxLines && words.join(' ').length > lines.join(' ').length) {
    lines[maxLines - 1] = truncateTextToWidth(lines[maxLines - 1], font, fontSize, maxWidth)
  }

  return lines
}

function drawFittedText(page: PDFPage, value: string, placement: TextPlacement, font: PDFFont) {
  const fitted = fitTextToWidth(value, font, placement.size, placement.maxWidth, placement.minSize)

  if (!fitted.text) return

  page.drawText(fitted.text, {
    x: placement.x,
    y: placement.y,
    size: fitted.size,
    font,
    maxWidth: placement.maxWidth,
  })
}

function drawWrappedText(page: PDFPage, value: string, placement: WrappedTextPlacement, font: PDFFont) {
  const fitted = fitTextToWidth(value, font, placement.size, placement.maxWidth, placement.minSize)
  const lines = wrapTextToWidth(
    fitted.text,
    font,
    fitted.size,
    placement.maxWidth,
    placement.maxLines,
  )

  lines.forEach((line, index) => {
    page.drawText(line, {
      x: placement.x,
      y: placement.y - index * placement.lineHeight,
      size: fitted.size,
      font,
      maxWidth: placement.maxWidth,
    })
  })
}

export function formatDoorhangerDate(dateValue: string): string {
  const parsed = parseISO(dateValue)
  if (!isValid(parsed)) {
    return dateValue
  }

  return format(parsed, DATE_FORMAT)
}

function drawTemplateFields(
  page: PDFPage,
  data: DoorhangerData,
  mode: 'top' | 'bottom',
  fonts: { bold: PDFFont; regular: PDFFont },
  qrImage: PDFImage,
) {
  if (mode === 'top') {
    drawFittedText(page, data.scoutName, TOP_SCOUT_NAME, fonts.bold)
    drawFittedText(page, formatDoorhangerDate(data.saleEndDate), TOP_SALE_END, fonts.bold)
    drawWrappedText(page, data.troopContact || DEFAULT_CONTACT, TOP_TROOP_CONTACT, fonts.regular)
    drawFittedText(page, formatDoorhangerDate(data.deliveryDate), TOP_DELIVERY, fonts.bold)

    page.drawImage(qrImage, {
      x: TOP_QR.x,
      y: TOP_QR.y,
      width: TOP_QR.size,
      height: TOP_QR.size,
    })

    return
  }

  drawFittedText(page, data.scoutName, BOTTOM_SCOUT_NAME, fonts.bold)
  drawFittedText(page, formatDoorhangerDate(data.saleEndDate), BOTTOM_SALE_END, fonts.bold)
  drawWrappedText(page, data.troopContact || DEFAULT_CONTACT, BOTTOM_TROOP_CONTACT, fonts.regular)
  drawFittedText(page, formatDoorhangerDate(data.deliveryDate), BOTTOM_DELIVERY, fonts.bold)

  page.drawImage(qrImage, {
    x: BOTTOM_QR.x,
    y: BOTTOM_QR.y,
    width: BOTTOM_QR.size,
    height: BOTTOM_QR.size,
  })
}

export async function generateDoorhangerPDF(data: DoorhangerData): Promise<Buffer> {
  const templateBytes = await readFile(TEMPLATE_PDF_PATH)
  const pdfDoc = await PDFDocument.load(templateBytes)

  const [page] = pdfDoc.getPages()
  if (!page) {
    throw new Error('Doorhanger template does not include a drawable page')
  }

  const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold)
  const regularFont = await pdfDoc.embedFont(StandardFonts.Helvetica)
  const qrImage = await pdfDoc.embedPng(data.qrCodeBuffer)

  drawTemplateFields(page, data, 'top', { bold: boldFont, regular: regularFont }, qrImage)
  drawTemplateFields(page, data, 'bottom', { bold: boldFont, regular: regularFont }, qrImage)

  const pdfBytes = await pdfDoc.save()
  return Buffer.from(pdfBytes)
}
