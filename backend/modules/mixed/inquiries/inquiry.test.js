/**
 * Inquiry API Test Cases
 * ─────────────────────────────────────────────────────────────────────────────
 * Tests the inquiry creation endpoint:
 *   POST /api/mixed/inquiries/create
 *
 * Covers:
 *   - Auth checks (401 — no token, expired/invalid token)
 *   - Required field validations (400 — missing each required field)
 *   - Field type/format validations (400 — wrong types, bad enums, bad IDs)
 *   - Budget cross-field validation (max must be > min)
 *   - Conditional area field validation (builtUpArea / plotArea unit+value pair)
 *   - preferredCommunication array validations
 *   - Happy path cases: residential BHK, commercial builtUpArea, plot, PG, project
 *
 * Uses real DB (MONGO_URI from .env).
 * The /create endpoint only inserts a new doc — no cleanup needed since
 * inquiries don't affect other test data. Created docs are noted per test.
 */

require("dotenv").config();
const request = require("supertest");
const app     = require("../../../server");

// ─── Auth Token ───────────────────────────────────────────────────────────────
// A valid user token from the DB (owner/broker/builder user with name + mobile + role)
// Replace this with a fresh token if it expires.
const USER_TOKEN = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjZhYmExMGQzYmM2YjI0NDNkNTYyYmExOSIsImlhdCI6MTc5MDU4MDYzNSwiZXhwIjoxNzkxMTg1NDM1fQ.SboX8RnGY3nvDQEmUHD5Sn2K6CSuGmw9N4KHwCfYzyM";

// ─── Real IDs from DB (from .env) ────────────────────────────────────────────
const LISTING_TYPE_SELL_ID       = process.env.LISTING_TYPE_SELL_ID;       // Buy/Sell
const LISTING_TYPE_RENT_ID       = process.env.LISTING_TYPE_RENT_ID;       // Rent
const LISTING_TYPE_PG_ID         = process.env.LISTING_TYPE_PG_ID;         // PG/Co-Living
const CATEGORY_RESIDENTIAL_ID    = process.env.CATEGORY_RESIDENTIAL_ID;
const CATEGORY_COMMERCIAL_ID     = process.env.CATEGORY_COMMERCIAL_ID;

// Some real property type IDs from DB
const PT_RESIDENTIAL_APARTMENT   = "6a4221fc1fb23447b0936b10"; // Apartment (residential)
const PT_RESIDENTIAL_PLOT        = "6a670a5f34d4283bdc621933"; // Plot (residential)
const PT_COMMERCIAL_OFFICE       = "6a4221fc1fb23447b0936b12"; // Office (commercial)
const PT_COMMERCIAL_PLOT         = "6a670ab234d4283bdc621960"; // Plot (commercial)

const FAKE_VALID_ID = "000000000000000000000001"; // Valid ObjectId format, no doc in DB
const INVALID_ID    = "not-a-valid-mongo-id";

// ─── Base valid payload ───────────────────────────────────────────────────────
// Use this as the foundation and override fields per test
const BASE_PAYLOAD = {
  isProperty:              true,
  listingType:             LISTING_TYPE_SELL_ID,
  propertyCategory:        CATEGORY_RESIDENTIAL_ID,
  propertyType:            PT_RESIDENTIAL_APARTMENT,
  preferredCity:           "Hyderabad",
  preferredArea:           "Banjara Hills",
  budget:                  { min: 5000000, max: 10000000 },
  bhk:                     3,
  furnishingType:          "Semi-Furnished",
  inquiryClassification:   "hot",
  lastFollowUpDate:        "2026-12-01T00:00:00.000Z",
  remarks:                 "Looking for 3BHK near metro",
  preferredCommunication:  ["call", "whatsapp"],
};

// ─── Helpers ──────────────────────────────────────────────────────────────────
const postInquiry = (payload, token = USER_TOKEN) =>
  request(app)
    .post("/api/mixed/inquiries/create")
    .set("Authorization", `Bearer ${token}`)
    .send(payload);

const postNoAuth = (payload) =>
  request(app)
    .post("/api/mixed/inquiries/create")
    .send(payload);


// ═════════════════════════════════════════════════════════════════════════════
// 1. AUTH CHECKS
// ═════════════════════════════════════════════════════════════════════════════

describe("Auth — /api/mixed/inquiries/create", () => {

  test("401 — no token at all", async () => {
    const res = await postNoAuth(BASE_PAYLOAD);
    expect(res.statusCode).toBe(401);
    expect(res.body.success).toBe(false);
  });

  test("401 — invalid/garbage token", async () => {
    const res = await request(app)
      .post("/api/mixed/inquiries/create")
      .set("Authorization", "Bearer thisIsNotAValidToken")
      .send(BASE_PAYLOAD);
    expect(res.statusCode).toBe(401);
    expect(res.body.success).toBe(false);
  });

  test("401 — malformed Authorization header (no Bearer prefix)", async () => {
    const res = await request(app)
      .post("/api/mixed/inquiries/create")
      .set("Authorization", USER_TOKEN) // missing "Bearer " prefix
      .send(BASE_PAYLOAD);
    expect(res.statusCode).toBe(401);
    expect(res.body.success).toBe(false);
  });

});


// ═════════════════════════════════════════════════════════════════════════════
// 2. REQUIRED FIELD VALIDATIONS (missing fields → 400)
// ═════════════════════════════════════════════════════════════════════════════

describe("Required field validations — missing fields", () => {

  test("400 — missing isProperty", async () => {
    const { isProperty, ...payload } = BASE_PAYLOAD;
    const res = await postInquiry(payload);
    expect(res.statusCode).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toMatch(/isProperty/i);
  });

  test("400 — missing listingType", async () => {
    const { listingType, ...payload } = BASE_PAYLOAD;
    const res = await postInquiry(payload);
    expect(res.statusCode).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toMatch(/listingType/i);
  });

  test("400 — missing preferredCity", async () => {
    const { preferredCity, ...payload } = BASE_PAYLOAD;
    const res = await postInquiry(payload);
    expect(res.statusCode).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toMatch(/preferredCity/i);
  });

  test("400 — missing budget entirely", async () => {
    const { budget, ...payload } = BASE_PAYLOAD;
    const res = await postInquiry(payload);
    expect(res.statusCode).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toMatch(/budget/i);
  });

  test("400 — missing budget.min", async () => {
    const res = await postInquiry({ ...BASE_PAYLOAD, budget: { max: 10000000 } });
    expect(res.statusCode).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toMatch(/budget\.min/i);
  });

  test("400 — missing budget.max", async () => {
    const res = await postInquiry({ ...BASE_PAYLOAD, budget: { min: 5000000 } });
    expect(res.statusCode).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toMatch(/budget\.max/i);
  });

  test("400 — missing furnishingType", async () => {
    const { furnishingType, ...payload } = BASE_PAYLOAD;
    const res = await postInquiry(payload);
    expect(res.statusCode).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toMatch(/furnishingType/i);
  });

  test("400 — missing inquiryClassification", async () => {
    const { inquiryClassification, ...payload } = BASE_PAYLOAD;
    const res = await postInquiry(payload);
    expect(res.statusCode).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toMatch(/inquiryClassification/i);
  });

  test("400 — missing lastFollowUpDate", async () => {
    const { lastFollowUpDate, ...payload } = BASE_PAYLOAD;
    const res = await postInquiry(payload);
    expect(res.statusCode).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toMatch(/lastFollowUpDate/i);
  });

  test("400 — missing preferredCommunication", async () => {
    const { preferredCommunication, ...payload } = BASE_PAYLOAD;
    const res = await postInquiry(payload);
    expect(res.statusCode).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toMatch(/preferredCommunication/i);
  });

});


// ═════════════════════════════════════════════════════════════════════════════
// 3. FIELD TYPE / FORMAT VALIDATIONS
// ═════════════════════════════════════════════════════════════════════════════

describe("Field type and format validations", () => {

  // ── isProperty ──────────────────────────────────────────────────────────────
  test("400 — isProperty is a string instead of boolean", async () => {
    const res = await postInquiry({ ...BASE_PAYLOAD, isProperty: "yes" });
    expect(res.statusCode).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toMatch(/isProperty/i);
  });

  test("400 — isProperty is a number instead of boolean", async () => {
    const res = await postInquiry({ ...BASE_PAYLOAD, isProperty: 1 });
    expect(res.statusCode).toBe(400);
    expect(res.body.success).toBe(false);
  });

  // ── listingType ─────────────────────────────────────────────────────────────
  test("400 — listingType is not a valid MongoId", async () => {
    const res = await postInquiry({ ...BASE_PAYLOAD, listingType: INVALID_ID });
    expect(res.statusCode).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toMatch(/listingType/i);
  });

  // ── propertyCategory ────────────────────────────────────────────────────────
  test("400 — propertyCategory is not a valid MongoId", async () => {
    const res = await postInquiry({ ...BASE_PAYLOAD, propertyCategory: INVALID_ID });
    expect(res.statusCode).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toMatch(/propertyCategory/i);
  });

  // ── propertyType ────────────────────────────────────────────────────────────
  test("400 — propertyType is not a valid MongoId", async () => {
    const res = await postInquiry({ ...BASE_PAYLOAD, propertyType: INVALID_ID });
    expect(res.statusCode).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toMatch(/propertyType/i);
  });

  // ── budget ──────────────────────────────────────────────────────────────────
  test("400 — budget.min is negative", async () => {
    const res = await postInquiry({ ...BASE_PAYLOAD, budget: { min: -100, max: 10000000 } });
    expect(res.statusCode).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toMatch(/budget\.min/i);
  });

  test("400 — budget.min is a string", async () => {
    const res = await postInquiry({ ...BASE_PAYLOAD, budget: { min: "five lakhs", max: 10000000 } });
    expect(res.statusCode).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toMatch(/budget\.min/i);
  });

  test("400 — budget.max is negative", async () => {
    const res = await postInquiry({ ...BASE_PAYLOAD, budget: { min: 1000000, max: -500 } });
    expect(res.statusCode).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toMatch(/budget\.max/i);
  });

  // ── furnishingType ──────────────────────────────────────────────────────────
  test("400 — furnishingType has invalid value", async () => {
    const res = await postInquiry({ ...BASE_PAYLOAD, furnishingType: "Partially-Furnished" });
    expect(res.statusCode).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toMatch(/furnishingType/i);
  });

  // ── inquiryClassification ───────────────────────────────────────────────────
  test("400 — inquiryClassification has invalid value", async () => {
    const res = await postInquiry({ ...BASE_PAYLOAD, inquiryClassification: "urgent" });
    expect(res.statusCode).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toMatch(/inquiryClassification/i);
  });

  // ── lastFollowUpDate ────────────────────────────────────────────────────────
  test("400 — lastFollowUpDate is not a valid ISO date", async () => {
    const res = await postInquiry({ ...BASE_PAYLOAD, lastFollowUpDate: "01-12-2026" });
    expect(res.statusCode).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toMatch(/lastFollowUpDate/i);
  });

  test("400 — lastFollowUpDate is a random string", async () => {
    const res = await postInquiry({ ...BASE_PAYLOAD, lastFollowUpDate: "not-a-date" });
    expect(res.statusCode).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toMatch(/lastFollowUpDate/i);
  });

  // ── bhk ─────────────────────────────────────────────────────────────────────
  test("400 — bhk is a float (not integer)", async () => {
    const res = await postInquiry({ ...BASE_PAYLOAD, bhk: 2.5 });
    expect(res.statusCode).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toMatch(/bhk/i);
  });

  test("400 — bhk is negative", async () => {
    const res = await postInquiry({ ...BASE_PAYLOAD, bhk: -1 });
    expect(res.statusCode).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toMatch(/bhk/i);
  });

});


// ═════════════════════════════════════════════════════════════════════════════
// 4. BUDGET CROSS-FIELD VALIDATION
// ═════════════════════════════════════════════════════════════════════════════

describe("Budget cross-field validation", () => {

  test("400 — budget.max equal to budget.min (must be strictly greater)", async () => {
    const res = await postInquiry({ ...BASE_PAYLOAD, budget: { min: 5000000, max: 5000000 } });
    expect(res.statusCode).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toMatch(/budget\.max/i);
  });

  test("400 — budget.max less than budget.min", async () => {
    const res = await postInquiry({ ...BASE_PAYLOAD, budget: { min: 10000000, max: 5000000 } });
    expect(res.statusCode).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toMatch(/budget\.max/i);
  });

  test("200 — budget.max just 1 rupee more than min (edge case passes)", async () => {
    const res = await postInquiry({ ...BASE_PAYLOAD, budget: { min: 5000000, max: 5000001 } });
    expect(res.statusCode).toBe(201);
    expect(res.body.success).toBe(true);
  });

  test("200 — budget.min = 0 is allowed (zero-floor edge case)", async () => {
    const res = await postInquiry({ ...BASE_PAYLOAD, budget: { min: 0, max: 1000000 } });
    expect(res.statusCode).toBe(201);
    expect(res.body.success).toBe(true);
  });

});


// ═════════════════════════════════════════════════════════════════════════════
// 5. PREFERRED COMMUNICATION VALIDATIONS
// ═════════════════════════════════════════════════════════════════════════════

describe("preferredCommunication validations", () => {

  test("400 — empty array (min 1 required)", async () => {
    const res = await postInquiry({ ...BASE_PAYLOAD, preferredCommunication: [] });
    expect(res.statusCode).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toMatch(/preferredCommunication/i);
  });

  test("400 — invalid value inside array", async () => {
    const res = await postInquiry({ ...BASE_PAYLOAD, preferredCommunication: ["call", "telegram"] });
    expect(res.statusCode).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toMatch(/preferredCommunication/i);
  });

  test("400 — not an array (string instead)", async () => {
    const res = await postInquiry({ ...BASE_PAYLOAD, preferredCommunication: "call" });
    expect(res.statusCode).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toMatch(/preferredCommunication/i);
  });

  test("200 — single valid value is accepted", async () => {
    const res = await postInquiry({ ...BASE_PAYLOAD, preferredCommunication: ["email"] });
    expect(res.statusCode).toBe(201);
    expect(res.body.success).toBe(true);
  });

  test("200 — all 4 valid values at once", async () => {
    const res = await postInquiry({ ...BASE_PAYLOAD, preferredCommunication: ["call", "whatsapp", "email", "sms"] });
    expect(res.statusCode).toBe(201);
    expect(res.body.success).toBe(true);
  });

});


// ═════════════════════════════════════════════════════════════════════════════
// 6. CONDITIONAL AREA FIELD VALIDATIONS (builtUpArea & plotArea)
// ═════════════════════════════════════════════════════════════════════════════

describe("builtUpArea conditional validations", () => {

  test("400 — builtUpArea.value sent but builtUpArea.unit missing", async () => {
    const res = await postInquiry({
      ...BASE_PAYLOAD,
      builtUpArea: { value: 1200 }, // unit missing
    });
    expect(res.statusCode).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toMatch(/builtUpArea\.unit/i);
  });

  test("400 — builtUpArea.unit sent but builtUpArea.value missing", async () => {
    const res = await postInquiry({
      ...BASE_PAYLOAD,
      builtUpArea: { unit: "sqft" }, // value missing
    });
    expect(res.statusCode).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toMatch(/builtUpArea\.value/i);
  });

  test("400 — builtUpArea.unit is an invalid enum value", async () => {
    const res = await postInquiry({
      ...BASE_PAYLOAD,
      builtUpArea: { value: 1200, unit: "acres" }, // invalid unit
    });
    expect(res.statusCode).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toMatch(/builtUpArea\.unit/i);
  });

  test("400 — builtUpArea.value is negative", async () => {
    const res = await postInquiry({
      ...BASE_PAYLOAD,
      builtUpArea: { value: -500, unit: "sqft" },
    });
    expect(res.statusCode).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toMatch(/builtUpArea\.value/i);
  });

  test("200 — valid builtUpArea with all 3 unit types accepted", async () => {
    for (const unit of ["sqft", "sqyd", "sqmt"]) {
      const res = await postInquiry({
        ...BASE_PAYLOAD,
        builtUpArea: { value: 1200, unit },
      });
      expect(res.statusCode).toBe(201);
      expect(res.body.success).toBe(true);
    }
  });

});

describe("plotArea conditional validations", () => {

  test("400 — plotArea.value sent but plotArea.unit missing", async () => {
    const res = await postInquiry({
      ...BASE_PAYLOAD,
      plotArea: { value: 2400 }, // unit missing
    });
    expect(res.statusCode).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toMatch(/plotArea\.unit/i);
  });

  test("400 — plotArea.unit sent but plotArea.value missing", async () => {
    const res = await postInquiry({
      ...BASE_PAYLOAD,
      plotArea: { unit: "sqft" }, // value missing
    });
    expect(res.statusCode).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toMatch(/plotArea\.value/i);
  });

  test("400 — plotArea.unit is an invalid enum value", async () => {
    const res = await postInquiry({
      ...BASE_PAYLOAD,
      plotArea: { value: 2400, unit: "bigha" }, // invalid
    });
    expect(res.statusCode).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toMatch(/plotArea\.unit/i);
  });

  test("400 — plotArea.value is negative", async () => {
    const res = await postInquiry({
      ...BASE_PAYLOAD,
      plotArea: { value: -100, unit: "sqmt" },
    });
    expect(res.statusCode).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toMatch(/plotArea\.value/i);
  });

  test("200 — valid plotArea with all 3 unit types accepted", async () => {
    for (const unit of ["sqft", "sqyd", "sqmt"]) {
      const res = await postInquiry({
        ...BASE_PAYLOAD,
        plotArea: { value: 2400, unit },
      });
      expect(res.statusCode).toBe(201);
      expect(res.body.success).toBe(true);
    }
  });

});


// ═════════════════════════════════════════════════════════════════════════════
// 7. OPTIONAL FIELD BEHAVIOR
// ═════════════════════════════════════════════════════════════════════════════

describe("Optional fields — omitted vs provided", () => {

  test("201 — propertyCategory and propertyType omitted (PG case)", async () => {
    const { propertyCategory, propertyType, bhk, ...pgPayload } = BASE_PAYLOAD;
    const res = await postInquiry({
      ...pgPayload,
      listingType: LISTING_TYPE_PG_ID,
    });
    expect(res.statusCode).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.inquiry.propertyCategory).toBeUndefined();
    expect(res.body.inquiry.propertyType).toBeUndefined();
  });

  test("201 — preferredArea omitted", async () => {
    const { preferredArea, ...payload } = BASE_PAYLOAD;
    const res = await postInquiry(payload);
    expect(res.statusCode).toBe(201);
    expect(res.body.success).toBe(true);
  });

  test("201 — bhk omitted entirely", async () => {
    const { bhk, ...payload } = BASE_PAYLOAD;
    const res = await postInquiry(payload);
    expect(res.statusCode).toBe(201);
    expect(res.body.success).toBe(true);
  });

  test("201 — remarks omitted", async () => {
    const { remarks, ...payload } = BASE_PAYLOAD;
    const res = await postInquiry(payload);
    expect(res.statusCode).toBe(201);
    expect(res.body.success).toBe(true);
  });

  test("201 — builtUpArea omitted entirely (no error)", async () => {
    const { ...payload } = BASE_PAYLOAD;
    delete payload.builtUpArea;
    const res = await postInquiry(payload);
    expect(res.statusCode).toBe(201);
    expect(res.body.success).toBe(true);
  });

  test("201 — plotArea omitted entirely (no error)", async () => {
    const { ...payload } = BASE_PAYLOAD;
    delete payload.plotArea;
    const res = await postInquiry(payload);
    expect(res.statusCode).toBe(201);
    expect(res.body.success).toBe(true);
  });

});


// ═════════════════════════════════════════════════════════════════════════════
// 8. HAPPY PATH — SUCCESSFUL INQUIRY CREATION (201)
// ═════════════════════════════════════════════════════════════════════════════

describe("Happy path — 201 successful inquiry creation", () => {

  test("201 — Residential BHK inquiry (Sell)", async () => {
    const res = await postInquiry({
      isProperty:             true,
      listingType:            LISTING_TYPE_SELL_ID,
      propertyCategory:       CATEGORY_RESIDENTIAL_ID,
      propertyType:           PT_RESIDENTIAL_APARTMENT,
      preferredCity:          "Hyderabad",
      preferredArea:          "Banjara Hills",
      budget:                 { min: 5000000, max: 10000000 },
      bhk:                    3,
      furnishingType:         "Semi-Furnished",
      inquiryClassification:  "hot",
      lastFollowUpDate:       "2026-12-01T00:00:00.000Z",
      remarks:                "Looking for 3BHK near metro",
      preferredCommunication: ["call", "whatsapp"],
    });
    expect(res.statusCode).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.inquiry).toBeDefined();
    expect(res.body.inquiry.isProperty).toBe(true);
    expect(res.body.inquiry.status).toBe("active");
    expect(res.body.inquiry.bhk).toBe(3);
    expect(res.body.eligibleUsers).toBeDefined();
    expect(Array.isArray(res.body.eligibleUsers)).toBe(true);
    expect(typeof res.body.eligibleCount).toBe("number");
  });

  test("201 — Commercial builtUpArea inquiry (Rent)", async () => {
    const res = await postInquiry({
      isProperty:             true,
      listingType:            LISTING_TYPE_RENT_ID,
      propertyCategory:       CATEGORY_COMMERCIAL_ID,
      propertyType:           PT_COMMERCIAL_OFFICE,
      preferredCity:          "Mumbai",
      preferredArea:          "BKC",
      budget:                 { min: 20000000, max: 50000000 },
      builtUpArea:            { value: 1200, unit: "sqft" },
      furnishingType:         "Fully-Furnished",
      inquiryClassification:  "warm",
      lastFollowUpDate:       "2026-11-15T00:00:00.000Z",
      remarks:                "Need office space for 50 employees",
      preferredCommunication: ["email", "call"],
    });
    expect(res.statusCode).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.inquiry.builtUpArea.value).toBe(1200);
    expect(res.body.inquiry.builtUpArea.unit).toBe("sqft");
  });

  test("201 — Residential Plot inquiry with plotArea", async () => {
    const res = await postInquiry({
      isProperty:             true,
      listingType:            LISTING_TYPE_SELL_ID,
      propertyCategory:       CATEGORY_RESIDENTIAL_ID,
      propertyType:           PT_RESIDENTIAL_PLOT,
      preferredCity:          "Pune",
      preferredArea:          "Hinjewadi",
      budget:                 { min: 3000000, max: 8000000 },
      plotArea:               { value: 2400, unit: "sqft" },
      furnishingType:         "Unfurnished",
      inquiryClassification:  "cold",
      lastFollowUpDate:       "2026-11-01T00:00:00.000Z",
      preferredCommunication: ["sms"],
    });
    expect(res.statusCode).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.inquiry.plotArea.value).toBe(2400);
    expect(res.body.inquiry.plotArea.unit).toBe("sqft");
  });

  test("201 — PG/Co-Living inquiry (no category, no propertyType, no bhk)", async () => {
    const res = await postInquiry({
      isProperty:             true,
      listingType:            LISTING_TYPE_PG_ID,
      preferredCity:          "Bangalore",
      budget:                 { min: 8000, max: 15000 },
      furnishingType:         "Fully-Furnished",
      inquiryClassification:  "cold",
      lastFollowUpDate:       "2026-11-01T00:00:00.000Z",
      preferredCommunication: ["whatsapp"],
    });
    expect(res.statusCode).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.inquiry.bhk).toBeUndefined();
    expect(res.body.inquiry.propertyCategory).toBeUndefined();
    expect(res.body.inquiry.propertyType).toBeUndefined();
  });

  test("201 — Project inquiry (isProperty = false, Builder role only)", async () => {
    const res = await postInquiry({
      isProperty:             false,
      listingType:            LISTING_TYPE_SELL_ID,
      preferredCity:          "Chennai",
      budget:                 { min: 10000000, max: 30000000 },
      furnishingType:         "Unfurnished",
      inquiryClassification:  "warm",
      lastFollowUpDate:       "2026-12-15T00:00:00.000Z",
      preferredCommunication: ["call"],
    });
    expect(res.statusCode).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.inquiry.isProperty).toBe(false);
  });

  test("201 — Response shape has all expected top-level keys", async () => {
    const res = await postInquiry(BASE_PAYLOAD);
    expect(res.statusCode).toBe(201);
    expect(res.body).toHaveProperty("success", true);
    expect(res.body).toHaveProperty("message");
    expect(res.body).toHaveProperty("inquiry");
    expect(res.body).toHaveProperty("eligibleUsers");
    expect(res.body).toHaveProperty("eligibleCount");
  });

  test("201 — Saved inquiry has correct createdBy and status fields", async () => {
    const res = await postInquiry(BASE_PAYLOAD);
    expect(res.statusCode).toBe(201);
    const { inquiry } = res.body;
    expect(inquiry.createdBy).toBeDefined();
    expect(inquiry.createdBy.id).toBeDefined();
    expect(inquiry.createdBy.name).toBeDefined();
    expect(inquiry.createdBy.mobile).toBeDefined();
    expect(inquiry.status).toBe("active");
    expect(inquiry._id).toBeDefined();
    expect(inquiry.createdAt).toBeDefined();
  });

  test("201 — inquiryClassification 'warm' is saved correctly", async () => {
    const res = await postInquiry({ ...BASE_PAYLOAD, inquiryClassification: "warm" });
    expect(res.statusCode).toBe(201);
    expect(res.body.inquiry.inquiryClassification).toBe("warm");
  });

  test("201 — inquiryClassification 'cold' is saved correctly", async () => {
    const res = await postInquiry({ ...BASE_PAYLOAD, inquiryClassification: "cold" });
    expect(res.statusCode).toBe(201);
    expect(res.body.inquiry.inquiryClassification).toBe("cold");
  });

  test("201 — furnishingType 'Unfurnished' is saved correctly", async () => {
    const res = await postInquiry({ ...BASE_PAYLOAD, furnishingType: "Unfurnished" });
    expect(res.statusCode).toBe(201);
    expect(res.body.inquiry.furnishingType).toBe("Unfurnished");
  });

  test("201 — furnishingType 'Fully-Furnished' is saved correctly", async () => {
    const res = await postInquiry({ ...BASE_PAYLOAD, furnishingType: "Fully-Furnished" });
    expect(res.statusCode).toBe(201);
    expect(res.body.inquiry.furnishingType).toBe("Fully-Furnished");
  });

});


// ═════════════════════════════════════════════════════════════════════════════
// 9. ELIGIBLE USERS RESPONSE SHAPE
// ═════════════════════════════════════════════════════════════════════════════

describe("eligibleUsers response shape", () => {

  test("201 — eligibleUsers is always an array (even if empty)", async () => {
    const res = await postInquiry({
      ...BASE_PAYLOAD,
      preferredCity: "CityThatDefinitelyHasNoUsers_XYZ123",
    });
    expect(res.statusCode).toBe(201);
    expect(Array.isArray(res.body.eligibleUsers)).toBe(true);
    expect(res.body.eligibleCount).toBe(0);
  });

  test("201 — each eligible user has id, name, mobile (no sensitive data)", async () => {
    const res = await postInquiry(BASE_PAYLOAD);
    expect(res.statusCode).toBe(201);
    const users = res.body.eligibleUsers;
    users.forEach((u) => {
      expect(u).toHaveProperty("id");
      expect(u).toHaveProperty("name");
      expect(u).toHaveProperty("mobile");
      // password, session tokens, etc. must NOT be present
      expect(u.password).toBeUndefined();
      expect(u.token).toBeUndefined();
    });
  });

  test("201 — eligibleCount matches eligibleUsers array length", async () => {
    const res = await postInquiry(BASE_PAYLOAD);
    expect(res.statusCode).toBe(201);
    expect(res.body.eligibleCount).toBe(res.body.eligibleUsers.length);
  });

});


// ═════════════════════════════════════════════════════════════════════════════
// 10. GET ASSIGNED INQUIRIES — /api/mixed/inquiries/assigned
// ═════════════════════════════════════════════════════════════════════════════

// Use a token for a user who has assignments in DB (Dhruv Thakkar — 9157193754)
// Replace if token expires
const ASSIGNED_USER_TOKEN = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjZhNDY2NGU4Y2RhZmFkMWJkZjU4NWU2MCIsImlhdCI6MTc5MDE1MDg2OSwiZXhwIjoxNzkwNzU1NjY5fQ.e_XVjjRIXiPFiylQt7KHK949X_urMCx1qGR7ak22AVw";

const getAssigned = (token = ASSIGNED_USER_TOKEN) =>
  request(app)
    .get("/api/mixed/inquiries/assigned")
    .set("Authorization", `Bearer ${token}`);

describe("GET /api/mixed/inquiries/assigned", () => {

  // ── Auth checks ─────────────────────────────────────────────────────────────
  test("401 — no token", async () => {
    const res = await request(app).get("/api/mixed/inquiries/assigned");
    expect(res.statusCode).toBe(401);
    expect(res.body.success).toBe(false);
  });

  test("401 — invalid token", async () => {
    const res = await request(app)
      .get("/api/mixed/inquiries/assigned")
      .set("Authorization", "Bearer invalidtoken123");
    expect(res.statusCode).toBe(401);
    expect(res.body.success).toBe(false);
  });

  // ── Success ──────────────────────────────────────────────────────────────────
  test("200 — returns success with data array", async () => {
    const res = await getAssigned();
    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body).toHaveProperty("data");
    expect(Array.isArray(res.body.data)).toBe(true);
  });

  test("200 — count matches data array length", async () => {
    const res = await getAssigned();
    expect(res.statusCode).toBe(200);
    expect(res.body.count).toBe(res.body.data.length);
  });

  test("200 — each record has required fields", async () => {
    const res = await getAssigned();
    expect(res.statusCode).toBe(200);
    res.body.data.forEach((record) => {
      expect(record).toHaveProperty("_id");
      expect(record).toHaveProperty("inquiry");
      expect(record).toHaveProperty("assignedTo");
      expect(record).toHaveProperty("assignedAt");
      expect(record).toHaveProperty("status");
      expect(record).toHaveProperty("assignmentSource");
    });
  });

  test("200 — each record status is active or purchased", async () => {
    const res = await getAssigned();
    expect(res.statusCode).toBe(200);
    res.body.data.forEach((record) => {
      expect(["active", "purchased"]).toContain(record.status);
    });
  });

  test("200 — assignmentSource is automatic or cron", async () => {
    const res = await getAssigned();
    expect(res.statusCode).toBe(200);
    res.body.data.forEach((record) => {
      expect(["automatic", "cron"]).toContain(record.assignmentSource);
    });
  });

  test("200 — inquiry is populated (not just an ObjectId string)", async () => {
    const res = await getAssigned();
    expect(res.statusCode).toBe(200);
    if (res.body.data.length > 0) {
      const inquiry = res.body.data[0].inquiry;
      expect(typeof inquiry).toBe("object");
      expect(inquiry).toHaveProperty("_id");
      expect(inquiry).toHaveProperty("preferredCity");
      expect(inquiry).toHaveProperty("status");
    }
  });

  test("200 — assignedTo has id, name, mobile, role", async () => {
    const res = await getAssigned();
    expect(res.statusCode).toBe(200);
    if (res.body.data.length > 0) {
      const { assignedTo } = res.body.data[0];
      expect(assignedTo).toHaveProperty("id");
      expect(assignedTo).toHaveProperty("name");
      expect(assignedTo).toHaveProperty("mobile");
      expect(assignedTo).toHaveProperty("role");
    }
  });

  test("200 — results are sorted latest first (createdAt desc)", async () => {
    const res = await getAssigned();
    expect(res.statusCode).toBe(200);
    const dates = res.body.data.map((r) => new Date(r.createdAt).getTime());
    for (let i = 1; i < dates.length; i++) {
      expect(dates[i - 1]).toBeGreaterThanOrEqual(dates[i]);
    }
  });

  test("200 — user with no assignments gets empty array", async () => {
    // USER_TOKEN belongs to john snow (customer) — has no assignments
    const res = await getAssigned(USER_TOKEN);
    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toEqual([]);
    expect(res.body.count).toBe(0);
  });

});
