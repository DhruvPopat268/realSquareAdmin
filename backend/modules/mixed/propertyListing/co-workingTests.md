# Coworking listing create validation cases

These cases exercise `POST /api/mixed/property-listings`. The create route sets coworking property listings to the configured Rent purpose before validating and saving them. The existing media upload route is unchanged.

## Valid payloads

Use the configured coworking `propertyTypeId`, commercial `categoryId`, and valid locality coordinates in each payload.

### Hall only

```json
{
  "categoryId": "<commercialCategoryId>",
  "listingTypeId": "<sellPurposeId>",
  "propertyTypeId": "<coworkingPropertyTypeId>",
  "cityName": "Pune",
  "locality": { "address": "Baner, Pune", "latitude": 18.56, "longitude": 73.78 },
  "commercialDetails": {
    "workSpaceFloor": 0,
    "workspaces": [
      { "type": "dedicated_coworking_desk", "availableSeats": 30, "rentPerSeat": 2000 }
    ]
  }
}
```

Expected: create succeeds and the saved listing purpose is Rent, regardless of the submitted purpose ID.

### Cabins only

```json
{
  "categoryId": "<commercialCategoryId>",
  "listingTypeId": "<rentPurposeId>",
  "propertyTypeId": "<coworkingPropertyTypeId>",
  "cityName": "Pune",
  "locality": { "address": "Baner, Pune", "latitude": 18.56, "longitude": 73.78 },
  "commercialDetails": {
    "workSpaceFloor": -1,
    "workspaces": [
      {
        "type": "individual_private_cabin",
        "available": 2,
        "config": [
          { "availableSeats": 4, "rentPerSeat": 5000 },
          { "availableSeats": 3, "rentPerSeat": 7000 }
        ]
      }
    ]
  }
}
```

Expected: create succeeds without built-up/carpet area or property-wide `rentInfo`.

### Hall and Cabins together

Expected: create succeeds when the `workspaces` array contains one valid `dedicated_coworking_desk` and one valid `individual_private_cabin` entry.

### Virtual Space with selected benefits

```json
{
  "categoryId": "<commercialCategoryId>",
  "listingTypeId": "<rentPurposeId>",
  "propertyTypeId": "<coworkingPropertyTypeId>",
  "cityName": "Pune",
  "locality": { "address": "Baner, Pune", "latitude": 18.56, "longitude": 73.78 },
  "commercialDetails": {
    "workSpaceFloor": 0,
    "workspaces": [
      {
        "type": "virtual_office",
        "benefits": [
          {
            "_id": "<activeBenefitPlanId>",
            "monthlyRent": 8000,
            "benefits": ["Business address"]
          }
        ]
      }
    ]
  }
}
```

Expected: create succeeds; the API loads the plan title from the master and saves the plan-specific rent and selected benefits in its snapshot.

## Invalid payload cases

Each case should return HTTP 400 with a validation error:

- `workspaces` missing or empty.
- Two `dedicated_coworking_desk` entries or two `individual_private_cabin` entries.
- Workspace type other than `dedicated_coworking_desk`, `individual_private_cabin`, or `virtual_office`.
- `workSpaceFloor` missing, less than `-1`, or not an integer.
- Hall seat count missing, zero, negative, or fractional; Hall rent missing or negative.
- Cabin count missing, zero, negative, or fractional; `config` count not equal to `available`.
- Cabin config seat count missing, zero, negative, or fractional; config rent missing or negative.
- Virtual-space benefit entries missing a valid active master ID, positive `monthlyRent`, or at least one selected benefit.
- Virtual-space rent sent on the workspace object instead of on each selected benefit plan.
- Cabin entries containing Hall fields or Hall entries containing cabin fields.

## Regression checks

- Non-coworking commercial listings still require their existing built-up/carpet details and Rent listings still require `rentInfo.monthlyRent`.
- `POST /api/mixed/property-listings/media` with no image files still returns HTTP 400 (`No images uploaded`).
