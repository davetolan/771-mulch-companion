import { format } from 'date-fns'

type EmailTemplateData = {
  subject: string
  body: string
}

type RenderEmailTemplateArgs = {
  campaignName: string
  campaignSeason: string
  customerFirstName: string
  customerName: string
  deliveryDate: string
  fundraisingUrl: string
  previousCampaignName: string
  previousCampaignSeason: string
  previousOrder: string
  saleEndDate: string
  scoutName: string
  template: EmailTemplateData
}

const replacePlaceholders = (value: string, variables: Record<string, string>) => {
  return value.replace(/\{\{(\w+)\}\}/g, (_, key: string) => variables[key] ?? '')
}

export const renderEmailTemplate = ({
  campaignName,
  campaignSeason,
  customerFirstName,
  customerName,
  deliveryDate,
  fundraisingUrl,
  previousCampaignName,
  previousCampaignSeason,
  previousOrder,
  saleEndDate,
  scoutName,
  template,
}: RenderEmailTemplateArgs) => {
  const variables = {
    campaignName,
    campaignSeason,
    customerFirstName,
    customerName,
    deliveryDate: format(new Date(deliveryDate), 'MMM dd, yyyy'),
    fundraisingUrl,
    previousCampaignName,
    previousCampaignSeason,
    previousOrder,
    saleEndDate: format(new Date(saleEndDate), 'MMM dd, yyyy'),
    scoutName,
  }

  return {
    subject: replacePlaceholders(template.subject, variables),
    body: replacePlaceholders(template.body, variables),
  }
}
