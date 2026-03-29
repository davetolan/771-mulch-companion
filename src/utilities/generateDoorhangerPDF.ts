import { readFile } from 'node:fs/promises'
import path from 'node:path'

import { format, isValid, parseISO } from 'date-fns'
import {
  PDFDocument,
  type PDFFont,
  type PDFImage,
  type PDFPage,
  StandardFonts,
  rgb,
} from 'pdf-lib'

interface DoorhangerData {
  scoutName: string
  campaignName: string
  saleEndDate: string
  deliveryDate: string
  qrCodeBuffer: Buffer
  troopName?: string
  flyerEmail?: string
  flyerPhone?: string
  flyerHeadline?: string
  flyerBody?: string
}

interface PanelBounds {
  x: number
  y: number
  width: number
  height: number
}

interface FitResult {
  lines: string[]
  fontSize: number
}

interface FlyerAssets {
  headerImage: PDFImage
  qrImage: PDFImage
  boldFont: PDFFont
  regularFont: PDFFont
}

interface TextStyle {
  color: ReturnType<typeof rgb>
  font: PDFFont
  size: number
}

const DATE_FORMAT = 'MMM dd, yyyy'
const HEADER_IMAGE_PATH = path.join(process.cwd(), 'public', 'images', 'scout-flag.jpg.png')
const DEFAULT_CONTACT_EMAIL = 'contact@troop771.org'
const DEFAULT_PRODUCTS = ['Black', 'Hardwood', 'Cedar', 'Compost', 'Soil']

const PAGE_WIDTH = 612
const PAGE_HEIGHT = 792
const PAGE_MARGIN = 18
const PANEL_GAP = 18
const PANEL_WIDTH = (PAGE_WIDTH - PAGE_MARGIN * 2 - PANEL_GAP) / 2
const PANEL_HEIGHT = PAGE_HEIGHT - PAGE_MARGIN * 2

const PANEL_LAYOUT = {
  borderRadius: 20,
  borderWidth: 2,
  inset: 12,
  imageHeight: 230,
  imageBottomGap: 46,
  sectionGap: 16,
  closingGap: 22,
  contentGap: 18,
  qrInset: 6,
} as const

const CARD_LAYOUT = {
  borderRadius: 16,
  borderWidth: 1.5,
  orderHeight: 88,
  deliveryHeight: 58,
  qrHeight: 128,
} as const

const FONT_SIZES = {
  namePreferred: 18,
  nameMin: 12,
  introPreferred: 10.5,
  introMin: 8.5,
  productsPreferred: 12,
  productsMin: 9,
  orderPreferred: 11,
  orderMin: 9,
  contactHeading: 9.25,
  contactBody: 8.25,
  deliveryLabel: 10,
  deliveryPreferred: 13,
  deliveryMin: 10,
  orderToday: 12,
  qr: 76,
  closingPreferred: 9.25,
  closingMin: 8,
  thankYou: 10,
  troopPreferred: 20,
  troopMin: 14,
} as const

const COLORS = {
  panelBackground: rgb(0.961, 0.961, 0.961),
  cardBackground: rgb(1, 1, 1),
  blue: rgb(0.118, 0.278, 0.671),
  blueText: rgb(0.098, 0.192, 0.475),
  red: rgb(0.89, 0.153, 0.176),
  white: rgb(1, 1, 1),
}

function normalizeWhitespace(value: string): string {
  return value.replace(/\s+/g, ' ').trim()
}

function splitIntoLines(text: string): string[] {
  return text
    .split('\n')
    .map((line) => normalizeWhitespace(line))
    .filter(Boolean)
}

export function truncateTextToWidth(
  text: string,
  font: PDFFont,
  fontSize: number,
  maxWidth: number,
): string {
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
  maxLines?: number,
): string[] {
  const normalized = normalizeWhitespace(text)
  if (!normalized) return []

  const words = normalized.split(' ')
  const lines: string[] = []
  let currentLine = ''

  for (const word of words) {
    const candidate = currentLine ? `${currentLine} ${word}` : word

    if (font.widthOfTextAtSize(candidate, fontSize) <= maxWidth) {
      currentLine = candidate
      continue
    }

    if (currentLine) {
      lines.push(currentLine)
      currentLine = word
      if (maxLines && lines.length === maxLines) {
        return lines
      }
      continue
    }

    lines.push(truncateTextToWidth(word, font, fontSize, maxWidth))
    if (maxLines && lines.length === maxLines) {
      return lines
    }
  }

  if (currentLine) {
    lines.push(currentLine)
  }

  if (!maxLines) {
    return lines
  }

  if (lines.length <= maxLines) {
    return lines
  }

  return lines.slice(0, maxLines)
}

function drawRoundedRect(
  page: PDFPage,
  x: number,
  y: number,
  width: number,
  height: number,
  borderRadius: number,
  fillColor: ReturnType<typeof rgb>,
  borderColor: ReturnType<typeof rgb>,
  borderWidth: number,
) {
  const radius = Math.min(borderRadius, width / 2, height / 2)
  const right = x + width
  const top = y + height
  const path = [
    `M ${x + radius} ${y}`,
    `L ${right - radius} ${y}`,
    `Q ${right} ${y} ${right} ${y + radius}`,
    `L ${right} ${top - radius}`,
    `Q ${right} ${top} ${right - radius} ${top}`,
    `L ${x + radius} ${top}`,
    `Q ${x} ${top} ${x} ${top - radius}`,
    `L ${x} ${y + radius}`,
    `Q ${x} ${y} ${x + radius} ${y}`,
    'Z',
  ].join(' ')

  page.drawSvgPath(path, {
    color: fillColor,
    borderColor,
    borderWidth,
  })
}

function fitWrappedText(
  text: string,
  font: PDFFont,
  maxWidth: number,
  maxLines: number,
  preferredSize: number,
  minSize: number,
): FitResult {
  let fontSize = preferredSize

  while (fontSize >= minSize) {
    const lines = wrapTextToWidth(text, font, fontSize, maxWidth)
    if (lines.length <= maxLines) {
      return { lines, fontSize }
    }

    fontSize -= 0.5
  }

  return {
    lines: wrapTextToWidth(text, font, minSize, maxWidth).slice(0, maxLines),
    fontSize: minSize,
  }
}

function drawCenteredLines(
  page: PDFPage,
  lines: string[],
  centerX: number,
  topY: number,
  font: PDFFont,
  fontSize: number,
  lineHeight: number,
  color: ReturnType<typeof rgb>,
) {
  lines.forEach((line, index) => {
    const width = font.widthOfTextAtSize(line, fontSize)
    page.drawText(line, {
      x: centerX - width / 2,
      y: topY - fontSize - index * lineHeight,
      size: fontSize,
      font,
      color,
    })
  })
}

function drawCard(page: PDFPage, x: number, y: number, width: number, height: number) {
  drawRoundedRect(
    page,
    x,
    y,
    width,
    height,
    CARD_LAYOUT.borderRadius,
    COLORS.cardBackground,
    COLORS.blue,
    CARD_LAYOUT.borderWidth,
  )
}

function drawCenteredText(page: PDFPage, value: string, centerX: number, y: number, style: TextStyle) {
  const width = style.font.widthOfTextAtSize(value, style.size)
  page.drawText(value, {
    x: centerX - width / 2,
    y,
    size: style.size,
    font: style.font,
    color: style.color,
  })
}

function drawImageCover(page: PDFPage, image: PDFImage, x: number, y: number, width: number, height: number) {
  const imageRatio = image.width / image.height
  const boxRatio = width / height

  let drawWidth = width
  let drawHeight = height
  let drawX = x
  let drawY = y

  if (imageRatio > boxRatio) {
    drawHeight = height
    drawWidth = height * imageRatio
    drawX = x - (drawWidth - width) / 2
  } else {
    drawWidth = width
    drawHeight = width / imageRatio
    drawY = y - (drawHeight - height) / 2
  }

  page.drawImage(image, {
    x: drawX,
    y: drawY,
    width: drawWidth,
    height: drawHeight,
  })
}

function formatDoorhangerDate(dateValue: string): string {
  const parsed = parseISO(dateValue)
  if (!isValid(parsed)) {
    return dateValue
  }

  return format(parsed, DATE_FORMAT)
}

async function loadHeaderImage(pdfDoc: PDFDocument): Promise<PDFImage> {
  const imageBytes = await readFile(HEADER_IMAGE_PATH)
  return pdfDoc.embedPng(imageBytes)
}

function drawFlyerPanel(
  page: PDFPage,
  bounds: PanelBounds,
  data: DoorhangerData,
  assets: FlyerAssets,
) {
  const { x, y, width, height } = bounds
  const inset = PANEL_LAYOUT.inset
  const contentX = x + inset
  const contentWidth = width - inset * 2
  const centerX = x + width / 2

  drawRoundedRect(
    page,
    x,
    y,
    width,
    height,
    PANEL_LAYOUT.borderRadius,
    COLORS.panelBackground,
    COLORS.blue,
    PANEL_LAYOUT.borderWidth,
  )

  const imageHeight = PANEL_LAYOUT.imageHeight
  drawImageCover(page, assets.headerImage, x + 1, y + height - imageHeight - 1, width - 2, imageHeight)

  let cursorY = y + height - imageHeight - PANEL_LAYOUT.imageBottomGap

  const nameFit = fitWrappedText(
    `My name is ${data.scoutName}`,
    assets.boldFont,
    contentWidth - 20,
    2,
    FONT_SIZES.namePreferred,
    FONT_SIZES.nameMin,
  )
  drawCenteredLines(
    page,
    nameFit.lines,
    centerX,
    cursorY,
    assets.boldFont,
    nameFit.fontSize,
    nameFit.fontSize * 1.2,
    COLORS.blueText,
  )
  cursorY -= nameFit.lines.length * nameFit.fontSize * 1.2 + 12

  const introText =
    'I would like to speak to you about our Scout Spring fundraiser; We offer high quality professional mulch from Jemasco only available to landscapers and Scouts!'
  const introFit = fitWrappedText(
    introText,
    assets.regularFont,
    contentWidth - 12,
    5,
    FONT_SIZES.introPreferred,
    FONT_SIZES.introMin,
  )
  drawCenteredLines(
    page,
    introFit.lines,
    centerX,
    cursorY,
    assets.regularFont,
    introFit.fontSize,
    introFit.fontSize * 1.35,
    COLORS.blueText,
  )
  cursorY -= introFit.lines.length * introFit.fontSize * 1.35 + PANEL_LAYOUT.contentGap

  const productFit = fitWrappedText(
    DEFAULT_PRODUCTS.join(', '),
    assets.boldFont,
    contentWidth - 20,
    2,
    FONT_SIZES.productsPreferred,
    FONT_SIZES.productsMin,
  )
  drawCenteredLines(
    page,
    productFit.lines,
    centerX,
    cursorY,
    assets.boldFont,
    productFit.fontSize,
    productFit.fontSize * 1.2,
    COLORS.red,
  )
  cursorY -= productFit.lines.length * productFit.fontSize * 1.25 + PANEL_LAYOUT.contentGap

  const orderCardHeight = CARD_LAYOUT.orderHeight
  drawCard(page, contentX, cursorY - orderCardHeight, contentWidth, orderCardHeight)

  const orderDeadlineLine = `Order Deadline: ${formatDoorhangerDate(data.saleEndDate)}`
  const orderFit = fitWrappedText(
    orderDeadlineLine,
    assets.boldFont,
    contentWidth - 22,
    1,
    FONT_SIZES.orderPreferred,
    FONT_SIZES.orderMin,
  )
  drawCenteredLines(
    page,
    orderFit.lines,
    centerX,
    cursorY - 14,
    assets.boldFont,
    orderFit.fontSize,
    orderFit.fontSize * 1.1,
    COLORS.blueText,
  )

  const contactLines = splitIntoLines(
    [
      'Questions?',
      data.flyerPhone ? `Call/Text: ${data.flyerPhone}` : 'Call/Text:',
      `Email: ${data.flyerEmail || DEFAULT_CONTACT_EMAIL}`,
    ].join('\n'),
  )

  contactLines.forEach((line, index) => {
    const font = index === 0 ? assets.boldFont : assets.regularFont
    drawCenteredText(page, line, centerX, cursorY - 34 - index * 12, {
      font,
      size: index === 0 ? FONT_SIZES.contactHeading : FONT_SIZES.contactBody,
      color: COLORS.blueText,
    })
  })
  cursorY -= orderCardHeight + PANEL_LAYOUT.sectionGap

  const deliveryCardHeight = CARD_LAYOUT.deliveryHeight
  drawCard(page, contentX, cursorY - deliveryCardHeight, contentWidth, deliveryCardHeight)
  drawCenteredText(page, 'Delivery On', centerX, cursorY - 18, {
    font: assets.boldFont,
    size: FONT_SIZES.deliveryLabel,
    color: COLORS.blueText,
  })
  const deliveryFit = fitWrappedText(
    formatDoorhangerDate(data.deliveryDate),
    assets.boldFont,
    contentWidth - 20,
    1,
    FONT_SIZES.deliveryPreferred,
    FONT_SIZES.deliveryMin,
  )
  drawCenteredLines(
    page,
    deliveryFit.lines,
    centerX,
    cursorY - 28,
    assets.boldFont,
    deliveryFit.fontSize,
    deliveryFit.fontSize,
    COLORS.red,
  )
  cursorY -= deliveryCardHeight + PANEL_LAYOUT.sectionGap

  const qrCardHeight = CARD_LAYOUT.qrHeight
  drawCard(page, contentX, cursorY - qrCardHeight, contentWidth, qrCardHeight)
  drawCenteredText(page, 'Order Today!', centerX, cursorY - 18, {
    font: assets.boldFont,
    size: FONT_SIZES.orderToday,
    color: COLORS.red,
  })

  const qrSize = FONT_SIZES.qr
  drawRoundedRect(
    page,
    centerX - qrSize / 2 - PANEL_LAYOUT.qrInset,
    cursorY - 106,
    qrSize + PANEL_LAYOUT.qrInset * 2,
    qrSize + PANEL_LAYOUT.qrInset * 2,
    10,
    COLORS.white,
    COLORS.white,
    0,
  )
  page.drawImage(assets.qrImage, {
    x: centerX - qrSize / 2,
    y: cursorY - 100,
    width: qrSize,
    height: qrSize,
  })
  cursorY -= qrCardHeight + PANEL_LAYOUT.closingGap

  const closingText =
    'All sales proceeds assist in sending Scouts to summer camp and fund needed equipment.'
  const closingFit = fitWrappedText(
    closingText,
    assets.boldFont,
    contentWidth - 12,
    3,
    FONT_SIZES.closingPreferred,
    FONT_SIZES.closingMin,
  )
  drawCenteredLines(
    page,
    closingFit.lines,
    centerX,
    cursorY,
    assets.boldFont,
    closingFit.fontSize,
    closingFit.fontSize * 1.25,
    COLORS.blueText,
  )
  cursorY -= closingFit.lines.length * closingFit.fontSize * 1.25 + PANEL_LAYOUT.contentGap

  drawCenteredText(page, 'Thank you for supporting', centerX, cursorY - 10, {
    font: assets.boldFont,
    size: FONT_SIZES.thankYou,
    color: COLORS.blue,
  })

  const troopLabel = `Troop ${data.troopName?.replace(/^Troop\s*/i, '') || '771'}`
  const troopFit = fitWrappedText(
    troopLabel,
    assets.boldFont,
    contentWidth - 8,
    1,
    FONT_SIZES.troopPreferred,
    FONT_SIZES.troopMin,
  )
  drawCenteredLines(
    page,
    troopFit.lines,
    centerX,
    cursorY - 16,
    assets.boldFont,
    troopFit.fontSize,
    troopFit.fontSize,
    COLORS.blueText,
  )
}

export async function generateDoorhangerPDF(data: DoorhangerData): Promise<Buffer> {
  const pdfDoc = await PDFDocument.create()
  const page = pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT])

  const [boldFont, regularFont, headerImage, qrImage] = await Promise.all([
    pdfDoc.embedFont(StandardFonts.HelveticaBold),
    pdfDoc.embedFont(StandardFonts.Helvetica),
    loadHeaderImage(pdfDoc),
    pdfDoc.embedPng(data.qrCodeBuffer),
  ])

  const leftPanel: PanelBounds = {
    x: PAGE_MARGIN,
    y: PAGE_MARGIN,
    width: PANEL_WIDTH,
    height: PANEL_HEIGHT,
  }

  const rightPanel: PanelBounds = {
    x: leftPanel.x + PANEL_WIDTH + PANEL_GAP,
    y: PAGE_MARGIN,
    width: PANEL_WIDTH,
    height: PANEL_HEIGHT,
  }

  drawFlyerPanel(page, leftPanel, data, { headerImage, qrImage, boldFont, regularFont })
  drawFlyerPanel(page, rightPanel, data, { headerImage, qrImage, boldFont, regularFont })

  const pdfBytes = await pdfDoc.save()
  return Buffer.from(pdfBytes)
}

export { formatDoorhangerDate }
