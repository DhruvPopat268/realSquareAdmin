# Inquiries Controller Documentation

## Overview
The inquiries controller handles the creation of property inquiries and identification of eligible users for assignment.

---

## Create Inquiry Controller - `/create`

### Purpose
Creates a new inquiry from user input (frontend chatbot) and returns the created inquiry along with a list of eligible users who should be assigned this inquiry.

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
  "eligibleUsers": [
    {
      "id": "userId",
      "name": "John Doe",
      "mobile": "9876543210"
    }
  ],
  "eligibleCount": 2
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

### 5. Find Eligible Users
Uses the `findEligibleUsers()` helper function:

#### Criteria for Eligibility:

**Step 1: Role-Based Filtering**
- **If `isProperty = true`**: Find users with roles in [Owner, Broker, Builder]
- **If `isProperty = false`**: Find users with only Builder role

**Step 2: City Matching**
- User's `preferredCities` array must include inquiry's `preferredCity`
- Case-sensitive exact match

**Step 3: Profile Completion Check**
- `name` field must exist and not be empty
- `mobile` field must exist and not be empty
- `role` field must exist and not be null

**Step 4: Exclusion**
- Exclude the inquiry creator (don't assign to themselves)

**Step 5: Data Projection**
- Return only: `_id` (as `id`), `name`, `mobile`

### 6. Return Response
- Return inquiry object
- Return array of eligible users
- Return count of eligible users
- Status: 201 (Created)

---

## Key Points

### No Assignment Creation
- This controller **does NOT create InquiryAssignment records**
- It only identifies and returns eligible users
- Assignments will be created by:
  - Automatic assignment logic (future endpoint)
  - Cron job (runs every 6 hours)

### Profile Completion Requirement
- Users must have name, mobile, and role to receive inquiries
- This ensures data quality and valid communication

### Exclusion of Creator
- Users cannot be assigned inquiries they created
- Prevents self-assignment

### City Matching
- Must have exact city match in `preferredCities` array
- If user hasn't added preferred cities, they won't be eligible

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
- `VITE_OWNER_ROLE_ID` - Owner role ObjectId
- `VITE_BROKER_ROLE_ID` - Broker role ObjectId
- `VITE_BUILDER_ROLE_ID` - Builder role ObjectId

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
