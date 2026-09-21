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
| Property Types | `modules/admin/propertyTypes/` |
| Property Categories | `modules/admin/propertyCategories/` |
| Property Purposes | `modules/admin/propertyPurposes/` |
| Furnishings & Amenities | `modules/admin/furnishingsAndAmenities/` |
| Plans Management | `modules/admin/plansManagement/` |
| Enquiry Plans | `modules/admin/enquiryPlansManagement/` |
| Free Listing | `modules/admin/freeListingManagement/` |
| Purchased Plans | `modules/admin/purchasedPlans/` |
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
| Purchased Plans | `modules/mixed/purchasedPlans/` |
| Coins Transactions | `modules/mixed/coinsTransactions/` |
| Transactions | `modules/mixed/transactions/` |
| Purchase Coins | `modules/mixed/purchaseCoins/` |
| User Coins Wallet | `modules/mixed/userCoinsWallet/` |

### API Base URL
All routes are prefixed with `/api`.

### Auth Flow
- Login uses OTP-based authentication
- JWT token is stored in an HTTP-only cookie
- `middleware/auth.js` protects admin routes
- `middleware/userAuth.js` protects system user routes

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
| `EnquiriesPage.tsx` | Enquiry management |
| `PlansPage.tsx` | Subscription plans management |
| `EnquiryPlansPage.tsx` | Enquiry-specific plans |
| `PurchasedPlansPage.tsx` | Purchased plan records |
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

Key service files include `propertyListingService.ts` which exposes `getById(id)` for fetching a full property listing with all sub-documents (residentialDetails, plotDetails, pgDetails, commercialDetails, sellInfo, rentInfo).

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
