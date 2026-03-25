import QRCode from 'qrcode'

export async function generateQRCodeDataURL(url: string): Promise<string> {
  if (!url || typeof url !== 'string') {
    throw new TypeError('URL must be a non-empty string')
  }

  // Returns a PNG data URL for easy inline usage and PDF embedding.
  return QRCode.toDataURL(url, {
    type: 'image/png',
    errorCorrectionLevel: 'H',
    margin: 2,
    width: 300,
  })
}

export async function generateQRCodeSVG(url: string): Promise<string> {
  if (!url || typeof url !== 'string') {
    throw new TypeError('URL must be a non-empty string')
  }

  // Returns an SVG string that can also be embedded in PDF or DOM.
  return QRCode.toString(url, {
    type: 'svg',
    errorCorrectionLevel: 'H',
    margin: 2,
  })
}
