# Furnishing & Amenities — Implementation Plan

## Overview

Add furnishing type, furnishings, and amenities selection to the **Edit Property page**
for Residential (non-plot), PG, and Commercial (non-plot, non-others) property types.

---

## 1. When to Show / Hide

### ✅ Show Furnishing & Amenities

| Property Type                  | furnishType | furnishings | amenities |
|--------------------------------|-------------|-------------|-----------|
| Residential (non-plot)         | ✅          | ✅          | ✅        |
| PG                             | ✅          | ✅          | ✅        |
| Commercial (non-plot)          | ✅          | ✅          | ✅        |
| Commercial Others              | ✅          | ✅          | ✅        |

### ❌ Hide Furnishing & Amenities

| Property Type                  | furnishType | furnishings | amenities | Reason                    |
|--------------------------------|-------------|-------------|-----------|---------------------------|
| Residential Plot               | ❌          | ❌          | ❌        | `VITE_RESIDENTIAL_PROPERTY_TYPE_PLOT_IDS` |
| Commercial Plot                | ❌          | ❌          | ❌        | `VITE_COMMERCIAL_PROPERTY_TYPE_PLOT_IDS`  |

### Logic in Edit Forms (Frontend)

```javascript
// ResidentialEditForm.jsx
const isPlot = RESIDENTIAL_PLOT_IDS.includes(listing.propertyType?.id);
const showFurnishings = !isPlot;

// CommercialEditForm.jsx
const isCommPlot = COMMERCIAL_PLOT_IDS.includes(listing.propertyType?.id);
const showFurnishings = !isCommPlot; // Show for all commercial including Others

// PGEditForm.jsx
const showFurnishings = true; // Always show for PG
```

---

## 2. Data Flow

### 2.1 Fetching Furnishings & Amenities

- **API:** `GET /api/mixed/property-listings/active-furnishings-amenities`
- **Response:**
  ```json
  {
    "success": true,
    "data": {
      "furnishings": [
        { "_id": "id1", "name": "AC", "hasCount": true, "icon": "ac" },
        { "_id": "id2", "name": "Wardrobe", "hasCount": true, "icon": "wardrobe" },
        { "_id": "id3", "name": "Geyser", "hasCount": false, "icon": "geyser" }
      ],
      "amenities": [
        { "_id": "id4", "name": "Gym", "hasCount": false, "icon": "gym" },
        { "_id": "id5", "name": "Parking", "hasCount": false, "icon": "parking" },
        { "_id": "id6", "name": "Swimming Pool", "hasCount": false, "icon": "pool" }
      ]
    }
  }
  ```

### 2.2 Existing Data in Form (Pre-filled from listing)

```javascript
// Stored in DB (denormalized):
residentialDetails.furnishings = [
  { id: "id1", name: "AC", count: 2 },
  { id: "id2", name: "Wardrobe", count: 3 },
]
residentialDetails.amenities = [
  { id: "id4", name: "Gym", count: null },
]
```

### 2.3 Sending to PATCH API

Frontend sends using `furnishingId` + `count` (not `id`):
```json
{
  "residentialDetails": {
    "furnishings": [
      { "furnishingId": "id1", "count": 2 },
      { "furnishingId": "id2", "count": 3 }
    ],
    "amenities": [
      { "amenityId": "id4" }
    ]
  }
}
```

Backend resolves IDs → names and stores as `{ id, name, count }`.

---

## 3. Frontend UI Plan

### 3.1 Fetch Strategy

- Fetch furnishings & amenities **once** in `EditPropertyPage.jsx`
- Pass as props to each edit form (`ResidentialEditForm`, `CommercialEditForm`, `PGEditForm`)
- Only fetch when `showFurnishings` is true

```javascript
// EditPropertyPage.jsx
const [furnishingsAmenities, setFurnishingsAmenities] = useState({ furnishings: [], amenities: [] });

useEffect(() => {
  if (shouldShowFurnishings) {
    axios.get(`${API}/api/mixed/property-listings/active-furnishings-amenities`, ...)
      .then(res => setFurnishingsAmenities(res.data.data));
  }
}, [listing]);
```

### 3.2 UI Components

#### Furnish Type (Select)
```
[Unfurnished ▾] [Semi-Furnished ▾] [Fully-Furnished ▾]
```
- Simple SelectField (already exists in all forms)
- Always show when `showFurnishings = true`

#### Furnishings (Chip + Count)
- Show all available furnishings as chips
- Clicking a chip toggles selection
- If `hasCount = true` → show number input next to chip
- If `hasCount = false` → just toggle (no count)

```
[✓ AC  [2] ] [✓ Wardrobe [3] ] [ Fan ] [ Geyser ]
```

#### Amenities (Chip — no count)
- Show all available amenities as chips
- Just toggle (no count needed, amenities don't have quantity)
- Show as simple multi-select chips

```
[✓ Gym] [✓ Parking] [ Pool ] [ Lift ] [ CCTV ]
```

### 3.3 State Management in Form

```javascript
// Current selected furnishings in form state (using IDs for sending to API)
form.residentialDetails.furnishings = [
  { furnishingId: "id1", count: 2 },  // selected with count
  { furnishingId: "id3", count: 1 },  // selected without count (count=1 default)
]

// OR pre-filled from existing listing (using id field)
form.residentialDetails.furnishings = [
  { id: "id1", name: "AC", count: 2 },  // existing data from DB
]

// Helper to normalize both formats for display:
const selectedFurnishingIds = furnishings.map(f => f.id?.toString() ?? f.furnishingId);
const getFurnishingCount = (fid) => furnishings.find(f => 
  (f.id?.toString() ?? f.furnishingId) === fid
)?.count ?? 1;
```

---

## 4. Backend PATCH API Updates

### 4.1 Current State

The PATCH controller already handles furnishing/amenity resolution for `residentialDetails`:

```javascript
// In updateListing controller
if (residentialDetails !== undefined) {
  const hasNewFurnishings = Array.isArray(residentialDetails.furnishings) &&
    residentialDetails.furnishings.some((f) => f.furnishingId);
  const hasNewAmenities = Array.isArray(residentialDetails.amenities) &&
    residentialDetails.amenities.some((a) => a.amenityId);

  // Resolves IDs → names from FurnishingAmenity model
}
```

### 4.2 Required Changes

Extend the same ID-resolution logic to `pgDetails` and `commercialDetails`:

```javascript
// ── Resolve furnishings/amenities helper ──────────────────────────────────────
async function resolveFurnishingsAmenities(details, existingDetails) {
  const hasNewFurnishings = Array.isArray(details.furnishings) &&
    details.furnishings.some((f) => f.furnishingId);
  const hasNewAmenities = Array.isArray(details.amenities) &&
    details.amenities.some((a) => a.amenityId);

  if (!hasNewFurnishings && !hasNewAmenities) {
    return {
      ...existingDetails?.toObject?.() ?? {},
      ...details,
    };
  }

  const allIds = [
    ...(hasNewFurnishings ? details.furnishings.map((f) => f.furnishingId) : []),
    ...(hasNewAmenities   ? details.amenities.map((a) => a.amenityId)     : []),
  ].filter(Boolean);

  const items   = await FurnishingAmenity.find({ _id: { $in: allIds } }).select("name");
  const itemMap = Object.fromEntries(items.map((i) => [i._id.toString(), i.name]));

  return {
    ...existingDetails?.toObject?.() ?? {},
    ...details,
    furnishings: hasNewFurnishings
      ? details.furnishings.map((f) => ({
          id:    f.furnishingId,
          name:  itemMap[f.furnishingId],
          count: f.count,
        }))
      : details.furnishings ?? existingDetails?.furnishings,
    amenities: hasNewAmenities
      ? details.amenities.map((a) => ({
          id:   a.amenityId,
          name: itemMap[a.amenityId],
          count: a.count,
        }))
      : details.amenities ?? existingDetails?.amenities,
  };
}

// ── Use in updateListing controller ──────────────────────────────────────────
if (residentialDetails !== undefined) {
  listing.residentialDetails = residentialDetails === null
    ? null
    : await resolveFurnishingsAmenities(residentialDetails, listing.residentialDetails);
}

if (pgDetails !== undefined) {
  if (pgDetails === null) {
    listing.pgDetails = null;
  } else {
    const resolved = await resolveFurnishingsAmenities(pgDetails, listing.pgDetails);
    const rooms = (resolved.rooms || listing.pgDetails?.rooms || []).map((r) =>
      r.roomType === "1 Sharing" ? { ...r, bedsAvailable: 1 } : r
    );
    listing.pgDetails = { ...resolved, rooms };
  }
}

if (commercialDetails !== undefined) {
  listing.commercialDetails = commercialDetails === null
    ? null
    : await resolveFurnishingsAmenities(commercialDetails, listing.commercialDetails);
}
```

---

## 5. Implementation Steps

### Step 1: Backend
- [ ] Extract `resolveFurnishingsAmenities` as a shared helper function
- [ ] Apply it to `pgDetails` and `commercialDetails` in `updateListing`

### Step 2: Frontend — EditPropertyPage
- [ ] Add `furnishingsAmenities` state
- [ ] Fetch active furnishings & amenities
- [ ] Determine `showFurnishings` based on `propertyTypeId` and env vars
- [ ] Pass `furnishingsAmenities` and `showFurnishings` as props to edit forms

### Step 3: Frontend — ResidentialEditForm
- [ ] Add `FurnishingsAmenitiesSection` component (toggle chips + count input)
- [ ] Show only when `showFurnishings = true`
- [ ] Handle both existing DB format `{ id, name, count }` and new format `{ furnishingId, count }`

### Step 4: Frontend — CommercialEditForm
- [ ] Add same `FurnishingsAmenitiesSection`
- [ ] Show only when `!isCommPlot` (hide only for commercial plots)

### Step 5: Frontend — PGEditForm
- [ ] Add same `FurnishingsAmenitiesSection`
- [ ] Always show for PG

### Step 6: Frontend — Shared Component
- [ ] Create `FurnishingsAmenitiesSection.jsx` reusable component
  - Props: `furnishings[]`, `amenities[]`, `selectedFurnishings[]`, `selectedAmenities[]`,
    `onFurnishingsChange`, `onAmenitiesChange`, `disabled`
  - Renders furnish type select + furnishings chips + amenities chips

---

## 6. Env Variables Required (Frontend)

```env
VITE_RESIDENTIAL_PROPERTY_TYPE_PLOT_IDS=id1,id2
VITE_COMMERCIAL_PROPERTY_TYPE_PLOT_IDS=id3,id4
VITE_COMMERCIAL_PROPERTY_TYPE_OTHERS_IDS=id5
```

These are already defined in `chatbotConstants.js` and available via `import.meta.env`.

---

## 7. Summary

| Layer    | File                                  | Change                                         |
|----------|---------------------------------------|------------------------------------------------|
| Model    | `model.js`                            | ✅ Done — added furnishings/amenities to PG & Commercial |
| Backend  | `controller.js` (updateListing)       | Extract helper, apply to PG & Commercial       |
| Frontend | `EditPropertyPage.jsx`                | Fetch furnishings/amenities, pass to forms     |
| Frontend | `FurnishingsAmenitiesSection.jsx`     | New shared component for chips UI              |
| Frontend | `ResidentialEditForm.jsx`             | Integrate FurnishingsAmenitiesSection          |
| Frontend | `CommercialEditForm.jsx`              | Integrate FurnishingsAmenitiesSection          |
| Frontend | `PGEditForm.jsx`                      | Integrate FurnishingsAmenitiesSection          |
