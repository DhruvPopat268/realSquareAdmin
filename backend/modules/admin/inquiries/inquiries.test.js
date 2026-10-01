require("dotenv").config();
const mongoose = require("mongoose");
const request = require("supertest");
const app = require("../../../server");
const { AssignedInquiry } = require("../../mixed/inquiries/assignedInquiriesModel");

const ADMIN_TOKEN = process.env.ADMIN_TOKEN;
const adminGet = (path) => request(app).get(path).set("Authorization", `Bearer ${ADMIN_TOKEN}`);
const adminFixtureTest = (...args) => ADMIN_TOKEN ? test(...args) : test.skip(...args);

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
    }));
  });

  adminFixtureTest("400 — rejects malformed creator IDs", async () => {
    const res = await adminGet("/api/admin/inquiries?createdById=bad-id");
    expect(res.statusCode).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toMatch(/createdById/i);
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
});
