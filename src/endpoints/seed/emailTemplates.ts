export const emailTemplateSeeds = [
  {
    name: 'Previous Campaign Outreach',
    purpose: 'previous-campaign-outreach' as const,
    subject:
      '{{customerFirstName}}, support {{scoutName}} in the {{campaignSeason}} {{campaignName}} fundraiser',
    body:
      `Hi {{customerFirstName}},\n\n` +
      `Thank you for supporting me during {{previousCampaignName}}. Your previous order was: {{previousOrder}}.\n\n` +
      `I am reaching out again for the {{campaignSeason}} {{campaignName}} campaign.\n\n` +
      `You can place an order here: {{fundraisingUrl}}\n` +
      `Orders close on {{saleEndDate}} and delivery is scheduled for {{deliveryDate}}.\n\n` +
      `Thank you again for supporting scouting!\n\n` +
      `{{scoutName}}`,
    active: true,
  },
] as const
