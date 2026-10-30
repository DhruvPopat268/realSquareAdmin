const express = require("express");
const request = require("supertest");

const CATEGORY_ID = "64a000000000000000000001";
const PROPERTY_TYPE_ID = "64a000000000000000000011";
const SELL_TYPE_ID = "64a000000000000000000021";
const PROJECT_ID = "64a000000000000000000031";
const USER_ID = "64a000000000000000000041";
const ROLE_ID = "64a000000000000000000051";

jest.mock("../utils/glbCompress", () => ({ compressGlb: jest.fn().mockResolvedValue(undefined) }));

process.env.CATEGORY_RESIDENTIAL_ID = CATEGORY_ID;
process.env.CATEGORY_COMMERCIAL_ID = "64a000000000000000000002";
process.env.LISTING_TYPE_SELL_ID = SELL_TYPE_ID;
process.env.LISTING_TYPE_RENT_ID = "64a000000000000000000022";
process.env.LISTING_TYPE_PG_ID = "64a000000000000000000023";
process.env.GOOGLE_MAPS_API_KEY = "location-validation-test-key";

const PropertyCategory = require("../modules/admin/propertyCategories/model");
const PropertyPurpose = require("../modules/admin/propertyPurposes/model");
const PropertyType = require("../modules/admin/propertyTypes/model");
const PropertyListing = require("../modules/mixed/propertyListing/model");
const ProjectListing = require("../modules/mixed/projectListing/model");
const { createListingValidator } = require("../modules/mixed/propertyListing/validator");
const { updateListing } = require("../modules/mixed/propertyListing/controller");
const { projectListingValidator } = require("../modules/mixed/projectListing/validator");
const { updateProject } = require("../modules/mixed/projectListing/controller");
const { validationResult } = require("express-validator");

const app = express();
app.use(express.json());

const sendValidationResult = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
  return next();
};
app.post("/api/mixed/property-listings", createListingValidator, sendValidationResult, (_req, res) => res.sendStatus(204));
app.post("/api/mixed/project-listings", projectListingValidator, sendValidationResult, (_req, res) => res.sendStatus(204));
app.patch("/api/mixed/property-listings", (req, _res, next) => { req.user = { _id: USER_ID }; next(); }, updateListing);
app.patch("/api/mixed/project-listings", (req, _res, next) => { req.user = { _id: USER_ID, autoApprovalProperties: false }; next(); }, updateProject);

function reverseGeocodeResult(city = "Hyderabad") {
  const state = city === "Pune" ? "Maharashtra" : "Telangana";
  return {
    ok: true,
    json: async () => ({
      status: "OK",
      results: [{
        formatted_address: `Gachibowli, ${city}, ${state}, India`,
        address_components: [
          { long_name: city, types: ["locality"] },
          { long_name: state, types: ["administrative_area_level_1"] },
          { long_name: "India", types: ["country"] },
        ],
      }],
    }),
  };
}

function mockFindById(Model, resolve) {
  jest.spyOn(Model, "findById").mockImplementation((id) => ({
    select: jest.fn().mockResolvedValue(resolve(String(id))),
  }));
}

function propertyCreatePayload(overrides = {}) {
  return {
    categoryId: CATEGORY_ID,
    listingTypeId: SELL_TYPE_ID,
    propertyTypeId: PROPERTY_TYPE_ID,
    cityName: "Hyderabad",
    locality: {
      address: "Gachibowli, Hyderabad, Telangana, India",
      latitude: 17.4401,
      longitude: 78.3489,
    },
    sellInfo: { price: 5000000 },
    ...overrides,
  };
}

function projectCreatePayload(overrides = {}) {
  return {
    categoryId: CATEGORY_ID,
    cityName: "Hyderabad",
    locality: {
      address: "Gachibowli, Hyderabad, Telangana, India",
      latitude: 17.4401,
      longitude: 78.3489,
    },
    projectName: "Test Residency",
    projectStatus: "Ready to Move",
    totalUnits: 20,
    availableUnits: 12,
    minPrice: 5000000,
    maxPrice: 9000000,
    residentialDetails: {
      areaUnit: "sqft",
      configurations: [{ bhk: "2 BHK" }],
    },
    ...overrides,
  };
}

function propertyRecord(overrides = {}) {
  return {
    _id: PROJECT_ID,
    listedBy: { id: USER_ID, role: { id: ROLE_ID } },
    category: { id: CATEGORY_ID },
    listingType: { id: SELL_TYPE_ID },
    propertyType: { id: PROPERTY_TYPE_ID },
    cityName: "Hyderabad",
    locality: {
      address: "Gachibowli, Hyderabad, Telangana, India",
      latitude: 17.4401,
      longitude: 78.3489,
    },
    status: "UnderReview",
    save: jest.fn().mockResolvedValue(undefined),
    ...overrides,
  };
}

function projectRecord(overrides = {}) {
  return {
    _id: PROJECT_ID,
    listedBy: { id: USER_ID },
    category: { id: CATEGORY_ID, name: "Residential" },
    cityName: "Hyderabad",
    locality: {
      address: "Gachibowli, Hyderabad, Telangana, India",
      latitude: 17.4401,
      longitude: 78.3489,
    },
    projectStatus: "Ready to Move",
    totalUnits: 20,
    availableUnits: 12,
    minPrice: 5000000,
    maxPrice: 9000000,
    residentialDetails: { configurations: [{ bhk: "2 BHK" }] },
    save: jest.fn().mockResolvedValue(undefined),
    ...overrides,
  };
}

beforeEach(() => {
  jest.restoreAllMocks();
  global.fetch = jest.fn().mockResolvedValue(reverseGeocodeResult());

  const activeCategory = { _id: CATEGORY_ID, isActive: true, name: "Residential" };
  const activePurpose = { _id: SELL_TYPE_ID, isActive: true, name: "Sell" };
  const activeType = { _id: PROPERTY_TYPE_ID, isActive: true, propertyCategory: CATEGORY_ID, name: "Apartment" };
  mockFindById(PropertyCategory, (id) => id === CATEGORY_ID ? activeCategory : null);
  mockFindById(PropertyPurpose, (id) => id === SELL_TYPE_ID ? activePurpose : null);
  mockFindById(PropertyType, (id) => id === PROPERTY_TYPE_ID ? activeType : null);
});

afterEach(() => jest.restoreAllMocks());

describe("POST /api/mixed/property-listings location validation", () => {
  test("accepts a locality whose coordinates and address identify the submitted city", async () => {
    const response = await request(app).post("/api/mixed/property-listings").send(propertyCreatePayload());
    expect(response.status).toBe(204);
    expect(global.fetch).toHaveBeenCalledTimes(1);
  });

  test("rejects a city that differs from the city resolved from locality coordinates", async () => {
    const response = await request(app).post("/api/mixed/property-listings").send(propertyCreatePayload({ cityName: "Pune" }));
    expect(response.status).toBe(400);
    expect(response.body.errors.some((error) => /locality belongs to/i.test(error.msg))).toBe(true);
  });

  test("rejects an address label from a different city than its coordinates", async () => {
    const response = await request(app).post("/api/mixed/property-listings").send(propertyCreatePayload({
      locality: { address: "Koregaon Park, Pune, Maharashtra, India", latitude: 17.4401, longitude: 78.3489 },
    }));
    expect(response.status).toBe(400);
    expect(response.body.errors.some((error) => /address does not identify the city/i.test(error.msg))).toBe(true);
  });
});

describe("POST /api/mixed/project-listings location validation", () => {
  test("accepts a locality whose coordinates and address identify the submitted city", async () => {
    const response = await request(app).post("/api/mixed/project-listings").send(projectCreatePayload());
    expect(response.status).toBe(204);
    expect(global.fetch).toHaveBeenCalledTimes(1);
  });

  test("rejects a city that differs from the city resolved from locality coordinates", async () => {
    const response = await request(app).post("/api/mixed/project-listings").send(projectCreatePayload({ cityName: "Pune" }));
    expect(response.status).toBe(400);
    expect(response.body.errors.some((error) => /locality belongs to/i.test(error.msg))).toBe(true);
  });

  test("rejects an address label from a different city than its coordinates", async () => {
    const response = await request(app).post("/api/mixed/project-listings").send(projectCreatePayload({
      locality: { address: "Koregaon Park, Pune, Maharashtra, India", latitude: 17.4401, longitude: 78.3489 },
    }));
    expect(response.status).toBe(400);
    expect(response.body.errors.some((error) => /address does not identify the city/i.test(error.msg))).toBe(true);
  });
});

describe("PATCH /api/mixed/property-listings location validation", () => {
  test("rejects changing city without selecting a locality in that city", async () => {
    jest.spyOn(PropertyListing, "findById").mockResolvedValue(propertyRecord());
    const response = await request(app).patch("/api/mixed/property-listings").send({ propertyListingId: PROJECT_ID, cityName: "Pune" });
    expect(response.status).toBe(400);
    expect(response.body.message).toMatch(/locality belongs to/i);
    expect(global.fetch).toHaveBeenCalledTimes(1);
  });

  test("validates coordinates-only locality changes against the current city", async () => {
    jest.spyOn(PropertyListing, "findById").mockResolvedValue(propertyRecord());
    global.fetch.mockResolvedValueOnce(reverseGeocodeResult("Pune"));
    const response = await request(app).patch("/api/mixed/property-listings").send({
      propertyListingId: PROJECT_ID,
      locality: { latitude: 18.5204, longitude: 73.8567 },
    });
    expect(response.status).toBe(400);
    expect(response.body.message).toMatch(/locality belongs to/i);
    expect(global.fetch.mock.calls[0][0]).toContain("18.5204%2C73.8567");
  });

  test("rejects an address label from a different city while its coordinates resolve to the current city", async () => {
    jest.spyOn(PropertyListing, "findById").mockResolvedValue(propertyRecord());
    const response = await request(app).patch("/api/mixed/property-listings").send({
      propertyListingId: PROJECT_ID,
      locality: { address: "Koregaon Park, Pune, Maharashtra, India" },
    });
    expect(response.status).toBe(400);
    expect(response.body.message).toMatch(/address does not identify the city/i);
  });
});

describe("PATCH /api/mixed/project-listings location validation", () => {
  test("rejects changing city without selecting a locality in that city", async () => {
    jest.spyOn(ProjectListing, "findById").mockResolvedValue(projectRecord());
    const response = await request(app).patch("/api/mixed/project-listings").send({ projectListingId: PROJECT_ID, cityName: "Pune" });
    expect(response.status).toBe(400);
    expect(response.body.message).toMatch(/locality belongs to/i);
    expect(global.fetch).toHaveBeenCalledTimes(1);
  });

  test("validates coordinates-only locality changes against the current city", async () => {
    jest.spyOn(ProjectListing, "findById").mockResolvedValue(projectRecord());
    global.fetch.mockResolvedValueOnce(reverseGeocodeResult("Pune"));
    const response = await request(app).patch("/api/mixed/project-listings").send({
      projectListingId: PROJECT_ID,
      locality: { latitude: 18.5204, longitude: 73.8567 },
    });
    expect(response.status).toBe(400);
    expect(response.body.message).toMatch(/locality belongs to/i);
    expect(global.fetch.mock.calls[0][0]).toContain("18.5204%2C73.8567");
  });

  test("rejects an address label from a different city while its coordinates resolve to the current city", async () => {
    jest.spyOn(ProjectListing, "findById").mockResolvedValue(projectRecord());
    const response = await request(app).patch("/api/mixed/project-listings").send({
      projectListingId: PROJECT_ID,
      locality: { address: "Koregaon Park, Pune, Maharashtra, India" },
    });
    expect(response.status).toBe(400);
    expect(response.body.message).toMatch(/address does not identify the city/i);
  });
});
