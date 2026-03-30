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


## Mulch Delivery Routing – MVP Roadmap

This roadmap defines a phased approach to building delivery routing and driver coordination features for the mulch fundraiser platform.

### Phase 0 — Foundation

#### Objectives

Establish required data structures and baseline functionality.

#### Deliverables

- Extend core models:
  - **Order**
    - address fields (street, city, state, zip)
    - lat, lng (nullable initially)
    - quantity (bags / yards)
  - **Customer**
  - **Campaign**
- Add new entities:
  - **Driver**
    - name, phone, email
    - active status
  - **Vehicle**
    - name
    - capacity (bags / yards)
  - **Route**
    - campaign reference
    - driver reference
    - status (draft, assigned, in_progress, complete)
  - **RouteStop**
    - route reference
    - order reference
    - stop order (integer)

#### Notes

- Use Prisma ORM for schema modeling and migrations.
- Keep relationships simple and explicit.

### Phase 1 — Geocoding

#### Objectives

Convert all delivery addresses into coordinates.

#### Deliverables

- Integrate geocoding via:
  - Google Maps Platform, or
  - Mapbox
- On order creation/update:
  - geocode address
  - store lat / lng
- Add retry mechanism for failed geocodes.
- Cache results in database (avoid duplicate API calls).

#### Notes

- Geocoding is required for all mapping and clustering features.
- Validate addresses early to reduce failures.

### Phase 2 — Admin Map View

#### Objectives

Visualize all campaign orders geographically.

#### Deliverables

- Campaign map page:
  - plot all orders as markers
  - basic clustering (optional)
- Order tooltip:
  - name
  - quantity
  - address
- Filter options:
  - by campaign
  - by assigned/unassigned

#### Notes

- Use simple map rendering (Google Maps or Mapbox JS SDK).
- This becomes the foundation for route building.

### Phase 3 — Manual Route Builder

#### Objectives

Allow admins to manually create and assign routes.

#### Deliverables

- Create/edit route UI.
- Select orders and assign to route.
- Assign:
  - driver
  - vehicle
- Display:
  - total stops
  - total quantity vs capacity
- Map view:
  - highlight selected stops

#### Notes

- Prioritize usability over automation.
- This enables real-world usage before optimization exists.

### Phase 4 — Driver Experience

#### Objectives

Provide drivers with clear, usable route information.

#### Deliverables

- Driver access:
  - login or magic link
- Route view (mobile-first):
  - ordered stop list
  - customer name + address
  - quantity per stop
  - notes
- Navigation links:
  - open in Google Maps / Apple Maps
- Load manifest:
  - order numbers
  - total load
- Optional:
  - printable route sheet (PDF)

#### Notes

- Do not build custom navigation.
- Leverage existing mapping apps.

### Phase 5 — Assisted Route Grouping

#### Objectives

Automate grouping of orders into manageable routes.

#### Deliverables

- "Suggest Routes" action:
  - group orders by proximity
  - enforce vehicle capacity constraints
- Basic clustering strategies:
  - ZIP code grouping (baseline)
  - radius-based grouping
  - lat/lng clustering (improved)
- Output:
  - draft routes
  - unassigned orders if overflow

#### Notes

- This is not full optimization.
- Focus on "good enough" grouping.

### Phase 6 — Route Optimization (Optional Enhancement)

#### Objectives

Improve stop ordering within routes.

#### Deliverables

- Integrate routing optimization:
  - Google Maps Directions API or equivalent
- Reorder stops for:
  - shortest path
  - reduced drive time
- Update RouteStop.order.

#### Notes

- Treat as enhancement, not requirement.
- Adds cost and complexity.

### Phase 7 — Notifications

#### Objectives

Distribute routes to drivers efficiently.

#### Deliverables

- Email route assignments.
- Optional SMS notifications.
- Include:
  - route summary
  - link to driver page

#### Notes

- Email is sufficient for MVP.
- SMS can be added later.

### Phase 8 — Operational Enhancements

#### Objectives

Support real-world delivery adjustments.

#### Deliverables

- Route editing after assignment.
- Reassign orders between routes.
- Mark stops as completed.
- Add delivery notes (e.g., "backyard drop").

#### Notes

- Expect changes on delivery day.
- Flexibility is required.

### Technical Stack Notes

- **Frontend:** Next.js
- **CMS / Admin:** Payload CMS
- **Database:** PostgreSQL via Prisma
- **Hosting:** Vercel

### MVP Definition

The MVP is complete when:

- Orders are geocoded.
- Admin can:
  - view orders on a map
  - create routes manually
  - assign drivers
- Drivers can:
  - view routes on mobile
  - access stop addresses
  - open navigation links
- Basic grouping assistance exists.

### Guiding Principle

Build for operational usefulness first, not perfect optimization.

A simple, reliable system that:

- groups nearby deliveries
- respects truck capacity
- gives drivers clear instructions

is significantly more valuable than a complex but fragile routing engine.

## Contributing

This is an early-stage internal project. Please follow standard development practices:

1. Create feature branches from `main`
2. Write tests for new functionality
3. Ensure all linting passes
4. Update this README for any structural changes

## License

Internal project - no public license specified.

