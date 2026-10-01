require("dotenv").config();
const mongoose = require("mongoose");
const request = require("supertest");
const app = require("../../../server");
const { AssignedInquiry } = require("../../mixed/inquiries/assignedInquiriesModel");
const { Inquiry } = require("../../mixed/inquiries/model");

const ADMIN_TOKEN = process.env.ADMIN_TOKEN;
const adminGet = (path) => request(app).get(path).set("Authorization", `Bearer ${ADMIN_TOKEN}`);
const adminPatch = (path, payload) => request(app).patch(path).set("Authorization", `Bearer ${ADMIN_TOKEN}`).send(payload);
const adminFixtureTest = (...args) => ADMIN_TOKEN ? test(...args) : test.skip(...args);

const createStatusFixture = () => Inquiry.create({
  createdBy: {
    id: new mongoose.Types.ObjectId(),
    name: "Inquiry Status Test",
    mobile: "9000000000",
    role: new mongoose.Types.ObjectId(),
  },
  isProperty: true,
  listingType: new mongoose.Types.ObjectId(),
  preferredCity: "Test City",
  budget: { min: 100000, max: 200000 },
  inquiryClassification: "warm",
  lastFollowUpDate: new Date(Date.now() + 86400000),
  preferredCommunication: ["call"],
  status: "active",
});

describe("PATCH /api/admin/inquiries/status", () => {
  test("401 — requires admin authentication", async () => {
    const res = await request(app).patch("/api/admin/inquiries/status").send({
      inquiryId: new mongoose.Types.ObjectId(),
      status: "inactive",
    });
    expect(res.statusCode).toBe(401);
    expect(res.body.success).toBe(false);
  });

  adminFixtureTest("400 — accepts only inactive or completed", async () => {
    const res = await adminPatch("/api/admin/inquiries/status", {
      inquiryId: new mongoose.Types.ObjectId(),
      status: "active",
    });
    expect(res.statusCode).toBe(400);
    expect(res.body.message).toMatch(/inactive.*completed/i);
  });

  adminFixtureTest("400 — requires a valid inquiryId", async () => {
    const missing = await adminPatch("/api/admin/inquiries/status", { status: "inactive" });
    expect(missing.statusCode).toBe(400);
    const malformed = await adminPatch("/api/admin/inquiries/status", { inquiryId: "bad-id", status: "inactive" });
    expect(malformed.statusCode).toBe(400);
  });

  adminFixtureTest("200 — admin can mark an active inquiry inactive without a reason", async () => {
    const inquiry = await createStatusFixture();
    const res = await adminPatch("/api/admin/inquiries/status", { inquiryId: inquiry._id, status: "inactive" });
    expect(res.statusCode).toBe(200);
    expect(res.body.data.status).toBe("inactive");
    expect(res.body.data.statusReason).toBeUndefined();
  });

  adminFixtureTest("200 — admin can mark an active inquiry completed", async () => {
    const inquiry = await createStatusFixture();
    const res = await adminPatch("/api/admin/inquiries/status", { inquiryId: inquiry._id, status: "completed" });
    expect(res.statusCode).toBe(200);
    expect(res.body.data.status).toBe("completed");
  });

  adminFixtureTest("409 — expired inquiries cannot be manually changed", async () => {
    const inquiry = await createStatusFixture();
    inquiry.status = "expired";
    await inquiry.save();
    const res = await adminPatch("/api/admin/inquiries/status", { inquiryId: inquiry._id, status: "completed" });
    expect(res.statusCode).toBe(409);
  });

  adminFixtureTest("404 — unknown inquiry ID is not found", async () => {
    const res = await adminPatch("/api/admin/inquiries/status", {
      inquiryId: new mongoose.Types.ObjectId(),
      status: "completed",
    });
    expect(res.statusCode).toBe(404);
  });
});

describe("GET /api/admin/inquiries", () => {
  test("401 — requires an admin token", async () => {
    const res = await request(app).get("/api/admin/inquiries");
    expect(res.statusCode).toBe(401);
    expect(res.body.success).toBe(false);
  });

  adminFixtureTest("200 — returns source inquiries with pagination and status stats", async () => {
    const res = await adminGet("/api/admin/inquiries?page=1&limit=5");
    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.pagination).toEqual(expect.objectContaining({
      total: expect.any(Number),
      page: 1,
      limit: 5,
      totalPages: expect.any(Number),
    }));
    expect(res.body.stats).toEqual(expect.objectContaining({
      active: expect.any(Number),
      expired: expect.any(Number),
      inactive: expect.any(Number),
      completed: expect.any(Number),
    }));
  });

  adminFixtureTest("400 — rejects malformed creator IDs", async () => {
    const res = await adminGet("/api/admin/inquiries?createdById=bad-id");
    expect(res.statusCode).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toMatch(/createdById/i);
  });

  adminFixtureTest("200 — filters by completed inquiry status", async () => {
    const res = await adminGet("/api/admin/inquiries?status=completed");
    expect(res.statusCode).toBe(200);
    expect(res.body.data.every((inquiry) => inquiry.status === "completed")).toBe(true);
  });
});

describe("GET /api/admin/inquiries/assigned", () => {
  test("401 — requires an admin token", async () => {
    const res = await request(app).get("/api/admin/inquiries/assigned");
    expect(res.statusCode).toBe(401);
    expect(res.body.success).toBe(false);
  });

  adminFixtureTest("200 — returns assignment records populated with their source inquiry", async () => {
    const res = await adminGet("/api/admin/inquiries/assigned?page=1&limit=5");
    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.pagination).toEqual(expect.objectContaining({
      total: expect.any(Number),
      page: 1,
      limit: 5,
      totalPages: expect.any(Number),
    }));
    expect(res.body.stats).toEqual(expect.objectContaining({
      active: expect.any(Number),
      purchased: expect.any(Number),
    }));

    if (res.body.data.length) {
      const assignment = res.body.data[0];
      expect(assignment).toHaveProperty("assignedTo");
      expect(assignment).toHaveProperty("assignmentSource");
      expect(assignment).toHaveProperty("status");
      expect(assignment.inquiry).toEqual(expect.objectContaining({
        _id: expect.any(String),
        preferredCity: expect.any(String),
        budget: expect.any(Object),
      }));
    }
  });

  adminFixtureTest("400 — rejects malformed inquiry IDs", async () => {
    const res = await adminGet("/api/admin/inquiries/assigned?inquiryId=bad-id");
    expect(res.statusCode).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toMatch(/inquiryId/i);
  });
});

describe("GET /api/admin/inquiries/assigned/:inquiryId", () => {
  test("401 — requires an admin token", async () => {
    const res = await request(app).get(`/api/admin/inquiries/assigned/${new mongoose.Types.ObjectId()}`);
    expect(res.statusCode).toBe(401);
    expect(res.body.success).toBe(false);
  });

  adminFixtureTest("200 — returns paginated assignments, stats, raw inquiry ID and populated system-user role", async () => {
    const fixture = await AssignedInquiry.findOne({}).select("inquiry").lean();
    const inquiryId = fixture?.inquiry ?? new mongoose.Types.ObjectId();
    const res = await adminGet(`/api/admin/inquiries/assigned/${inquiryId}?page=1&limit=5`);

    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.pagination).toEqual(expect.objectContaining({
      total: expect.any(Number),
      page: 1,
      limit: 5,
      totalPages: expect.any(Number),
    }));
    expect(res.body.stats).toEqual(expect.objectContaining({
      totalAssigned: expect.any(Number),
      totalPurchased: expect.any(Number),
    }));

    if (res.body.data.length) {
      expect(res.body.data[0].inquiry).toBe(String(inquiryId));
      expect(res.body.data[0].assignedTo.role).toEqual(expect.objectContaining({
        _id: expect.any(String),
        name: expect.any(String),
      }));
      expect(res.body.stats.totalAssigned).toBeGreaterThanOrEqual(res.body.data.length);
    }
  });

  adminFixtureTest("400 — rejects a malformed inquiry ID", async () => {
    const res = await adminGet("/api/admin/inquiries/assigned/not-an-object-id");
    expect(res.statusCode).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toMatch(/inquiryId/i);
  });

  adminFixtureTest("400 — rejects unsupported assignment status filters", async () => {
    const inquiryId = new mongoose.Types.ObjectId();
    const res = await adminGet(`/api/admin/inquiries/assigned/${inquiryId}?status=unknown`);
    expect(res.statusCode).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toMatch(/status/i);
  });

  adminFixtureTest("200 — filters assignment records by active or purchased status", async () => {
    const fixture = await AssignedInquiry.findOne({}).select("inquiry status").lean();
    const inquiryId = fixture?.inquiry ?? new mongoose.Types.ObjectId();
    const status = fixture?.status ?? "active";
    const res = await adminGet(`/api/admin/inquiries/assigned/${inquiryId}?status=${status}&page=1&limit=5`);

    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.every((assignment) => assignment.status === status)).toBe(true);
    expect(res.body.pagination.total).toBeGreaterThanOrEqual(res.body.data.length);
    expect(res.body.stats).toEqual(expect.objectContaining({
      totalAssigned: expect.any(Number),
      totalPurchased: expect.any(Number),
    }));
  });
});
