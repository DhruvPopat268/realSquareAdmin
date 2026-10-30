const express = require("express");
const request = require("supertest");
const mongoose = require("mongoose");

const RESIDENTIAL_CATEGORY_ID = "64a000000000000000000001";
const COMMERCIAL_CATEGORY_ID = "64a000000000000000000002";
const IDEAL_FOR_ID_A = "64a000000000000000000021";
const IDEAL_FOR_ID_B = "64a000000000000000000022";
process.env.CATEGORY_RESIDENTIAL_ID = RESIDENTIAL_CATEGORY_ID;
process.env.CATEGORY_COMMERCIAL_ID = COMMERCIAL_CATEGORY_ID;
process.env.BACKEND_URL = "https://api.realsquare.test";
process.env.GOOGLE_MAPS_API_KEY = "test-google-maps-key";

jest.mock("../middleware/userAuth", () => ({
  userProtect: (req, _res, next) => {
    req.user = global.projectListingTestUser;
    req.userRole = global.projectListingTestUser?.role?._id?.toString();
    next();
  },
}));

jest.mock("../utils/upload", () => ({
  uploadImage: {
    array: () => (req, _res, next) => {
      req.files = req.get("x-test-empty-upload")
        ? []
        : [{ path: "/var/www/storage/images/project-test.jpg" }];
      next();
    },
  },
  handlePropertyMediaUpload: (req, _res, next) => {
    req.files = {};
    req.body = { ...req.body };
    next();
  },
  handleProjectMediaUpload: (req, _res, next) => {
    req.files = {};
    req.body = { ...req.body };
    next();
  },
  IMAGES_DIR: "/tmp/project-listing-test-images",
  VIDEOS_DIR: "/tmp/project-listing-test-videos",
  DOCUMENTS_DIR: "/tmp/project-listing-test-documents",
}));

// Location/API tests do not exercise model uploads; avoid loading the GLB
// compressor's ESM-only dependency graph in Jest's CommonJS runtime.
jest.mock("../utils/glbCompress", () => ({ compressGlb: jest.fn().mockResolvedValue(undefined) }));

const PropertyCategory = require("../modules/admin/propertyCategories/model");
const IdealFor = require("../modules/admin/idealFor/model");
const ListingPurchasedPlan = require("../modules/mixed/purchasedPlans/model");
const AutoApprovalConfig = require("../modules/admin/autoApprovalConfig/model");
const ProjectListing = require("../modules/mixed/projectListing/model");
const router = require("../modules/mixed/projectListing/routes");

const app = express();
app.use(express.json());
app.use("/api/mixed/project-listings", router);

const userId = "64a000000000000000000099";
const roleId = "64a000000000000000000098";
const objectId = () => new mongoose.Types.ObjectId().toString();

beforeEach(() => {
  global.projectListingTestUser = {
    _id: userId,
    name: "Project Builder",
    mobile: "9876543210",
    email: "builder@example.com",
    profilePhoto: "https://example.com/profile.jpg",
    role: { _id: roleId, name: "Builder" },
    autoApprovalProperties: false,
  };

  // Mock Google Reverse Geocoding API for verifyCityAndLocality
  global.fetch = jest.fn().mockResolvedValue({
    ok: true,
    json: () => Promise.resolve({
      status: "OK",
      results: [{
        formatted_address: "Gachibowli, Hyderabad, Telangana, India",
        address_components: [
          { long_name: "Hyderabad", types: ["locality"] },
          { long_name: "Telangana", types: ["administrative_area_level_1"] },
          { long_name: "India", types: ["country"] },
        ],
      }],
    }),
  });
});

const residentialPayload = () => ({
  categoryId: RESIDENTIAL_CATEGORY_ID,
  cityName: "Hyderabad",
  locality: { address: "Gachibowli, Hyderabad, Telangana, India", latitude: 17.4401, longitude: 78.3489 },
  projectName: "Greenview Residences",
  developerName: "Greenview Group",
  projectStatus: "Under Construction",
  possessionDate: "2027-12-01",
  totalUnits: 240,
  availableUnits: 86,
  towerCount: 3,
  residentialConfigurations: ["2 BHK", "3 BHK"],
  minPrice: 7800000,
  maxPrice: 14500000,
});

const commercialPayload = () => ({
  ...residentialPayload(),
  categoryId: COMMERCIAL_CATEGORY_ID,
  idealFor: [IDEAL_FOR_ID_A, IDEAL_FOR_ID_B],
  projectName: "Vertex Business Park",
  developerName: "Vertex Developments",
  projectStatus: "Ready to Move",
  possessionDate: undefined,
  commercialDetails: {
    zoneType: "Commercial",
    locationHub: "IT Park",
    areaUnit: "sqft",
    configurations: [
      { carpetArea: 900 },
      { carpetArea: 1800 },
    ],
  },
  residentialConfigurations: undefined,
});

const postProject = (payload) => request(app).post("/api/mixed/project-listings").send(payload);
const idealForRecords = [
  { _id: IDEAL_FOR_ID_A, name: "Families", image: "https://api.realsquare.test/storage/families.jpg", order: 1, isActive: true },
  { _id: IDEAL_FOR_ID_B, name: "Investors", image: "https://api.realsquare.test/storage/investors.jpg", order: 2, isActive: true },
];

function mockIdealForFind(records = idealForRecords) {
  jest.spyOn(IdealFor, "find").mockImplementation((filter = {}) => {
    let results = records.filter((record) => filter.isActive === undefined || record.isActive === filter.isActive);
    if (filter._id?.$in) results = results.filter((record) => filter._id.$in.map(String).includes(String(record._id)));
    const query = {
      select: jest.fn(() => query),
      sort: jest.fn(() => Promise.resolve([...results].sort((a, b) => a.order - b.order))),
      then: (resolve, reject) => Promise.resolve(results).then(resolve, reject),
    };
    return query;
  });
}

function mockFindById(Model, byId) {
  jest.spyOn(Model, "findById").mockImplementation((id) => ({
    select: jest.fn().mockResolvedValue(byId[String(id)] ?? null),
  }));
}

describe("POST /api/mixed/project-listings", () => {
  let savedListings;

  beforeEach(() => {
    global.projectListingTestUser = {
      _id: userId,
      name: "Project Builder",
      mobile: "9876543210",
      email: "builder@example.com",
      profilePhoto: "https://example.com/profile.jpg",
      role: { _id: roleId, name: "Builder" },
      autoApprovalProperties: false,
    };
    savedListings = [];

    mockFindById(PropertyCategory, {
      [RESIDENTIAL_CATEGORY_ID]: { _id: RESIDENTIAL_CATEGORY_ID, name: "Residential", isActive: true },
      [COMMERCIAL_CATEGORY_ID]: { _id: COMMERCIAL_CATEGORY_ID, name: "Commercial", isActive: true },
    });
    mockIdealForFind();

    jest.spyOn(ListingPurchasedPlan, "find").mockResolvedValue([{
      plan: { numberOfPropertiesGiven: -1 },
      propertiesUsed: 0,
      save: jest.fn().mockResolvedValue(undefined),
    }]);
    jest.spyOn(AutoApprovalConfig, "findOne").mockResolvedValue({ isActive: false });
    jest.spyOn(ProjectListing.prototype, "save").mockImplementation(async function saveListing() {
      await this.validate();
      savedListings.push(this);
      return this;
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  test("creates a residential project with multiple BHK configurations", async () => {
    const response = await postProject(residentialPayload());

    expect(response.status).toBe(201);
    expect(response.body.success).toBe(true);
    expect(response.body.data.status).toBe("UnderReview");
    expect(savedListings[0].cityName).toBe("Hyderabad");
    expect(savedListings[0].residentialDetails.configurations.map((item) => item.bhk)).toEqual(["2 BHK", "3 BHK"]);
    expect(savedListings[0].idealFor).toEqual([]);
    expect(savedListings[0].listedBy.id.toString()).toBe(userId);
    expect(savedListings[0].listedBy).toMatchObject({ name: "Project Builder", mobile: "9876543210" });
  });

  test("reverse-geocodes the selected locality and accepts the matching city", async () => {
    const response = await postProject(residentialPayload());

    expect(response.status).toBe(201);
    expect(global.fetch).toHaveBeenCalledTimes(1);
    expect(global.fetch.mock.calls[0][0]).toContain("latlng=17.4401%2C78.3489");
  });

  test("rejects a city that differs from the locality coordinates", async () => {
    const payload = { ...residentialPayload(), cityName: "Pune" };
    const response = await postProject(payload);

    expect(response.status).toBe(400);
    expect(response.body.errors.some((error) => /locality belongs to/i.test(error.msg))).toBe(true);
    expect(savedListings).toHaveLength(0);
  });

  test("rejects an address label from another city even when coordinates resolve to the submitted city", async () => {
    const payload = {
      ...residentialPayload(),
      locality: { address: "Koregaon Park, Pune, Maharashtra, India", latitude: 17.4401, longitude: 78.3489 },
    };
    const response = await postProject(payload);

    expect(response.status).toBe(400);
    expect(response.body.errors.some((error) => /address does not identify the city/i.test(error.msg))).toBe(true);
    expect(savedListings).toHaveLength(0);
  });

  test("rejects locality coordinates when reverse geocoding cannot resolve a location", async () => {
    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ status: "ZERO_RESULTS", results: [] }),
    });
    const response = await postProject(residentialPayload());

    expect(response.status).toBe(400);
    expect(response.body.errors.some((error) => /could not verify the location/i.test(error.msg))).toBe(true);
    expect(savedListings).toHaveLength(0);
  });

  test("stores residential carpet area values with one shared area unit", async () => {
    const payload = residentialPayload();
    payload.residentialAreaUnit = "sqft";
    payload.residentialConfigurations = [{ bhk: "2 BHK", builtUpArea: { value: 1200, unit: "sqft" }, carpetArea: 900 }];
    const response = await postProject(payload);

    expect(response.status).toBe(201);
    expect(savedListings[0].residentialDetails.areaUnit).toBe("sqft");
    expect(savedListings[0].residentialDetails.configurations[0].carpetArea).toBe(900);
    expect(savedListings[0].residentialDetails.configurations[0].builtUpArea).toBeUndefined();
  });

  test("requires one shared residential area unit when carpet areas are provided", async () => {
    const payload = residentialPayload();
    payload.residentialConfigurations = [{ bhk: "2 BHK", carpetArea: 900 }];
    const response = await postProject(payload);

    expect(response.status).toBe(400);
    expect(response.body.errors.some((error) => /shared residential area unit/i.test(error.msg))).toBe(true);
  });

  test("creates a commercial project with multiple carpet area configurations and one shared unit", async () => {
    const response = await postProject(commercialPayload());

    expect(response.status).toBe(201);
    expect(savedListings[0].commercialDetails.zoneType).toBe("Commercial");
    expect(savedListings[0].commercialDetails.locationHub).toBe("IT Park");
    expect(savedListings[0].commercialDetails.configurations).toHaveLength(2);
    expect(savedListings[0].commercialDetails.areaUnit).toBe("sqft");
    expect(savedListings[0].commercialDetails.configurations[1].carpetArea).toBe(1800);
    expect(savedListings[0].commercialDetails.configurations[1].builtUpArea).toBeUndefined();
    expect(savedListings[0].idealFor.map((option) => option.name)).toEqual(["Families", "Investors"]);
    expect(String(savedListings[0].idealFor[0].id)).toBe(IDEAL_FOR_ID_A);
    expect(savedListings[0].idealFor[0].image).toBe(idealForRecords[0].image);
    expect(savedListings[0].idealFor[0].order).toBe(1);
  });

  test("GETs active Ideal For options in display order", async () => {
    mockIdealForFind([idealForRecords[1], { ...idealForRecords[0], isActive: false }]);
    const response = await request(app).get("/api/mixed/project-listings/ideal-for");

    expect(response.status).toBe(200);
    expect(response.body.data.map((option) => option.name)).toEqual(["Investors"]);
  });

  test("creates a project with optional RERA data and media-independent details", async () => {
    const payload = {
      ...residentialPayload(),
      projectStatus: "Ready to Move",
      possessionDate: undefined,
      reraId: "P02400007891",
      projectDescription: "A gated community with landscaped open spaces.",
      rera: {
        reraStatus: "verified",
        reraAdminApproved: true,
        projectDetails: { projectName: "Greenview Residences", confidence: "high" },
        sources: ["https://rera.example.com/project"],
      },
      furnishType: "Semi-Furnished",
      furnishings: [{ id: objectId(), name: "Wardrobe", icon: "wardrobe.svg", count: 2 }],
      amenities: [{ id: objectId(), name: "Gym", icon: "gym.svg", count: 1 }],
    };
    const response = await postProject(payload);

    expect(response.status).toBe(201);
    expect(savedListings[0].rera.reraId).toBe("P02400007891");
    expect(savedListings[0].rera.projectDetails.confidence).toBe("high");
    expect(savedListings[0].furnishings[0].name).toBe("Wardrobe");
    expect(savedListings[0].amenities[0].name).toBe("Gym");
  });

  test("creates a project without a developer name", async () => {
    const payload = residentialPayload();
    delete payload.developerName;
    const response = await postProject(payload);

    expect(response.status).toBe(201);
    expect(savedListings[0].developerName).toBeUndefined();
  });

  test.each([
    ["categoryId", (payload) => { delete payload.categoryId; }],
    ["cityName", (payload) => { delete payload.cityName; }],
    ["projectName", (payload) => { delete payload.projectName; }],
    ["locality.address", (payload) => { delete payload.locality.address; }],
    ["locality.latitude", (payload) => { delete payload.locality.latitude; }],
    ["locality.longitude", (payload) => { delete payload.locality.longitude; }],
    ["projectStatus", (payload) => { delete payload.projectStatus; }],
    ["totalUnits", (payload) => { delete payload.totalUnits; }],
    ["availableUnits", (payload) => { delete payload.availableUnits; }],
    ["minPrice", (payload) => { delete payload.minPrice; }],
    ["maxPrice", (payload) => { delete payload.maxPrice; }],
    ["residentialConfigurations", (payload) => { delete payload.residentialConfigurations; }],
  ])("rejects a missing required field: %s", async (_field, mutate) => {
    const payload = residentialPayload();
    mutate(payload);
    const response = await postProject(payload);

    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);
    expect(savedListings).toHaveLength(0);
  });

  test.each([
    ["invalid project status", (payload) => { payload.projectStatus = "Planning"; }],
    ["possession date for an unfinished project", (payload) => { delete payload.possessionDate; }],
    ["zero available units", (payload) => { payload.availableUnits = 0; }],
    ["available units above total units", (payload) => { payload.availableUnits = 241; }],
    ["non-integer total units", (payload) => { payload.totalUnits = 2.5; }],
    ["maximum price below minimum price", (payload) => { payload.maxPrice = 10; }],
    ["invalid category ID", (payload) => { payload.categoryId = "not-an-object-id"; }],
  ])("rejects %s", async (_description, mutate) => {
    const payload = residentialPayload();
    mutate(payload);
    const response = await postProject(payload);

    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);
    expect(savedListings).toHaveLength(0);
  });

  test("rejects an inactive Ideal For option", async () => {
    mockIdealForFind([{ ...idealForRecords[0], isActive: false }]);
    const payload = { ...commercialPayload(), idealFor: [IDEAL_FOR_ID_A] };
    const response = await postProject(payload);

    expect(response.status).toBe(400);
    expect(response.body.errors.some((error) => /active Ideal For/i.test(error.msg))).toBe(true);
  });

  test("rejects an unknown Ideal For option", async () => {
    const payload = { ...commercialPayload(), idealFor: [objectId()] };
    const response = await postProject(payload);

    expect(response.status).toBe(400);
    expect(response.body.errors.some((error) => /active Ideal For/i.test(error.msg))).toBe(true);
  });

  test("requires at least one Ideal For selection", async () => {
    const response = await postProject({ ...commercialPayload(), idealFor: [] });

    expect(response.status).toBe(400);
    expect(response.body.errors.some((error) => /at least one Ideal For/i.test(error.msg))).toBe(true);
  });

  test("rejects an inactive category", async () => {
    PropertyCategory.findById.mockImplementation((id) => ({
      select: jest.fn().mockResolvedValue({ _id: id, name: "Residential", isActive: false }),
    }));
    const response = await postProject(residentialPayload());

    expect(response.status).toBe(400);
    expect(response.body.errors.some((error) => /inactive/i.test(error.msg))).toBe(true);
  });

  test("rejects a non-positive commercial carpet area", async () => {
    const payload = commercialPayload();
    payload.commercialDetails.configurations[0].carpetArea = 0;
    const response = await postProject(payload);

    expect(response.status).toBe(400);
    expect(response.body.errors.some((error) => /valid carpet area/i.test(error.msg))).toBe(true);
  });

  test("rejects commercial configurations without a carpet area", async () => {
    const payload = commercialPayload();
    delete payload.commercialDetails.configurations[0].carpetArea;
    const response = await postProject(payload);

    expect(response.status).toBe(400);
    expect(response.body.errors.some((error) => /valid carpet area/i.test(error.msg))).toBe(true);
  });

  test("rejects invalid commercial area units", async () => {
    const payload = commercialPayload();
    payload.commercialDetails.areaUnit = "acre";
    const response = await postProject(payload);

    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);
  });

  test("rejects commercial configurations without one shared area unit", async () => {
    const payload = commercialPayload();
    delete payload.commercialDetails.areaUnit;
    const response = await postProject(payload);

    expect(response.status).toBe(400);
    expect(response.body.errors.some((error) => /Commercial area unit/i.test(error.msg))).toBe(true);
  });

  test("rejects residential BHK values outside the chatbot options", async () => {
    const payload = residentialPayload();
    payload.residentialConfigurations[0] = "Studio";
    const response = await postProject(payload);

    expect(response.status).toBe(400);
    expect(response.body.errors.some((error) => /residentialDetails.configurations.0.bhk/.test(error.path))).toBe(true);
  });

  test("rejects Mongoose enum validation failures", async () => {
    const payload = { ...residentialPayload(), furnishType: "Partly Furnished" };
    const response = await postProject(payload);

    expect(response.status).toBe(400);
    expect(response.body.errors.some((error) => /furnishType/i.test(error.path))).toBe(true);
  });

  test.each([
    ["RERA status", (payload) => { payload.rera = { reraStatus: "pending" }; }],
    ["RERA confidence", (payload) => { payload.rera = { projectDetails: { confidence: "certain" } }; }],
  ])("rejects invalid %s enum values", async (_label, mutate) => {
    const payload = residentialPayload();
    mutate(payload);
    const response = await postProject(payload);

    expect(response.status).toBe(400);
    expect(response.body.errors.length).toBeGreaterThan(0);
  });

  test.each([
    ["zoneType", "Unknown Zone"],
    ["locationHub", "Unknown Hub"],
  ])("rejects invalid commercial %s enum values", async (field, value) => {
    const payload = commercialPayload();
    payload.commercialDetails[field] = value;
    const response = await postProject(payload);

    expect(response.status).toBe(400);
    expect(response.body.errors.length).toBeGreaterThan(0);
  });

  test("rejects incomplete user profiles", async () => {
    global.projectListingTestUser.name = "";
    const response = await postProject(residentialPayload());

    expect(response.status).toBe(403);
    expect(response.body.success).toBe(false);
  });
});

describe("POST /api/mixed/project-listings/media", () => {
  afterEach(() => jest.restoreAllMocks());

  test("uploads images separately and appends their URLs", async () => {
    const listing = {
      _id: objectId(),
      listedBy: { id: userId },
      status: "UnderReview",
      media: { images: [] },
      save: jest.fn().mockResolvedValue(undefined),
    };
    jest.spyOn(ProjectListing, "findById").mockResolvedValue(listing);

    const response = await request(app)
      .post("/api/mixed/project-listings/media")
      .send({ projectId: listing._id });

    expect(response.status).toBe(200);
    expect(response.body.data.images).toEqual(["https://api.realsquare.test/storage/images/project-test.jpg"]);
    expect(listing.save).toHaveBeenCalledTimes(1);
  });

  test("rejects upload when no images were supplied", async () => {
    const listing = { _id: objectId(), listedBy: { id: userId }, status: "UnderReview", media: { images: [] } };
    jest.spyOn(ProjectListing, "findById").mockResolvedValue(listing);

    const response = await request(app)
      .post("/api/mixed/project-listings/media")
      .set("x-test-empty-upload", "1")
      .send({ projectId: listing._id });

    expect(response.status).toBe(400);
    expect(response.body.message).toMatch(/No images uploaded/);
  });

  test("prevents uploading to another user's project", async () => {
    const listing = { _id: objectId(), listedBy: { id: objectId() }, status: "UnderReview", media: { images: [] } };
    jest.spyOn(ProjectListing, "findById").mockResolvedValue(listing);

    const response = await request(app)
      .post("/api/mixed/project-listings/media")
      .send({ projectId: listing._id });

    expect(response.status).toBe(403);
    expect(response.body.success).toBe(false);
  });
});
