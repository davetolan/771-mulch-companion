import { describe, it, expect } from 'vitest'
import { generateQRCodeDataURL, generateQRCodeSVG } from '@/utilities/generateQRCode'

const urls = [
  'https://example.com',
  'https://www.yourfundraiser.org/scout/abc123',
  'https://camp.com?campaign=summer&scout=joe',
]

describe('generateQRCode utility', () => {
  it('generates a valid PNG data URL for multiple fundraising URLs', async () => {
    for (const url of urls) {
      const dataUrl = await generateQRCodeDataURL(url)

      expect(dataUrl).toBeTruthy()
      expect(dataUrl).toMatch(/^data:image\/png;base64,/)
      expect(dataUrl.length).toBeGreaterThan(2500)
    }
  })

  it('generates a valid SVG for multiple fundraising URLs', async () => {
    for (const url of urls) {
      const svg = await generateQRCodeSVG(url)

      expect(svg).toBeTruthy()
      expect(svg).toContain('<svg')
      expect(svg).toContain('</svg>')
      expect(svg.length).toBeGreaterThan(1000)
    }
  })

  it('throws on invalid url input', async () => {
    await expect(generateQRCodeDataURL('')).rejects.toThrow(TypeError)
    await expect(generateQRCodeSVG('')).rejects.toThrow(TypeError)
  })
})
