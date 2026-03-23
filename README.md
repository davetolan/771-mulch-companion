# Scout Troop Mulch Fundraiser Companion

A Next.js web application serving as a companion tool for Scout troop mulch fundraisers. This app helps scouts access printable fundraiser flyers and supports basic campaign management, while integrating with external fundraising systems for payment processing.

## Problem Statement

Scout troops running mulch fundraisers often rely on external platforms for payment processing and order management. Scouts need an easy way to generate and print personalized flyers containing their unique fundraising QR codes and campaign details (such as sale end dates and delivery schedules). This application bridges that gap by providing a troop-side interface for flyer generation without handling payments or orders directly.

## MVP Features

- **Scout Management**: Store scout profiles with their external fundraising links
- **Flyer Generation**: Generate printable PDF flyers for each scout, including:
  - Personalized QR code linking to their external fundraising page
  - Campaign information (sale end date, delivery date)
  - Troop branding and contact details
- **Campaign Overview**: Basic display of current campaign details
- **No Payment Processing**: All financial transactions occur through external systems

## Future Features

- Previous customer outreach and reminder emails
- Thank-you email automation
- Advanced campaign analytics and reporting
- Bulk flyer generation for multiple scouts
- Integration with external order tracking systems

## Tech Stack

- **Frontend**: Next.js with TypeScript
- **Styling**: Tailwind CSS
- **CMS**: Payload CMS (for future admin workflows and content management)
- **Database**: PostgreSQL
- **PDF Generation**: Library for creating printable flyers
- **QR Code Generation**: Library for generating QR codes
- **Deployment**: Docker (based on included Dockerfile)

## Data Model

### Core Entities

- **Scouts**
  - Name
  - Troop affiliation
  - External fundraising link (URL from separate payment system)
  - Contact information (optional)

- **Campaigns**
  - Campaign name/title
  - Sale start date
  - Sale end date
  - Delivery date
  - Description/notes

- **Flyers** (generated on-demand)
  - Associated scout
  - Associated campaign
  - Generated PDF file
  - Generation timestamp

### Notes on External Integration

Fundraising links are provided by an external payment processing system. This application does not store or process any payment information. All financial transactions, order fulfillment, and customer data remain in the external system.

## Local Development Setup

### Prerequisites

- Node.js 18+
- PostgreSQL database
- pnpm package manager

### Installation

1. Clone the repository:
   ```bash
   git clone <repository-url>
   cd scout-troop-mulch-companion
   ```

2. Install dependencies:
   ```bash
   pnpm install
   ```

3. Set up environment variables (see Environment Variables section below)

4. Set up the database:
   ```bash
   # Ensure PostgreSQL is running
   pnpm run db:migrate  # If using migrations
   ```

5. Generate Payload types:
   ```bash
   pnpm run generate:types
   ```

6. Start the development server:
   ```bash
   pnpm run dev
   ```

7. Open [http://localhost:3000](http://localhost:3000) in your browser

### Available Scripts

- `pnpm run dev` - Start development server
- `pnpm run build` - Build for production
- `pnpm run start` - Start production server
- `pnpm run lint` - Run ESLint
- `pnpm run test` - Run tests
- `pnpm run generate:types` - Generate Payload CMS types

## Environment Variables

Create a `.env.local` file in the project root with the following variables:

```env
# Database
DATABASE_URL=postgresql://username:password@localhost:5432/scout_fundraiser

# Payload CMS
PAYLOAD_SECRET=your-payload-secret-key-here

# Next.js
NEXT_PUBLIC_APP_URL=http://localhost:3000

# External System Integration (if applicable)
EXTERNAL_FUNDRAISING_BASE_URL=https://external-fundraising-system.com
```

### Environment Variable Descriptions

- `DATABASE_URL`: PostgreSQL connection string
- `PAYLOAD_SECRET`: Secret key for Payload CMS encryption and authentication
- `NEXT_PUBLIC_APP_URL`: Base URL for the application (used for generating links)
- `EXTERNAL_FUNDRAISING_BASE_URL`: Base URL of the external fundraising system (for QR code generation)

## Project Structure

```
/
├── src/
│   ├── app/                    # Next.js app router pages
│   │   ├── (frontend)/         # Public-facing pages
│   │   └── (payload)/          # Payload admin interface
│   ├── collections/            # Payload CMS collections
│   │   ├── Scouts.ts           # Scout data model
│   │   ├── Campaigns.ts        # Campaign data model
│   │   └── Media.ts            # File uploads
│   ├── components/             # React components
│   │   ├── ui/                 # Reusable UI components
│   │   └── FlyerGenerator/     # PDF generation components
│   ├── hooks/                  # Custom React hooks
│   ├── utilities/              # Helper functions
│   │   ├── qrCode.ts           # QR code generation
│   │   └── pdfGenerator.ts     # PDF creation utilities
│   └── payload.config.ts       # Payload CMS configuration
├── public/                     # Static assets
├── tests/                      # Test files
│   ├── e2e/                    # End-to-end tests
│   └── int/                    # Integration tests
├── docker-compose.yml          # Docker development environment
├── Dockerfile                  # Production container
└── package.json                # Dependencies and scripts
```

## Development Roadmap

### Phase 1: MVP (Current)
- [x] Basic scout and campaign data storage
- [x] PDF flyer generation with QR codes
- [x] Simple campaign overview page
- [x] Payload CMS integration for admin workflows

### Phase 2: Enhanced Features
- [ ] Email integration for customer outreach
- [ ] Automated reminder and thank-you emails
- [ ] Bulk operations for multiple scouts
- [ ] Campaign performance metrics

### Phase 3: Advanced Integration
- [ ] API integration with external order systems
- [ ] Real-time order status updates
- [ ] Advanced reporting and analytics
- [ ] Mobile-responsive flyer designs

## Contributing

This is an early-stage internal project. Please follow standard development practices:

1. Create feature branches from `main`
2. Write tests for new functionality
3. Ensure all linting passes
4. Update this README for any structural changes

## License

Internal project - no public license specified.

