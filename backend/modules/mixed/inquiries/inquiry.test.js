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
jest.mock("../../../whatsappConfig/whatsappService", () => ({
  sendWhatsApp: jest.fn().mockResolvedValue(true),
}));
const request = require("supertest");
const jwt = require("jsonwebtoken");
const mongoose = require("mongoose");
const app     = require("../../../server");
const { Inquiry } = require("./model");
const { AssignedInquiry } = require("./assignedInquiriesModel");
const EnquiryPurchasedPlan = require("../enquiryPurchasedPlans/model");
const UserCoinsWallet = require("../userCoinsWallet/model");
const CoinsTransaction = require("../coinsTransactions/model");
const { sendWhatsApp } = require("../../../whatsappConfig/whatsappService");
const { TEMPLATES } = require("../../../whatsappConfig/whatsappTemplates");

// ─── Auth Token ───────────────────────────────────────────────────────────────
// A valid user token from the DB (owner/broker/builder user with name + mobile + role)
// Replace this with a fresh token if it expires.
const USER_TOKEN = process.env.USER_TOKEN;
const userFixtureTest = (...args) => USER_TOKEN ? test(...args) : test.skip(...args);
const CRONJOB_SECRET = process.env.CRONJOB_SECRET;
const cronFixtureTest = (...args) => CRONJOB_SECRET ? test(...args) : test.skip(...args);

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

// Purchase endpoint fixtures.
// Assignment IDs supplied for plan, coin, and already-purchased scenarios.
const PURCHASE_TEST_TOKEN = process.env.USER_TOKEN;
const CUSTOMER_TOKEN = process.env.CUSTOMER_TOKEN;
const PURCHASE_TEST_ASSIGNMENT_IDS = [
  "6abcb5dd62496277add3c426", // plan purchase
  "6abbac8aeda3208a9c6cad28", // coin purchase
  "6abba596eda3208a9c6cabf6", // already purchased
];
const purchaseFixtureTest = (...args) => PURCHASE_TEST_TOKEN ? test(...args) : test.skip(...args);
const customerFixtureTest = (...args) => CUSTOMER_TOKEN ? test(...args) : test.skip(...args);

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

describe("WhatsApp property inquiry confirmation template", () => {
  test("builds body values in the approved order and includes both quick reply payloads", () => {
    const inquiryId = "6a0000000000000000000001";
    const values = {
      createdByName: "Customer Name",
      listingType: "Buy",
      propertyCategory: "Residential",
      propertyType: "Apartment",
      location: "Banjara Hills, Hyderabad",
      minimumBudget: "50,00,000",
      maximumBudget: "1,00,00,000",
      bhk: "3",
      area: "1,200 sqft",
      furnishingType: "Semi-Furnished",
      companyName: "RealSquare Team",
      inquiryId,
    };
    const components = TEMPLATES.PROPERTY_INQUIRY_CONFIRMATION.buildComponents(values);

    expect(TEMPLATES.PROPERTY_INQUIRY_CONFIRMATION).toEqual(expect.objectContaining({
      name: "property_inquiry_confirmation",
      language: "en_US",
    }));
    expect(components[0].parameters.map(({ text }) => text)).toEqual([
      "Customer Name", "Buy", "Residential", "Apartment", "Banjara Hills, Hyderabad",
      "50,00,000", "1,00,00,000", "3", "1,200 sqft", "Semi-Furnished", "RealSquare Team",
    ]);
    expect(components.slice(1).map((component) => component.parameters[0].payload)).toEqual([
      `inquiry_confirm:${inquiryId}`,
      `inquiry_reject:${inquiryId}`,
    ]);
  });

  userFixtureTest("sends confirmation to the creator with NA for optional inquiry fields", async () => {
    sendWhatsApp.mockClear();
    const {
      propertyCategory,
      propertyType,
      preferredArea,
      bhk,
      furnishingType,
      ...payloadWithoutOptionalFields
    } = BASE_PAYLOAD;

    const res = await postInquiry(payloadWithoutOptionalFields);

    expect(res.statusCode).toBe(201);
    expect(sendWhatsApp).toHaveBeenCalledTimes(1);
    const [recipientMobile, template, values] = sendWhatsApp.mock.calls[0];
    expect(recipientMobile).toBe(res.body.inquiry.createdBy.mobile);
    expect(template).toBe(TEMPLATES.PROPERTY_INQUIRY_CONFIRMATION);
    expect(values).toEqual(expect.objectContaining({
      createdByName: res.body.inquiry.createdBy.name,
      listingType: expect.any(String),
      propertyCategory: "NA",
      propertyType: "NA",
      location: "NA, Hyderabad",
      minimumBudget: "50,00,000",
      maximumBudget: "1,00,00,000",
      bhk: "NA",
      area: "NA",
      furnishingType: "NA",
      companyName: "RealSquare Team",
      inquiryId: res.body.inquiry._id,
    }));
  });

  userFixtureTest("WhatsApp send failure does not fail inquiry creation", async () => {
    sendWhatsApp.mockResolvedValueOnce(false);
    const res = await postInquiry(BASE_PAYLOAD);
    expect(res.statusCode).toBe(201);
    expect(res.body.success).toBe(true);
  });
});


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

  test("201 — furnishingType is optional", async () => {
    const { furnishingType, ...payload } = BASE_PAYLOAD;
    const res = await postInquiry(payload);
    expect(res.statusCode).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.inquiry.furnishingType).toBeUndefined();
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

  test("400 — listingType is a valid ID but no purpose exists", async () => {
    const res = await postInquiry({ ...BASE_PAYLOAD, listingType: FAKE_VALID_ID });
    expect(res.statusCode).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toMatch(/listingType.*existing active property purpose/i);
  });

  // ── propertyCategory ────────────────────────────────────────────────────────
  test("400 — propertyCategory is not a valid MongoId", async () => {
    const res = await postInquiry({ ...BASE_PAYLOAD, propertyCategory: INVALID_ID });
    expect(res.statusCode).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toMatch(/propertyCategory/i);
  });

  test("400 — propertyCategory is a valid ID but no category exists", async () => {
    const { propertyType, ...payload } = BASE_PAYLOAD;
    const res = await postInquiry({ ...payload, propertyCategory: FAKE_VALID_ID });
    expect(res.statusCode).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toMatch(/propertyCategory.*existing active property category/i);
  });

  // ── propertyType ────────────────────────────────────────────────────────────
  test("400 — propertyType is not a valid MongoId", async () => {
    const res = await postInquiry({ ...BASE_PAYLOAD, propertyType: INVALID_ID });
    expect(res.statusCode).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toMatch(/propertyType/i);
  });

  test("400 — propertyType is a valid ID but no type exists", async () => {
    const res = await postInquiry({ ...BASE_PAYLOAD, propertyType: FAKE_VALID_ID });
    expect(res.statusCode).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toMatch(/propertyType.*existing active property type/i);
  });

  test("400 — propertyType does not belong to the selected propertyCategory", async () => {
    const res = await postInquiry({ ...BASE_PAYLOAD, propertyType: PT_COMMERCIAL_OFFICE });
    expect(res.statusCode).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toMatch(/propertyType must belong to the selected propertyCategory/i);
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
    expect(Number.isInteger(res.body.assignedCount)).toBe(true);
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

  test("400 — Project inquiry is rejected because isProperty is false", async () => {
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
    expect(res.statusCode).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toMatch(/only individual property enquiries are supported/i);
  });

  test("201 — Response shape has all expected top-level keys", async () => {
    const res = await postInquiry(BASE_PAYLOAD);
    expect(res.statusCode).toBe(201);
    expect(res.body).toHaveProperty("success", true);
    expect(res.body).toHaveProperty("message");
    expect(res.body).toHaveProperty("inquiry");
    expect(res.body).toHaveProperty("assignedCount");
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
// 9. ASSIGNMENT COUNT RESPONSE SHAPE
// ═════════════════════════════════════════════════════════════════════════════

describe("assignedCount response shape", () => {

  test("201 — assignedCount is zero when no users are eligible", async () => {
    const res = await postInquiry({
      ...BASE_PAYLOAD,
      preferredCity: "CityThatDefinitelyHasNoUsers_XYZ123",
    });
    expect(res.statusCode).toBe(201);
    expect(res.body.assignedCount).toBe(0);
  });

  test("201 — assignedCount is a non-negative integer", async () => {
    const res = await postInquiry(BASE_PAYLOAD);
    expect(res.statusCode).toBe(201);
    expect(Number.isInteger(res.body.assignedCount)).toBe(true);
    expect(res.body.assignedCount).toBeGreaterThanOrEqual(0);
  });

});


// ═════════════════════════════════════════════════════════════════════════════
// 10. GET ASSIGNED INQUIRIES — /api/mixed/inquiries/assigned
// ═════════════════════════════════════════════════════════════════════════════

// Use a token for a user who has assignments in DB (Dhruv Thakkar — 9157193754)
// Replace if token expires
const ASSIGNED_USER_TOKEN = process.env.USER_TOKEN;

const getAssigned = (token = ASSIGNED_USER_TOKEN, query = {}) =>
  request(app)
    .get("/api/mixed/inquiries/assigned")
    .set("Authorization", `Bearer ${token}`)
    .query(query);

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
  test("200 — returns assignments, pagination, and stats in data", async () => {
    const res = await getAssigned();
    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body).toHaveProperty("data");
    expect(Array.isArray(res.body.data.assignments)).toBe(true);
    expect(res.body.data.pagination).toEqual(expect.objectContaining({
      total: expect.any(Number),
      page: expect.any(Number),
      limit: expect.any(Number),
      totalPages: expect.any(Number),
    }));
    expect(res.body.data.stats).toEqual(expect.objectContaining({
      total: expect.any(Number),
      active: expect.any(Number),
      purchased: expect.any(Number),
      hot: expect.any(Number),
      warm: expect.any(Number),
      cold: expect.any(Number),
    }));
    expect(res.body.data.stats.total).toBe(
      res.body.data.stats.active + res.body.data.stats.purchased
    );
  });

  test("200 — pagination total is at least the returned assignment count", async () => {
    const res = await getAssigned();
    expect(res.statusCode).toBe(200);
    expect(res.body.data.pagination.total).toBeGreaterThanOrEqual(res.body.data.assignments.length);
  });

  test("200 — each record has required fields", async () => {
    const res = await getAssigned();
    expect(res.statusCode).toBe(200);
    res.body.data.assignments.forEach((record) => {
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
    res.body.data.assignments.forEach((record) => {
      expect(["active", "purchased"]).toContain(record.status);
    });
  });

  test("200 — assignmentSource is automatic or cron", async () => {
    const res = await getAssigned();
    expect(res.statusCode).toBe(200);
    res.body.data.assignments.forEach((record) => {
      expect(["automatic", "cron"]).toContain(record.assignmentSource);
    });
  });

  test("200 — inquiry is populated (not just an ObjectId string)", async () => {
    const res = await getAssigned();
    expect(res.statusCode).toBe(200);
    if (res.body.data.assignments.length > 0) {
      const inquiry = res.body.data.assignments[0].inquiry;
      expect(typeof inquiry).toBe("object");
      expect(inquiry).toHaveProperty("_id");
      expect(inquiry).toHaveProperty("preferredCity");
      expect(inquiry).toHaveProperty("status");
    }
  });

  test("200 — assignedTo has id, name, mobile, role", async () => {
    const res = await getAssigned();
    expect(res.statusCode).toBe(200);
    if (res.body.data.assignments.length > 0) {
      const { assignedTo } = res.body.data.assignments[0];
      expect(assignedTo).toHaveProperty("id");
      expect(assignedTo).toHaveProperty("name");
      expect(assignedTo).toHaveProperty("mobile");
      expect(assignedTo).toHaveProperty("role");
    }
  });

  test("200 — results are sorted latest first (createdAt desc)", async () => {
    const res = await getAssigned();
    expect(res.statusCode).toBe(200);
    const dates = res.body.data.assignments.map((r) => new Date(r.createdAt).getTime());
    for (let i = 1; i < dates.length; i++) {
      expect(dates[i - 1]).toBeGreaterThanOrEqual(dates[i]);
    }
  });

  test("200 — the user token can access assigned inquiries", async () => {
    const res = await getAssigned(USER_TOKEN);
    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data.assignments)).toBe(true);
  });

  userFixtureTest("hides closed locked assignments, retains purchased ones, and excludes hidden records from stats", async () => {
    const { id: decodedUserId } = jwt.verify(USER_TOKEN, process.env.USER_JWT_SECRET);
    const userId = new mongoose.Types.ObjectId(decodedUserId);
    const roleId = new mongoose.Types.ObjectId();
    const uniqueCity = `closedInquiryVisibility${Date.now()}`;
    const baselineResponse = await getAssigned(USER_TOKEN);
    expect(baselineResponse.statusCode).toBe(200);
    const baselineStats = baselineResponse.body.data.stats;
    const inquiryIds = [];
    const expectedVisibleAssignmentIds = [];

    const cases = [
      { inquiryStatus: "active", assignmentStatus: "active", visible: true },
      { inquiryStatus: "expired", assignmentStatus: "active", visible: false },
      { inquiryStatus: "inactive", assignmentStatus: "active", visible: false },
      { inquiryStatus: "completed", assignmentStatus: "active", visible: false },
      { inquiryStatus: "expired", assignmentStatus: "purchased", visible: true },
      { inquiryStatus: "inactive", assignmentStatus: "purchased", visible: true },
      { inquiryStatus: "completed", assignmentStatus: "purchased", visible: true },
    ];

    try {
      for (const fixture of cases) {
        const inquiry = await Inquiry.create({
          createdBy: { id: userId, name: "Visibility Test Creator", mobile: "9000000000", role: roleId },
          isProperty: true,
          listingType: new mongoose.Types.ObjectId(),
          preferredCity: uniqueCity,
          budget: { min: 1000000, max: 2000000 },
          inquiryClassification: "hot",
          lastFollowUpDate: new Date("2026-12-01T00:00:00.000Z"),
          preferredCommunication: ["call"],
          status: fixture.inquiryStatus,
        });
        inquiryIds.push(inquiry._id);

        const assignment = await AssignedInquiry.create({
          inquiry: inquiry._id,
          assignedTo: { id: userId, name: "Visibility Test Assignee", mobile: "9111111111", role: roleId },
          status: fixture.assignmentStatus,
          assignmentSource: "automatic",
          ...(fixture.assignmentStatus === "purchased" && { purchasedAt: new Date(), purchasedVia: "plan" }),
        });
        if (fixture.visible) expectedVisibleAssignmentIds.push(String(assignment._id));
      }

      const filteredResponse = await getAssigned(USER_TOKEN, { search: uniqueCity, limit: 10 });
      expect(filteredResponse.statusCode).toBe(200);
      expect(filteredResponse.body.data.pagination.total).toBe(expectedVisibleAssignmentIds.length);
      expect(filteredResponse.body.data.assignments.map(({ _id }) => String(_id)).sort())
        .toEqual(expectedVisibleAssignmentIds.sort());

      const statsResponse = await getAssigned(USER_TOKEN);
      expect(statsResponse.statusCode).toBe(200);
      expect(statsResponse.body.data.stats.active).toBe(baselineStats.active + 1);
      expect(statsResponse.body.data.stats.purchased).toBe(baselineStats.purchased + 3);
      expect(statsResponse.body.data.stats.total).toBe(baselineStats.total + 4);
      expect(statsResponse.body.data.stats.hot).toBe(baselineStats.hot + 4);
      expect(await AssignedInquiry.countDocuments({ inquiry: { $in: inquiryIds } })).toBe(cases.length);
    } finally {
      if (inquiryIds.length) {
        await AssignedInquiry.deleteMany({ inquiry: { $in: inquiryIds } });
        await Inquiry.deleteMany({ _id: { $in: inquiryIds } });
      }
    }
  });

});


// ═════════════════════════════════════════════════════════════════════════════
// 11. PATCH PURCHASE ASSIGNED INQUIRY — /api/mixed/inquiries/purchase
// ═════════════════════════════════════════════════════════════════════════════

const patchInquiryPurchase = (payload, token = PURCHASE_TEST_TOKEN) =>
  request(app)
    .patch("/api/mixed/inquiries/purchase")
    .set("Authorization", `Bearer ${token}`)
    .send(payload);

const patchMyInquiryStatus = (payload, token = USER_TOKEN) =>
  request(app)
    .patch("/api/mixed/inquiries/status")
    .set("Authorization", `Bearer ${token}`)
    .send(payload);

describe("PATCH /api/mixed/inquiries/status", () => {
  test("401 — requires user authentication", async () => {
    const res = await request(app).patch("/api/mixed/inquiries/status").send({
      inquiryId: FAKE_VALID_ID,
      status: "inactive",
    });
    expect(res.statusCode).toBe(401);
    expect(res.body.success).toBe(false);
  });

  userFixtureTest("400 — accepts only inactive or completed", async () => {
    const res = await patchMyInquiryStatus({ inquiryId: FAKE_VALID_ID, status: "active" });
    expect(res.statusCode).toBe(400);
    expect(res.body.message).toMatch(/inactive.*completed/i);
  });

  userFixtureTest("400 — inquiryId is required and must be valid", async () => {
    const missing = await patchMyInquiryStatus({ status: "inactive" });
    expect(missing.statusCode).toBe(400);
    const malformed = await patchMyInquiryStatus({ inquiryId: "bad-id", status: "inactive" });
    expect(malformed.statusCode).toBe(400);
  });

  userFixtureTest("200 — creator can mark an active inquiry inactive without a reason", async () => {
    const created = await postInquiry(BASE_PAYLOAD);
    expect(created.statusCode).toBe(201);
    const res = await patchMyInquiryStatus({ inquiryId: created.body.inquiry._id, status: "inactive" });
    expect(res.statusCode).toBe(200);
    expect(res.body.data.status).toBe("inactive");
    expect(res.body.data.statusReason).toBeUndefined();
  });

  userFixtureTest("200 — creator can mark an active inquiry completed", async () => {
    const created = await postInquiry(BASE_PAYLOAD);
    expect(created.statusCode).toBe(201);
    const res = await patchMyInquiryStatus({ inquiryId: created.body.inquiry._id, status: "completed" });
    expect(res.statusCode).toBe(200);
    expect(res.body.data.status).toBe("completed");
  });

  customerFixtureTest("404 — creator cannot update an inquiry owned by another user", async () => {
    const created = await postInquiry(BASE_PAYLOAD);
    expect(created.statusCode).toBe(201);
    const res = await patchMyInquiryStatus(
      { inquiryId: created.body.inquiry._id, status: "completed" },
      CUSTOMER_TOKEN
    );
    expect(res.statusCode).toBe(404);
  });

  userFixtureTest("409 — inactive is final and cannot later be changed to completed", async () => {
    const created = await postInquiry(BASE_PAYLOAD);
    expect(created.statusCode).toBe(201);
    const inactive = await patchMyInquiryStatus({ inquiryId: created.body.inquiry._id, status: "inactive" });
    expect(inactive.statusCode).toBe(200);
    const res = await patchMyInquiryStatus({ inquiryId: created.body.inquiry._id, status: "completed" });
    expect(res.statusCode).toBe(409);
  });
});

describe("GET /api/mixed/inquiries/my — inquiry status values", () => {
  userFixtureTest("200 — returns inactive and completed status counts and filters", async () => {
    const res = await request(app)
      .get("/api/mixed/inquiries/my?status=inactive")
      .set("Authorization", `Bearer ${USER_TOKEN}`);
    expect(res.statusCode).toBe(200);
    expect(res.body.data.stats).toEqual(expect.objectContaining({
      total: expect.any(Number),
      active: expect.any(Number),
      expired: expect.any(Number),
      inactive: expect.any(Number),
      completed: expect.any(Number),
    }));
    expect(res.body.data.stats.total).toBe(res.body.data.pagination.total);
    expect(res.body.data.inquiries.every((inquiry) => inquiry.status === "inactive")).toBe(true);
  });
});

const patchPurchaseWithFixtureToken = (payload) =>
  request(app)
    .patch("/api/mixed/inquiries/purchase")
    .set("Authorization", `Bearer ${PURCHASE_TEST_TOKEN}`)
    .send(payload);

describe("PATCH /api/mixed/inquiries/purchase — request validation", () => {

  test("401 — no token", async () => {
    const res = await request(app)
      .patch("/api/mixed/inquiries/purchase")
      .send({ assignmentId: FAKE_VALID_ID, purchasedVia: "coins" });
    expect(res.statusCode).toBe(401);
    expect(res.body.success).toBe(false);
  });

  test("401 — invalid token", async () => {
    const res = await patchInquiryPurchase({ assignmentId: FAKE_VALID_ID, purchasedVia: "coins" }, "invalidtoken");
    expect(res.statusCode).toBe(401);
    expect(res.body.success).toBe(false);
  });

  test("400 — purchasedVia is required", async () => {
    const res = await patchInquiryPurchase({ assignmentId: FAKE_VALID_ID });
    expect(res.statusCode).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toMatch(/purchasedVia/i);
  });

  test("400 — assignmentId is required in the body", async () => {
    const res = await patchInquiryPurchase({ purchasedVia: "coins" });
    expect(res.statusCode).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toMatch(/assignmentId/i);
  });

  test("400 — rejects an invalid assignmentId", async () => {
    const res = await patchInquiryPurchase({ assignmentId: INVALID_ID, purchasedVia: "coins" });
    expect(res.statusCode).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toMatch(/assignmentId/i);
  });

  test.each(["cash", "Plan", "", null])("400 — rejects unsupported purchasedVia value %p", async (purchasedVia) => {
    const res = await patchInquiryPurchase({ assignmentId: FAKE_VALID_ID, purchasedVia });
    expect(res.statusCode).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toMatch(/purchasedVia/i);
  });

  customerFixtureTest("403 — customer role cannot purchase an assigned inquiry", async () => {
    const res = await request(app)
      .patch("/api/mixed/inquiries/purchase")
      .set("Authorization", `Bearer ${CUSTOMER_TOKEN}`)
      .send({ assignmentId: FAKE_VALID_ID, purchasedVia: "coins" });
    expect(res.statusCode).toBe(403);
    expect(res.body.success).toBe(false);
  });

});

describe("PATCH /api/mixed/inquiries/purchase — purchase flows", () => {

  const rejectUnavailableInquiryPurchase = async (inquiryStatus, purchasedVia) => {
    const assignedInquiry = { inquiry: FAKE_VALID_ID, status: "active" };
    const assignmentQuery = { session: jest.fn().mockResolvedValue(assignedInquiry) };
    const inquiryQuery = {
      select: jest.fn().mockReturnThis(),
      session: jest.fn().mockResolvedValue({ status: inquiryStatus }),
    };
    const assignmentFindSpy = jest.spyOn(AssignedInquiry, "findOne").mockReturnValue(assignmentQuery);
    const inquiryFindSpy = jest.spyOn(Inquiry, "findById").mockReturnValue(inquiryQuery);
    const planFindSpy = jest.spyOn(EnquiryPurchasedPlan, "findOne");
    const walletUpdateSpy = jest.spyOn(UserCoinsWallet, "findOneAndUpdate");
    const transactionCreateSpy = jest.spyOn(CoinsTransaction, "create");

    try {
      const res = await patchPurchaseWithFixtureToken({
        assignmentId: FAKE_VALID_ID,
        purchasedVia,
      });

      expect(res.statusCode).toBe(409);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toMatch(new RegExp(`${inquiryStatus} and cannot be purchased`, "i"));
      expect(planFindSpy).not.toHaveBeenCalled();
      expect(walletUpdateSpy).not.toHaveBeenCalled();
      expect(transactionCreateSpy).not.toHaveBeenCalled();
    } finally {
      assignmentFindSpy.mockRestore();
      inquiryFindSpy.mockRestore();
      planFindSpy.mockRestore();
      walletUpdateSpy.mockRestore();
      transactionCreateSpy.mockRestore();
    }
  };

  ["expired", "inactive", "completed"].forEach((inquiryStatus) => {
    ["plan", "coins"].forEach((purchasedVia) => {
      purchaseFixtureTest(`409 — ${inquiryStatus} inquiry cannot be purchased via ${purchasedVia}`, async () => {
        await rejectUnavailableInquiryPurchase(inquiryStatus, purchasedVia);
      });
    });
  });

  purchaseFixtureTest("plan option purchases an active assignment or rejects an already purchased one", async () => {
    const assignmentId = PURCHASE_TEST_ASSIGNMENT_IDS[0];
    const res = await patchPurchaseWithFixtureToken({ assignmentId, purchasedVia: "plan" });
    if (res.statusCode === 409) {
      expect(res.body.success).toBe(false);
      expect(res.body.message).toMatch(/already been purchased/i);
      return;
    }
    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.purchasedVia).toBe("plan");
    expect(res.body.data.assignment.status).toBe("purchased");
    expect(res.body.data.assignment.purchasedAt).toBeTruthy();
    expect(res.body.data.assignment.coinsUsed).toBeUndefined();
    expect(typeof res.body.data.enquiriesUsed).toBe("number");

  });

  purchaseFixtureTest("coin option purchases an active assignment or rejects an already purchased one", async () => {
    const assignmentId = PURCHASE_TEST_ASSIGNMENT_IDS[1];
    const res = await patchPurchaseWithFixtureToken({ assignmentId, purchasedVia: "coins" });
    if (res.statusCode === 409) {
      expect(res.body.success).toBe(false);
      expect(res.body.message).toMatch(/already been purchased/i);
      return;
    }
    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.purchasedVia).toBe("coins");
    expect(res.body.data.assignment.status).toBe("purchased");
    expect(res.body.data.assignment.purchasedAt).toBeTruthy();
    expect(typeof res.body.data.assignment.coinsUsed).toBe("number");
    expect(res.body.data.assignment.coinsUsed).toBeGreaterThan(0);
    expect(res.body.data.coinsUsed).toBe(res.body.data.assignment.coinsUsed);
    expect(typeof res.body.data.coinsBalance).toBe("number");
  });

  purchaseFixtureTest("409 — an already purchased assignment cannot be purchased again", async () => {
    const assignmentId = PURCHASE_TEST_ASSIGNMENT_IDS[2];
    const res = await patchPurchaseWithFixtureToken({ assignmentId, purchasedVia: "plan" });
    expect(res.statusCode).toBe(409);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toMatch(/already been purchased/i);
  });

  purchaseFixtureTest("404 — an unknown assignment ID is not found", async () => {
    const res = await patchPurchaseWithFixtureToken({ assignmentId: FAKE_VALID_ID, purchasedVia: "plan" });
    expect(res.statusCode).toBe(404);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toMatch(/not found/i);
  });

});

describe("GET /api/mixed/inquiries/cron-expire", () => {
  test("401 — rejects requests without the cron secret", async () => {
    const res = await request(app).get("/api/mixed/inquiries/cron-expire");
    expect(res.statusCode).toBe(401);
    expect(res.body.success).toBe(false);
  });

  test("401 — rejects an invalid cron secret", async () => {
    const res = await request(app)
      .get("/api/mixed/inquiries/cron-expire")
      .set("x-cron-secret", "invalid-cron-secret");
    expect(res.statusCode).toBe(401);
    expect(res.body.success).toBe(false);
  });

  cronFixtureTest("200 — expires active inquiries whose follow-up date is before today's UTC date", async () => {
    const updateSpy = jest.spyOn(Inquiry, "updateMany").mockResolvedValue({ matchedCount: 3, modifiedCount: 3 });
    try {
      const res = await request(app)
        .get("/api/mixed/inquiries/cron-expire")
        .set("x-cron-secret", CRONJOB_SECRET);

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.expiredCount).toBe(3);
      expect(res.body.data.checkedAt).toBeTruthy();
      expect(updateSpy).toHaveBeenCalledTimes(1);

      const [filter, update] = updateSpy.mock.calls[0];
      expect(filter.status).toBe("active");
      expect(filter.lastFollowUpDate.$lt).toBeInstanceOf(Date);
      expect(filter.lastFollowUpDate.$lt.toISOString()).toMatch(/T00:00:00\.000Z$/);
      expect(update).toEqual({ $set: { status: "expired" } });
    } finally {
      updateSpy.mockRestore();
    }
  });
});
