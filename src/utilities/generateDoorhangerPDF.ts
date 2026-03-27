import { PDFDocument, rgb, StandardFonts } from 'pdf-lib'

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

const HANGER_WIDTH = 252 // 3.5" at 72 DPI
const HANGER_HEIGHT = 612 // 8.5" at 72 DPI

function drawHanger(page: any, x: number, y: number, data: DoorhangerData, fonts: { bold: any; regular: any }, qrImage: any) {
  // White background
  page.drawRectangle({ x, y, width: HANGER_WIDTH, height: HANGER_HEIGHT, color: rgb(1, 1, 1) })

  // Outer border
  page.drawRectangle({
    x: x + 4,
    y: y + 4,
    width: HANGER_WIDTH - 8,
    height: HANGER_HEIGHT - 8,
    borderColor: rgb(0.05, 0.2, 0.65),
    borderWidth: 2,
  })

  const contentLeft = x + 12
  let cursor = y + HANGER_HEIGHT - 28

  // Top flag section
  page.drawRectangle({
    x: contentLeft,
    y: cursor - 44,
    width: HANGER_WIDTH - 24,
    height: 40,
    color: rgb(0.054, 0.184, 0.6),
  })
  page.drawText('Support your local Scouts Troop', {
    x: contentLeft + 6,
    y: cursor - 34,
    size: 10,
    font: fonts.bold,
    color: rgb(1, 1, 1),
    maxWidth: HANGER_WIDTH - 36,
  })
  cursor -= 60

  // Main heading (name line)
  const heading = `My name is ${data.scoutName}`
  page.drawText(heading, {
    x: contentLeft,
    y: cursor,
    size: 16,
    font: fonts.bold,
    color: rgb(0.054, 0.184, 0.6),
    maxWidth: HANGER_WIDTH - 24,
    lineHeight: 18,
  })
  cursor -= 36

  // Top body text
  const body = data.flyerBody || 'Please support our troop by buying mulch and potting soil from our fundraiser.'
  page.drawText(body, {
    x: contentLeft,
    y: cursor,
    size: 10,
    font: fonts.regular,
    color: rgb(0.054, 0.184, 0.6),
    maxWidth: HANGER_WIDTH - 24,
    lineHeight: 12,
  })
  cursor -= 70

  // Product text
  page.drawText('Hardwood, Black, Cedar, Potting Soil and Manure', {
    x: contentLeft,
    y: cursor,
    size: 12,
    font: fonts.bold,
    color: rgb(0.85, 0.13, 0.13),
    maxWidth: HANGER_WIDTH - 24,
  })
  cursor -= 34

  // Info box
  page.drawRectangle({
    x: contentLeft,
    y: cursor - 58,
    width: HANGER_WIDTH - 24,
    height: 56,
    borderColor: rgb(0.054, 0.184, 0.6),
    borderWidth: 2,
  })
  page.drawText(`Order Deadline: ${data.saleEndDate}`, {
    x: contentLeft + 8,
    y: cursor - 20,
    size: 11,
    font: fonts.bold,
    color: rgb(0.054, 0.184, 0.6),
  })
  page.drawText('Questions?', {
    x: contentLeft + 8,
    y: cursor - 34,
    size: 10,
    font: fonts.bold,
    color: rgb(0.054, 0.184, 0.6),
  })
  page.drawText(`Email: ${data.troopContact || 'contact@troop771.org'}`, {
    x: contentLeft + 8,
    y: cursor - 48,
    size: 9,
    font: fonts.regular,
    color: rgb(0.054, 0.184, 0.6),
  })

  cursor -= 80

  // Delivery date block
  page.drawRectangle({
    x: contentLeft,
    y: cursor - 72,
    width: HANGER_WIDTH - 24,
    height: 68,
    borderColor: rgb(0.054, 0.184, 0.6),
    borderWidth: 2,
  })

  page.drawText('Delivery:', {
    x: contentLeft + 12,
    y: cursor - 22,
    size: 10,
    font: fonts.bold,
    color: rgb(0.054, 0.184, 0.6),
  })
  page.drawText(data.deliveryDate, {
    x: contentLeft + 12,
    y: cursor - 40,
    size: 20,
    font: fonts.bold,
    color: rgb(0.85, 0.13, 0.13),
  })

  cursor -= 90

  // Callout + QR
  page.drawRectangle({
    x: contentLeft,
    y: cursor - 130,
    width: HANGER_WIDTH - 24,
    height: 126,
    borderColor: rgb(0.054, 0.184, 0.6),
    borderWidth: 2,
  })

  const qrSize = 110
  const qrX = x + (HANGER_WIDTH - qrSize) / 2
  if (qrImage) {
    page.drawImage(qrImage, {
      x: qrX,
      y: cursor - qrSize - 6,
      width: qrSize,
      height: qrSize,
    })
  }

  page.drawText('Order Today!', {
    x: contentLeft,
    y: cursor - 12,
    size: 12,
    font: fonts.bold,
    color: rgb(0.85, 0.13, 0.13),
    maxWidth: HANGER_WIDTH - 24,
    align: 'center' as any,
  })
}

export async function generateDoorhangerPDF(data: DoorhangerData): Promise<Buffer> {
  const pdfDoc = await PDFDocument.create()
  const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold)
  const regularFont = await pdfDoc.embedFont(StandardFonts.Helvetica)

  const page = pdfDoc.addPage([612, 792]) // 8.5 x 11
  const qrImage = await pdfDoc.embedPng(data.qrCodeBuffer)

  // place two door hangers (top and bottom)
  drawHanger(page, 24, 792 - 24 - HANGER_HEIGHT, data, { bold: boldFont, regular: regularFont }, qrImage)
  drawHanger(page, 24, 24, data, { bold: boldFont, regular: regularFont }, qrImage)

  const pdfBytes = await pdfDoc.save()
  return Buffer.from(pdfBytes)
}
