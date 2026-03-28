import { readFile } from 'node:fs/promises'
import path from 'node:path'

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

const TEMPLATE_PDF_PATH = path.join(process.cwd(), 'public', 'templates', 'doorhanger-template.pdf')

const FIELD_COORDINATES = {
  top: {
    scoutName: { x: 50, y: 674, size: 15, maxWidth: 165 },
    saleEndDate: { x: 42, y: 542, size: 14, maxWidth: 190 },
    troopContact: { x: 54, y: 511, size: 8, maxWidth: 170 },
    deliveryDate: { x: 72, y: 440, size: 16, maxWidth: 160 },
    qrCode: { x: 77, y: 305, size: 106 },
  },
  bottom: {
    scoutName: { x: 50, y: 365, size: 15, maxWidth: 165 },
    saleEndDate: { x: 42, y: 234, size: 14, maxWidth: 190 },
    troopContact: { x: 54, y: 202, size: 8, maxWidth: 170 },
    deliveryDate: { x: 72, y: 132, size: 16, maxWidth: 160 },
    qrCode: { x: 77, y: -2, size: 106 },
  },
} as const

type Placement = (typeof FIELD_COORDINATES)[keyof typeof FIELD_COORDINATES]

function drawTemplateFields(
  page: PDFPage,
  data: DoorhangerData,
  placement: Placement,
  fonts: { bold: PDFFont; regular: PDFFont },
  qrImage: PDFImage,
) {
  page.drawText(data.scoutName, {
    x: placement.scoutName.x,
    y: placement.scoutName.y,
    size: placement.scoutName.size,
    font: fonts.bold,
    maxWidth: placement.scoutName.maxWidth,
  })

  page.drawText(data.saleEndDate, {
    x: placement.saleEndDate.x,
    y: placement.saleEndDate.y,
    size: placement.saleEndDate.size,
    font: fonts.bold,
    maxWidth: placement.saleEndDate.maxWidth,
  })

  page.drawText(data.troopContact || 'contact@troop771.org', {
    x: placement.troopContact.x,
    y: placement.troopContact.y,
    size: placement.troopContact.size,
    font: fonts.regular,
    maxWidth: placement.troopContact.maxWidth,
  })

  page.drawText(data.deliveryDate, {
    x: placement.deliveryDate.x,
    y: placement.deliveryDate.y,
    size: placement.deliveryDate.size,
    font: fonts.bold,
    maxWidth: placement.deliveryDate.maxWidth,
  })

  page.drawImage(qrImage, {
    x: placement.qrCode.x,
    y: placement.qrCode.y,
    width: placement.qrCode.size,
    height: placement.qrCode.size,
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

  drawTemplateFields(page, data, FIELD_COORDINATES.top, { bold: boldFont, regular: regularFont }, qrImage)
  drawTemplateFields(page, data, FIELD_COORDINATES.bottom, { bold: boldFont, regular: regularFont }, qrImage)

  const pdfBytes = await pdfDoc.save()
  return Buffer.from(pdfBytes)
}
