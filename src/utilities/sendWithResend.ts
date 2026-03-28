type SendWithResendArgs = {
  from: string
  replyTo?: string
  subject: string
  text: string
  to: string
}

type ResendResponse = {
  id?: string
  message?: string
}

export const sendWithResend = async ({
  from,
  replyTo,
  subject,
  text,
  to,
}: SendWithResendArgs) => {
  const apiKey = process.env.RESEND_API_KEY

  if (!apiKey) {
    throw new Error('Missing RESEND_API_KEY')
  }

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from,
      reply_to: replyTo ? [replyTo] : undefined,
      subject,
      text,
      to: [to],
    }),
  })

  const payload = (await response.json()) as ResendResponse

  if (!response.ok || !payload.id) {
    throw new Error(payload.message || 'Resend send failed')
  }

  return payload.id
}
