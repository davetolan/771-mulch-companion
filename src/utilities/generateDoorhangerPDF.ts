import { PDFDocument, PDFPage, rgb, StandardFonts } from 'pdf-lib'

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

export async function generateDoorhangerPDF(data: DoorhangerData): Promise<Buffer> {
  // Create a new PDF document
  const pdfDoc = await PDFDocument.create()

  // Embed fonts
  const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold)
  const regularFont = await pdfDoc.embedFont(StandardFonts.Helvetica)

  // Add a page sized for door hanger (3.5" x 8.5" = 252pt x 612pt at 72 DPI)
  const page = pdfDoc.addPage([252, 612])
  const pageHeight = page.getHeight()
  const pageWidth = page.getWidth()
  const margin = 14

  // Draw border
  page.drawRectangle({
    x: margin,
    y: margin,
    width: pageWidth - margin * 2,
    height: pageHeight - margin * 2,
    borderColor: rgb(0, 0, 0),
    borderWidth: 1,
  })

  let yPos = pageHeight - margin - 14

  // Header - Troop Name
  if (data.troopName) {
    page.drawText(data.troopName, {
      x: margin + 5,
      y: yPos,
      size: 10,
      font: boldFont,
      color: rgb(0, 0, 0),
      maxWidth: pageWidth - margin * 2 - 10,
    })
    yPos -= 18
  }

  // Campaign Name/Headline
  const headline = data.flyerHeadline || data.campaignName
  page.drawText(headline, {
    x: margin + 5,
    y: yPos,
    size: 11,
    font: boldFont,
    color: rgb(0, 0, 0),
    maxWidth: pageWidth - margin * 2 - 10,
  })
  yPos -= 35

  // Scout Name
  page.drawText(`Scout: ${data.scoutName}`, {
    x: margin + 7,
    y: yPos,
    size: 10,
    font: boldFont,
    color: rgb(0, 0, 0),
  })
  yPos -= 16

  // Sale End Date
  page.drawText(`Sale Ends: ${data.saleEndDate}`, {
    x: margin + 7,
    y: yPos,
    size: 9,
    font: regularFont,
    color: rgb(0, 0, 0),
  })
  yPos -= 14

  // Delivery Date
  page.drawText(`Delivery: ${data.deliveryDate}`, {
    x: margin + 7,
    y: yPos,
    size: 9,
    font: regularFont,
    color: rgb(0, 0, 0),
  })
  yPos -= 28

  // Embed QR Code image
  const qrImage = await pdfDoc.embedPng(data.qrCodeBuffer)
  const qrSize = 94
  const qrX = (pageWidth - qrSize) / 2
  page.drawImage(qrImage, {
    x: qrX,
    y: yPos - qrSize,
    width: qrSize,
    height: qrSize,
  })
  yPos -= qrSize + 14

  // Scan to Order text
  page.drawText('Scan to Order', {
    x: margin + 5,
    y: yPos,
    size: 9,
    font: boldFont,
    color: rgb(0, 0, 0),
    maxWidth: pageWidth - margin * 2 - 10,
  })

  // Optional body text
  if (data.flyerBody) {
    yPos -= 16
    page.drawText(data.flyerBody, {
      x: margin + 5,
      y: yPos,
      size: 7,
      font: regularFont,
      color: rgb(0, 0, 0),
      maxWidth: pageWidth - margin * 2 - 10,
    })
  }

  // Save and return PDF as Buffer
  const pdfBytes = await pdfDoc.save()
  return Buffer.from(pdfBytes)
}
