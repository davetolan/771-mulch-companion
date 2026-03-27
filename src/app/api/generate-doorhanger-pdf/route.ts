import { NextRequest, NextResponse } from 'next/server'
import { generateDoorhangerPDF } from '@/utilities/generateDoorhangerPDF'
import { generateQRCodeDataURL } from '@/utilities/generateQRCode'
import { format } from 'date-fns'

interface GeneratePDFRequest {
  scoutName: string
  campaignName: string
  saleEndDate: string
  deliveryDate: string
  externalFundraisingUrl: string
  troopName?: string
  troopContact?: string
  flyerHeadline?: string
  flyerBody?: string
}

// Convert data URL to Buffer
async function dataURLToBuffer(dataURL: string): Promise<Buffer> {
  const base64Data = dataURL.replace(/^data:image\/png;base64,/, '')
  return Buffer.from(base64Data, 'base64')
}

export async function POST(request: NextRequest) {
  try {
    const body: GeneratePDFRequest = await request.json()

    // Generate QR code data URL
    const qrCodeDataUrl = await generateQRCodeDataURL(body.externalFundraisingUrl)

    // Convert data URL to Buffer
    const qrCodeBuffer = await dataURLToBuffer(qrCodeDataUrl)

    // Generate PDF
    const pdfBuffer = await generateDoorhangerPDF({
      scoutName: body.scoutName,
      campaignName: body.campaignName,
      saleEndDate: body.saleEndDate,
      deliveryDate: body.deliveryDate,
      qrCodeBuffer,
      troopName: body.troopName,
      troopContact: body.troopContact,
      flyerHeadline: body.flyerHeadline,
      flyerBody: body.flyerBody,
    })

    // Create filename
    const fileName = `${body.scoutName}_${body.campaignName}_doorhanger.pdf`

    // Return PDF as downloadable file
    return new NextResponse(pdfBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${encodeURIComponent(fileName)}"`,
      },
    })
  } catch (error) {
    console.error('PDF generation error:', error)
    return NextResponse.json(
      {
        error: 'Failed to generate PDF',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 },
    )
  }
}
