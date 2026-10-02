# Inquiries Controller Documentation

## Overview
The inquiries controller handles the creation of property inquiries, automatic assignment of those inquiries to eligible users on creation, and a cron-based re-assignment job that picks up any newly eligible users for existing active inquiries.

---

## Create Inquiry Controller - `/create`

### Purpose
Creates a new inquiry from user input (frontend chatbot), automatically creates `AssignedInquiry` records for all currently eligible users, and returns the created inquiry along with the count of assignments made.

### Request Body
```json
{
  "isProperty": boolean (required),
  "listingType": ObjectId (required),
  "propertyCategory": ObjectId (optional),
  "propertyType": ObjectId (optional),
  "preferredCity": string (required),
  "preferredArea": string (optional),
  "budget": {
    "min": number (required),
    "max": number (required)
  },
  "bhk": number (optional),
  "builtUpArea": {
    "value": number,
    "unit": string
  } (optional),
  "plotArea": {
    "value": number,
    "unit": string
  } (optional),
  "furnishingType": string (required),
  "inquiryClassification": string (required - "hot", "warm", "cold"),
  "lastFollowUpDate": date (required),
  "remarks": string (optional),
  "preferredCommunication": array of strings (required - min 1, values: "call", "whatsapp", "email", "sms")
}
```

### Response
**Success (201):**
```json
{
  "success": true,
  "message": "Inquiry created successfully",
  "inquiry": { /* full inquiry object */ },
  "assignedCount": 3
}
```

**Error (400/401/500):**
```json
{
  "success": false,
  "message": "Error description"
}
```

---

## Logic Flow

### 1. Authentication Check
- Verify user is logged in
- Extract user ID and details from `req.user`
- Return 401 if unauthorized

### 2. Request Validation
- Check all required fields are present
- Validate field types and constraints
- Return 400 if validation fails

### 3. Create User Context (createdBy Object)
- Extract user details: name, mobile, role
- Validate that name, mobile, and role exist (profile completion check)
- Return 400 if profile incomplete
- Store in `createdBy` field: `{ id, name, mobile, role }`

### 4. Create Inquiry in Database
- Insert inquiry document with all provided fields
- Set default status as "active"
- Return created inquiry object

### 5. Send WhatsApp Confirmation
- After saving the inquiry, send the approved `property_inquiry_confirmation` (`en_US`) template to `createdBy.mobile`. Its 12 body parameters follow this order: customer name, listing type, property category, property type, preferred area, preferred city, minimum budget, maximum budget, BHK, built-up or plot area, furnishing type, and company name (`RealSquare`; the template adds the static `Team` suffix).
- Optional category, property type, preferred area, BHK, area, and furnishing values use `NA` when missing; area uses built-up area first, then plot area, with its unit.
- Confirm and Reject quick replies carry inquiry-specific payloads. Meta calls `GET /api/webhooks/whatsapp` to verify the callback URL and `POST /api/webhooks/whatsapp` with reply events. The POST signature is checked with `WHATSAPP_APP_SECRET`; the GET verification token must match the existing `WHATSAPP_WEBHOOK_SECRET`.
- A reply is recorded in `whatsappResponse` only when the sender's WhatsApp number matches the inquiry creator. Confirm also sets `verifiedByUser.isVerified` and `verifiedByUser.source` to `whatsapp`; Reject marks the inquiry status as `rejected` and clears its verified flag/source. Duplicate message IDs are ignored.
- Configure Meta's callback URL as `https://<your-api-domain>/api/webhooks/whatsapp`, enter the same value as the backend's `WHATSAPP_WEBHOOK_SECRET`, and configure `WHATSAPP_APP_SECRET` from the Meta app. Subscribe the WhatsApp Business Account to the `messages` webhook field.
- WhatsApp send or template-data errors are logged and do not fail inquiry creation.

### 6. Find Eligible Users
Uses the `findEligibleUsers()` helper function:

#### Criteria for Eligibility:

**Step 1: Role-Based Filtering**
- **If `isProperty = true`**: Find users with roles in [Owner, Broker, Builder]
- **If `isProperty = false`**: Find users with roles in [Broker, Builder]

**Step 2: City Matching**
- User's `enquiryCities` array must include inquiry's `preferredCity`
- Case-sensitive exact match

**Step 3: Profile Completion Check**
- `name` field must exist and not be empty
- `mobile` field must exist and not be empty
- `role` field must exist and not be null

**Step 4: Exclusion**
- Exclude the inquiry creator (don't assign to themselves)

**Step 5: Data Projection**
- Return only: `_id` (as `id`), `name`, `mobile`, `role`

### 7. Create AssignedInquiry Records
Uses the `createAssignments()` helper function:
- Maps each eligible user to an `AssignedInquiry` document
- Sets `assignmentSource: "automatic"`
- Uses `insertMany({ ordered: false })` — if any duplicate-key errors occur (unique index on `{inquiry, assignedTo.id}`), they are silently skipped and only successfully inserted records are counted
- Returns the count of newly created assignment records

### 8. Return Response
- Return created inquiry object
- Return `assignedCount` — number of `AssignedInquiry` records successfully created
- Status: 201 (Created)

---

## Key Points

### Assignment Creation on Inquiry Create
- When an inquiry is created, `AssignedInquiry` records are **immediately created** for all currently eligible users via `createAssignments()`
- `assignmentSource` is set to `"automatic"` for these records
- Uses `insertMany({ ordered: false })` so a single failure doesn't block the rest
- If no eligible users exist at the time of creation, `assignedCount` will be `0` — the cron job will pick them up later

### Profile Completion Requirement
- Users must have name, mobile, and role to receive inquiries
- This ensures data quality and valid communication

### Exclusion of Creator
- Users cannot be assigned inquiries they created
- Prevents self-assignment

### City Matching
- Must have exact city match in `enquiryCities` array
- If user hasn't added any enquiry cities, they won't be eligible

---

## Assigned Inquiry Retrieval - `/assigned`

- Results are scoped to the authenticated user's `assignedTo.id`, then joined to their source inquiry before pagination.
- Active/locked assignments are hidden when their inquiry is expired, inactive, completed, or rejected. Purchased assignments remain visible after those status changes.
- `stats.total` equals the visible active plus purchased assignment count. Assignment status and classification stats count the same visible set; list filters do not change the overall stats.
- Closed locked assignments are filtered from the response, not deleted, preserving assignment history and Admin totals.

---

## Creator Inquiry Retrieval - `/my`

- Results are scoped to inquiries created by the authenticated user and use the requested filters for both pagination and stats.
- `stats.total` equals the number of inquiries matching those filters, matching `pagination.total`.

---

## Cron Assignment Controller - `/cron-assign`

### Purpose
Periodically re-runs assignment for all active inquiries to catch any newly eligible users (e.g. users who added a new city to their `enquiryCities` after the inquiry was created). Secured via `x-cron-secret` header — no user auth required.

### Security
- Request must include header: `x-cron-secret: <CRONJOB_SECRET>`
- Returns 401 if the header is missing or doesn't match `process.env.CRONJOB_SECRET`

### Response
**Success (200):**
```json
{
  "success": true,
  "message": "Cron assignment completed",
  "processed": 12,
  "newAssignments": 5
}
```

**No active inquiries (200):**
```json
{
  "success": true,
  "message": "No active inquiries found",
  "processed": 0,
  "newAssignments": 0
}
```

### Logic Flow
1. Fetch all inquiries with `status: "active"`
2. For each inquiry, call `findEligibleUsers()` (same criteria as `/create`)
3. Build `AssignedInquiry` documents with `assignmentSource: "cron"`
4. Run `insertMany({ ordered: false })` — the unique index on `{inquiry, assignedTo.id}` silently skips users who are already assigned; only genuinely new assignments are inserted
5. Accumulate count of newly inserted records across all inquiries
6. Return `processed` (total active inquiries) and `newAssignments` (total new records created)

### Key Points
- **Only creates new assignments** — already-assigned users are never duplicated due to the unique index
- `assignmentSource` is set to `"cron"` for all records created by this job
- Designed to be called on a schedule (e.g. every 6 hours) to keep assignments up to date as users update their profiles/cities

---

## Error Scenarios

| Error | Status | Cause |
|-------|--------|-------|
| Unauthorized | 401 | User not logged in |
| Missing required fields | 400 | Incomplete inquiry data |
| Profile incomplete | 400 | User missing name/mobile/role |
| Invalid communication preferences | 400 | Empty or invalid array |
| Database error | 500 | Query or save failure |

---

## Environment Variables Required
- `OWNER_ROLE_ID` - Owner role ObjectId
- `BROKER_ROLE_ID` - Broker role ObjectId
- `BUILDER_ROLE_ID` - Builder role ObjectId

---

## Sample Request Payloads

### Case 1 — Residential Property (Buy/Rent) with BHK
```json
POST /api/mixed/inquiries/create
Authorization: Bearer <token>

{
  "isProperty": true,
  "listingType": "6a421bc5e77bbe992f5a76ce",
  "propertyCategory": "6a421fe90766714c938bad42",
  "propertyType": "6a4221fc1fb23447b0936b10",
  "preferredCity": "Hyderabad",
  "preferredArea": "Banjara Hills",
  "budget": {
    "min": 5000000,
    "max": 10000000
  },
  "bhk": 3,
  "furnishingType": "Semi-Furnished",
  "inquiryClassification": "hot",
  "lastFollowUpDate": "2026-10-01T00:00:00.000Z",
  "remarks": "Looking for 3BHK flat near metro station",
  "preferredCommunication": ["call", "whatsapp"]
}
```

### Case 2 — Commercial Property with Built-up Area
```json
POST /api/mixed/inquiries/create
Authorization: Bearer <token>

{
  "isProperty": true,
  "listingType": "6a421bc5e77bbe992f5a76ce",
  "propertyCategory": "6a421fcf0766714c938bad3d",
  "propertyType": "6a4221fc1fb23447b0936b12",
  "preferredCity": "Mumbai",
  "preferredArea": "BKC",
  "budget": {
    "min": 20000000,
    "max": 50000000
  },
  "builtUpArea": {
    "value": 1200,
    "unit": "sqft"
  },
  "furnishingType": "Fully-Furnished",
  "inquiryClassification": "warm",
  "lastFollowUpDate": "2026-10-15T00:00:00.000Z",
  "remarks": "Need office space for 50 employees",
  "preferredCommunication": ["email", "call"]
}
```

### Case 3 — Plot Property with Plot Area
```json
POST /api/mixed/inquiries/create
Authorization: Bearer <token>

{
  "isProperty": true,
  "listingType": "6a421bc5e77bbe992f5a76ce",
  "propertyCategory": "6a421fe90766714c938bad42",
  "propertyType": "6a670a5f34d4283bdc621933",
  "preferredCity": "Pune",
  "preferredArea": "Hinjewadi",
  "budget": {
    "min": 3000000,
    "max": 8000000
  },
  "plotArea": {
    "value": 2400,
    "unit": "sqft"
  },
  "furnishingType": "Unfurnished",
  "inquiryClassification": "cold",
  "lastFollowUpDate": "2026-11-01T00:00:00.000Z",
  "preferredCommunication": ["sms"]
}
```

### Case 4 — PG/Co-Living (no category or propertyType)
```json
POST /api/mixed/inquiries/create
Authorization: Bearer <token>

{
  "isProperty": true,
  "listingType": "6a421b97e77bbe992f5a76c4",
  "preferredCity": "Bangalore",
  "budget": {
    "min": 8000,
    "max": 15000
  },
  "furnishingType": "Fully-Furnished",
  "inquiryClassification": "cold",
  "lastFollowUpDate": "2026-11-01T00:00:00.000Z",
  "preferredCommunication": ["whatsapp"]
}
```

---

## Field Reference

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| isProperty | Boolean | ✅ | true = property, false = project |
| listingType | MongoId | ✅ | Purpose ID (Buy/Rent/PG) |
| propertyCategory | MongoId | ❌ | Skip for PG/Co-Living |
| propertyType | MongoId | ❌ | Skip for PG/Co-Living |
| preferredCity | String | ✅ | City name |
| preferredArea | String | ❌ | Locality name |
| budget.min | Number | ✅ | Minimum budget |
| budget.max | Number | ✅ | Must be > budget.min |
| bhk | Number | ❌ | For residential non-plot only |
| builtUpArea.value | Number | ❌ | For commercial non-plot only |
| builtUpArea.unit | String | ❌ | sqft / sqyd / sqmt |
| plotArea.value | Number | ❌ | For plot types only |
| plotArea.unit | String | ❌ | sqft / sqyd / sqmt |
| furnishingType | String | ✅ | Unfurnished / Semi-Furnished / Fully-Furnished |
| inquiryClassification | String | ✅ | hot / warm / cold |
| lastFollowUpDate | ISO Date | ✅ | Future date |
| remarks | String | ❌ | Optional notes |
| preferredCommunication | Array | ✅ | Min 1: call / whatsapp / email / sms |
