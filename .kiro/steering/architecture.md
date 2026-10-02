# RealSquare Admin — Architecture

## Overview

This is a fullstack admin panel for the RealSquare real estate platform. It is split into two separate apps:
- `backend/` — Node.js REST API
- `frontend/` — React SPA (admin dashboard)

---

## Backend

### Tech Stack
- **Runtime**: Node.js
- **Framework**: Express.js v5
- **Database**: MongoDB via Mongoose
- **Cache**: Redis
- **Auth**: JWT (stored in HTTP-only cookies)
- **File Uploads**: Multer (files served from `/var/www/storage`)
- **Payments**: Razorpay (webhook at `POST /api/webhook`)
- **Email**: Nodemailer
- **Validation**: express-validator
- **Password Hashing**: bcryptjs

### Entry Point
`backend/server.js` — sets up Express, connects MongoDB and Redis, registers middleware and routes.

### Folder Structure
```
backend/
├── server.js              # App entry point
├── database/config.js     # MongoDB connection
├── redis/                 # Redis config and service
├── middleware/
│   ├── auth.js            # Admin auth middleware (JWT)
│   └── userAuth.js        # System user auth middleware
├── routes/index.js        # Root router — mounts all module routes
├── modules/               # Feature modules (domain-driven)
│   ├── systemUsers.*      # System user model, routes, controller
│   ├── admin/             # Admin-only routes
│   ├── mixed/             # Shared routes (admin + other roles)
│   ├── builders/          # Builder user module
│   ├── brokers/           # Broker user module
│   ├── owners/            # Owner user module
│   └── customers/         # Customer user module
├── utils/                 # Shared helpers (email, upload, dateTime)
└── webhook/               # Razorpay payment webhook handler
```

### Module Structure Pattern
Each feature module follows this pattern:
```
modules/admin/<feature>/
├── <feature>.controller.js
├── <feature>.model.js
└── <feature>.routes.js
```

### Admin Modules
| Module | Path |
|---|---|
| Auth (OTP login) | `modules/admin/auth/` |
| System User Roles | `modules/admin/systemUsersRoles/` |
| Property Listing | `modules/admin/propertyListing/` |
| Inquiries & Assigned Inquiries | `modules/admin/inquiries/` |
| Property Types | `modules/admin/propertyTypes/` |
| Property Categories | `modules/admin/propertyCategories/` |
| Property Purposes | `modules/admin/propertyPurposes/` |
| Furnishings & Amenities | `modules/admin/furnishingsAndAmenities/` |
| Plans Management | `modules/admin/plansManagement/` |
| Enquiry Plans | `modules/admin/enquiryPlansManagement/` |
| Free Listing | `modules/admin/freeListingManagement/` |
| Purchased Plans | `modules/admin/purchasedPlans/` |
| Enquiry Purchased Plans | `modules/admin/enquiryPurchasedPlans/` |
| Coins Offers | `modules/admin/coinsOffersManagement/` |
| Coins Transactions | `modules/admin/coinsTransactions/` |
| Wallet Management | `modules/admin/walletManagement/` |
| Admin Wallet | `modules/admin/adminWallet/` |
| Lead/Enquiry Coins Config | `modules/admin/leadEnquiryCoinsConfig/` |
| Auto Approval Config | `modules/admin/autoApprovalConfig/` |

### Mixed (Shared) Modules
| Module | Path |
|---|---|
| Property Listing | `modules/mixed/propertyListing/` |
| Project Listing | `modules/mixed/projectListing/` |
| Inquiries | `modules/mixed/inquiries/` |
| RERA Verification | `modules/mixed/reraVerification/` |
| Listing Purchased Plans | `modules/mixed/purchasedPlans/` |
| Enquiry Purchased Plans | `modules/mixed/enquiryPurchasedPlans/` |
| Coins Transactions | `modules/mixed/coinsTransactions/` |
| Transactions | `modules/mixed/transactions/` |
| Purchase Coins | `modules/mixed/purchaseCoins/` |
| User Coins Wallet | `modules/mixed/userCoinsWallet/` |

### API Base URL
All routes are prefixed with `/api`.

### Admin Inquiry APIs
- `GET /api/admin/inquiries/roles` returns active Customer, Broker, Builder, and Owner roles for enquiry filters.
- `GET /api/admin/inquiries` returns paginated source records from `Inquiry`, one record per created inquiry.
- `PATCH /api/admin/inquiries/status` accepts `{ inquiryId, status: "inactive" | "completed" }` and lets admins close an active inquiry; the Enquiries page uses the shared AlertDialog confirmation pattern before submitting, and status changes are final.
- `GET /api/admin/inquiries/assigned` returns paginated assignment records from `AssignedInquiry`, with each record's `inquiry` reference populated from `Inquiry` and its property-purpose/category/type references populated.
- `GET /api/admin/inquiries/assigned/:inquiryId` returns paginated assignments for one source inquiry and accepts `status=active|purchased`. The `inquiry` field remains an ID; `assignedTo.role` is populated from `SystemUserRole`. The response includes `totalAssigned` and `totalPurchased` stats across all assignments for that inquiry, regardless of the status filter.
- Both endpoints are protected by the admin `protect` middleware and support query filters for their respective collection records.
- `POST /api/mixed/inquiries/create` accepts only individual property enquiries (`isProperty: true`) and validates that purpose, category, and type IDs reference active master records; when both category and type are supplied, the type must belong to that category. After saving, it sends the approved `property_inquiry_confirmation` WhatsApp template to the creator, using `NA` for absent optional fields; send failures do not fail inquiry creation. Confirm/Reject quick-reply payloads include the inquiry ID, but inbound replies are not handled yet.
- `PATCH /api/mixed/inquiries/status` accepts `{ inquiryId, status: "inactive" | "completed" }` and lets the creator close their own active inquiry; it does not accept or store a reason. Existing `active` and automatic `expired` states remain supported.
- `GET /api/mixed/inquiries/my` returns the creator's filtered inquiries and stats, including `total` equal to `pagination.total`.
- `GET /api/mixed/inquiries/assigned` hides active/locked assignments whose linked inquiry is expired, inactive, or completed, but continues returning purchased assignments; its stats include `total` equal to visible active plus purchased counts, with assignment and classification stats using the same visible set. Assignment documents remain stored, so Admin historical assignment counts are unchanged.
- `GET /api/mixed/inquiries/cron-assign` and `GET /api/mixed/inquiries/cron-expire` are public cron endpoints protected by the `x-cron-secret` header, which must match `CRONJOB_SECRET` in the backend environment. The expiry job compares `lastFollowUpDate` with the start of the current UTC date, so inquiries remain active throughout their follow-up date; it returns the update count and check time.
- `backend/whatsappConfig/whatsappTemplates.js` defines approved WhatsApp templates; `whatsappService.js` sends them using `WHATSAPP_PHONE_NUMBER_ID` and `WHATSAPP_ACCESS_TOKEN` via Graph API v26.0.

### Auth Flow
- Login uses OTP-based authentication
- JWT token is stored in an HTTP-only cookie
- `middleware/auth.js` protects admin routes
- `middleware/userAuth.js` protects system user routes
- `GET /api/system-users/me` returns the authenticated system user's profile, wallet and active plans, plus `coinsPerEnquiry` from the singleton `LeadEnquiryCoinsConfig` (defaults to `0` when no config exists).

### Plans & Payments

Two separate plan types exist — **Listing Plans** and **Enquiry Plans** — each with their own master data (admin-managed) and purchased plan records (user-owned).

#### Listing Plans
- Master data: `modules/admin/plansManagement/` → `ListingPlan` model
- Purchase flow: `modules/mixed/purchasedPlans/` → `ListingPurchasedPlan` model
- Routes: `GET /active-plans`, `POST /purchase`, `POST /change-plan`, `POST /create-order`, `POST /change-plan-order`, `PATCH /cancel/:transactionId`
- Webhook handlers: `webhook/helpers/handlePlanPurchase.js`, `webhook/helpers/handlePlanUpgrade.js`
- Transaction reasons: `"ListingPlanPurchase"`, `"ListingPlanUpgrade"`
- Full flow documented in `modules/mixed/purchasedPlans/`

#### Enquiry Plans
- Master data: `modules/admin/enquiryPlansManagement/` → `EnquiryPlan` model
- Purchase flow: `modules/mixed/enquiryPurchasedPlans/` → `EnquiryPurchasedPlan` model
- Routes: `GET /active-plans`, `POST /purchase`, `POST /change-plan`, `POST /create-order`, `POST /change-plan-order`, `PATCH /cancel/:transactionId`
- Webhook handlers: `webhook/helpers/handleEnquiryPlanPurchase.js`, `webhook/helpers/handleEnquiryPlanUpgrade.js`
- Transaction reasons: `"EnquiryPlanPurchase"`, `"EnquiryPlanUpgrade"`
- Full flow documented in `modules/mixed/enquiryPurchasedPlans/FLOW.md`

#### Assigned Inquiry Purchase
- `PATCH /api/mixed/inquiries/purchase` accepts `assignmentId` and `purchasedVia: "plan" | "coins"` in the request body.
- The purchase endpoint checks the linked inquiry status before using a plan credit or coins; expired, inactive, and completed inquiries are rejected with HTTP 409. Existing purchased assignments remain accessible.
- Plan purchases consume one credit from the user's active enquiry plan; coin purchases debit the configured `coinsPerEnquiry` amount and create an `InquiryPurchase` coin transaction.
- Purchased assignments store `status: "purchased"`, `purchasedAt`, and `purchasedVia`; coin purchases also store `coinsUsed` with the exact amount deducted from the wallet.
- Inquiry and status-transition integration tests read `USER_TOKEN`, `ADMIN_TOKEN`, and (for customer-only cases) `CUSTOMER_TOKEN` from the ignored backend `.env` file; no bearer tokens are embedded in those test sources.
- Request validation, authentication, creator/admin status changes, plan and coin purchase, closed inquiry, already-purchased, and missing assignment cases are covered in the established inquiry API test files; plan and coin fixtures assert successful purchase when active or the duplicate response when already purchased.
- When a backend controller or API endpoint changes, update its related test file(s) to reflect the new behavior and response shape; add tests in the established test location when no related coverage exists.

#### Payment Transaction Reason Enum
All `reason` values in `PaymentTransaction` and `CoinsTransaction`:

| Reason | Description |
|---|---|
| `ListingPlanPurchase` | Online/coins purchase of a listing plan (no active plan) |
| `ListingPlanUpgrade` | Online/coins change of an existing listing plan |
| `EnquiryPlanPurchase` | Online/coins purchase of an enquiry plan (no active plan) |
| `EnquiryPlanUpgrade` | Online/coins change of an existing enquiry plan |
| `InquiryPurchase` | Coins spent to unlock an assigned inquiry |
| `CoinsPurchase` | User buys coins via Razorpay |
| `Refund` | Admin-issued refund |
| `AdminCredit` | Manual admin credit |
| `AdminDebit` | Manual admin debit |

#### Webhook
- Entry point: `webhook/manageOnlinePayment.js`
- Verifies Razorpay HMAC-SHA256 signature
- Routes `payment.captured` events by `txn.reason` to the appropriate handler
- All handlers are idempotent (check `txn.status === "Success"` before processing)

---

## Frontend

### Tech Stack
- **Framework**: React 18
- **Language**: TypeScript
- **Build Tool**: Vite
- **Routing**: React Router DOM v6
- **State/Data Fetching**: TanStack Query (React Query v5)
- **HTTP Client**: Axios (with interceptor)
- **Forms**: React Hook Form + Zod validation
- **UI Components**: shadcn/ui (Radix UI primitives)
- **Styling**: Tailwind CSS
- **Charts**: Recharts
- **Maps**: @react-google-maps/api
- **Notifications**: Sonner (toasts)
- **Testing**: Vitest + Testing Library, Playwright (e2e)

### Folder Structure
```
frontend/src/
├── main.tsx               # App entry point
├── App.tsx                # Root component with route definitions
├── index.css              # Global styles
├── pages/                 # One file per route/page
├── components/            # Shared reusable components
│   └── ui/                # shadcn/ui auto-generated components
├── services/              # API call functions (one file per domain)
├── context/               # React context providers
├── hooks/                 # Custom React hooks
├── lib/
│   ├── axiosInterceptor.ts  # Axios instance with auth headers
│   ├── permissionRoutes.ts  # Route-level permission mapping
│   └── utils.ts             # Utility functions (cn, etc.)
└── data/                  # Static/seed data files
```

### Pages
| Page | Route Purpose |
|---|---|
| `Login.tsx` | OTP-based admin login |
| `Dashboard.tsx` | Overview stats and charts |
| `SystemUsersPage.tsx` | Manage system/admin users |
| `SystemUsersRolesPage.tsx` | Manage roles and permissions |
| `CustomersPage.tsx` | Customer user management |
| `OwnersPage.tsx` | Property owner management |
| `AgentsBrokersPage.tsx` | Broker/agent management |
| `BuildersDevelopersPage.tsx` | Builder/developer management |
| `PropertiesPage.tsx` | Property listings management |
| `PropertyDetailPage.tsx` | Single property detail view |
| `ProjectsPage.tsx` | Project listings management |
| `ProjectDetailPage.tsx` | Single project detail view |
| `LeadsPage.tsx` | Lead management |
| `EnquiriesPage.tsx` | Paginated admin enquiry list with URL-persisted filters and per-inquiry assignment counts; View opens the assigned enquiries page |
| `ViewAssignedEnquiriesPage.tsx` | Paginated, status-filtered assignments for one enquiry using `GET /api/admin/inquiries/assigned/:inquiryId`, with assignment status/source and purchase details |
| `PlansPage.tsx` | Subscription plans management |
| `EnquiryPlansPage.tsx` | Enquiry-specific plans |
| `PurchasedPlansPage.tsx` | Purchased listing plan records |
| `PurchasedEnquiryPlansPage.tsx` | Purchased enquiry plan records |
| `FreeListingPage.tsx` | Free listing config |
| `CoinsOffersPage.tsx` | Coins offer management |
| `CoinsTransactionsPage.tsx` | Coins transaction history |
| `WalletTransactionsPage.tsx` | Wallet transaction history |
| `PropertyTypesPage.tsx` | Property type config |
| `PropertyCategoriesPage.tsx` | Property category config |
| `PropertyPurposesPage.tsx` | Property purpose config |
| `FurnishingsAmenitiesPage.tsx` | Furnishing/amenity config |
| `CitiesPage.tsx` | City master data |
| `StatesPage.tsx` | State master data |
| `AutoApprovalConfigPage.tsx` | Auto-approval settings |
| `LeadEnquiryCoinsConfigPage.tsx` | Lead/enquiry coins config |
| `IncompleteProfilesPage.tsx` | Users with incomplete profiles |
| `ProfilePage.tsx` | Admin profile page |

### Key Components
| Component | Purpose |
|---|---|
| `AdminLayout.tsx` | Main layout wrapper with sidebar |
| `AppSidebar.tsx` | Navigation sidebar |
| `DataTable.tsx` | Reusable paginated data table |
| `FilterBar.tsx` | Search and filter controls |
| `Pagination.tsx` | Table pagination controls |
| `StatusBadge.tsx` | Status display badge |
| `SearchableSelect.tsx` | Dropdown with search |
| `PermissionGuard.tsx` | Conditionally renders by permission |
| `StatsCard.tsx` | Dashboard stat cards |
| `PageHeader.tsx` | Consistent page headers |
| `LocationPicker.tsx` | Google Maps location picker |
| `PropertyMapView.tsx` | Property map display |
| `ProjectMapView.tsx` | Project map display |
| `UserManagementPage.tsx` | Reusable user management component |

### Property Detail Components (`components/propertyDetails/`)
| Component | Purpose |
|---|---|
| `PropertyTypeDetails.tsx` | Switcher — selects correct detail component based on `category.name` and `listingType.name` |
| `ResidentialDetails.tsx` | Renders residential-specific fields: BHK, builtUpArea, furnishings, amenities, sellInfo/rentInfo |
| `PlotDetails.tsx` | Renders plot-specific fields: plotArea, dimensions, ownership, zone |
| `PGDetails.tsx` | Renders PG-specific fields: rooms+pricing, meals, commonAreas, notice/lock-in period |
| `CommercialDetails.tsx` | Renders commercial-specific fields: areas, floor info, ownership, zone, office seats/cabins |

### Services Pattern
Each domain has a dedicated service file in `src/services/` that wraps Axios calls:
```ts
// Example pattern
export const getProperties = (params) => axiosInstance.get('/api/properties', { params });
export const updateProperty = (id, data) => axiosInstance.put(`/api/properties/${id}`, data);
```

Key service files include `propertyListingService.ts` which exposes `getById(id)` for fetching a full property listing with all sub-documents (residentialDetails, plotDetails, pgDetails, commercialDetails, sellInfo, rentInfo), and `inquiriesService.ts` which fetches paginated admin enquiry records.

### Auth & Permissions
- `ProfileContext.tsx` — stores logged-in admin profile globally
- `lib/permissionRoutes.ts` — maps routes to required permissions
- `PermissionGuard` component — hides UI elements based on role permissions
- Axios interceptor (`lib/axiosInterceptor.ts`) — attaches cookies/credentials automatically

---

## Communication

- Frontend communicates with backend via REST API calls over Axios
- Base URL configured via `VITE_API_URL` environment variable in `frontend/.env`
- Credentials (JWT cookie) are sent with every request via `withCredentials: true`
- Backend CORS is configured to allow only the origins listed in `CLIENT_URL` env variable
