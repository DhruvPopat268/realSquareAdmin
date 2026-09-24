# RERA Verification — Implementation Plan

## Overview

RERA (Real Estate Regulatory Authority) verification is embedded directly into the
`PropertyListing` model (1-to-1 relationship). Verification runs automatically when
a property is created or updated. Admin approval sets a separate flag.

---

## Flow

```
[Customer fills RERA ID in Edit Property form]
              │
              ▼
[Customer clicks Save / Update Property]
              │
              ▼
[Backend: property create/update API runs]
              │
              ▼
[Auto-call RERA verify internally]
   Serper.dev (Google Search) → fetch top 3 pages → Gemini parses structured JSON
              │
              ├── verified: true + confidence: high
              │        → reraStatus = "verified"
              │          save projectDetails to DB
              │
              └── verified: false OR confidence: low/unknown
                       → reraStatus = "unverified"
                         save whatever partial details came back
              │
              ▼
[Property saved with rera object embedded]
              │
              ▼
[Admin reviews listing in Admin Panel]
              │
              ├── Admin approves listing
              │        → listing.status = "Active"
              │          listing.rera.reraAdminApproved = true   ← SET HERE
              │
              └── Admin rejects listing
                       → listing.status = "Rejected"
                         reraAdminApproved stays false
              │
              ▼
[Public listing page badge logic]
   reraStatus === "verified" AND reraAdminApproved === true
        → Show "RERA Verified ✓" badge
   else
        → Show nothing (or "RERA Unverified" for owner view only)
```

---

## Database Changes

### Embed `rera` object inside `PropertyListing` schema

```js
rera: {
  reraId:            { type: String, trim: true },
  reraStatus:        { type: String, enum: ["unverified", "verified"], default: "unverified" },
  reraAdminApproved: { type: Boolean, default: false },
  verifiedAt:        { type: Date, default: null },
  projectDetails: {
    projectName:    { type: String },
    developerName:  { type: String },
    localityOrCity: { type: String },
    state:          { type: String },
    projectType:    { type: String },
    completionDate: { type: String },
    totalUnits:     { type: String },
    status:         { type: String },
    confidence:     { type: String, enum: ["high", "low", "unknown"] },
  },
  sources: [{ type: String }],
}
```

---

## Files Summary

### Backend

| # | File | Action | What Changes |
|---|------|--------|--------------|
| 1 | `modules/mixed/propertyListing/model.js` | Modify | Add `rera` sub-schema |
| 2 | `modules/mixed/reraVerification/controller.js` | Modify | Extract `runReraVerification()` as reusable function |
| 3 | `modules/mixed/propertyListing/controller.js` | Modify | Call `runReraVerification()` in `updateListing()` |
| 4 | `modules/admin/propertyListing/controller.js` | Modify | Set `rera.reraAdminApproved = true` in `approve()` |

### Frontend

| # | File | Action | What Changes |
|---|------|--------|--------------|
| 5 | `src/pages/PropertiesPage.tsx` | Modify | Add RERA ID input field + RERA status badge in Edit Property section |
| 6 | `src/pages/PropertyDetailPage.tsx` | Modify | Show RERA verified badge + read-only project details section |
| 7 | `src/components/propertyDetails/ReraDetails.tsx` | Create | New component to display RERA project details (name, developer, status etc.) |

---

## Files to Change

### 1. `modules/mixed/propertyListing/model.js`
- Add `rera` sub-schema to `propertyListingSchema`

### 2. `modules/mixed/reraVerification/controller.js`
- Extract `verifyReraId` logic into a reusable internal function `runReraVerification(reraId)`
  that returns the structured result (not an Express response)
- Keep the existing POST route handler as a thin wrapper around it for standalone testing

### 3. `modules/mixed/propertyListing/controller.js`
- In `updateListing()` only: if `reraId` is sent, call `runReraVerification(reraId)` and embed result
- `create()` does NOT handle RERA — customer adds RERA only after property is created, via Edit Property page

### 4. `modules/admin/propertyListing/controller.js`
- In `approve()`: after setting `status = "Active"`, also set `rera.reraAdminApproved = true`

---

## API Changes

### PATCH /api/mixed/property-listings/:id (update only)
RERA is added/edited exclusively from the Edit Property page, so only the update API handles it.

**Request body** — add optional field:
```json
{ "reraId": "PR/GJ/VADODARA/..." }
```

**Behavior:**
- If `reraId` sent and differs from existing → re-verify → update `rera` object
- If `reraId` sent same as existing → skip re-verification (no wasted API calls)
- If `reraId` not sent → leave existing `rera` object untouched
- `create()` API is NOT touched — no RERA logic on property creation

---

### PATCH /api/admin/property-listings/:id/approve (existing)
**No request body change needed.**

**Behavior change:**
- Existing: sets `status = "Active"`, `approvedAt = now`
- New: also sets `rera.reraAdminApproved = true` if `rera.reraId` exists

---

## reraVerification Controller Refactor

```
verifyReraId(req, res)          ← existing Express route handler (kept for standalone API)
      │
      └── calls runReraVerification(reraId)
                │
                ├── searchRera(reraId)       — Serper.dev Google search
                ├── fetchPageText(url)       — fetch & strip HTML from top 3 results
                └── Gemini prompt            — extract structured JSON via responseSchema
```

`runReraVerification(reraId)` returns:
```js
{
  verified: Boolean,
  reason: String,
  projectDetails: { ... },
  sources: [String],
}
```

---

## Frontend (Edit Property Page)

- Add RERA ID text input field
- On save, include `reraId` in request body
- After save response, show badge:
  - `reraStatus === "verified"` → green badge "RERA Verified ✓"
  - `reraStatus === "unverified"` → yellow badge "RERA Unverified"
  - No `reraId` → nothing shown
- Show read-only project details below the field if `projectDetails` available
  (project name, developer, status, completion date etc.)

---

## Notes

- Re-verification only triggers if `reraId` changes on update — avoids unnecessary API calls
- `reraAdminApproved` is set only by admin approval, never by the customer
- Public listing page shows "RERA Verified ✓" ONLY when both conditions are true:
  `reraStatus === "verified"` AND `reraAdminApproved === true`
- Serper.dev key: `SERPER_API_KEY` in `.env`
- Gemini key: `GOOGLE_GEMINI_API_KEY` in `.env`
