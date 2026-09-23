/**
 * Status Transition Test Cases
 * ─────────────────────────────────────────────────────────────────────────────
 * Tests all 8 status transition APIs:
 *   Admin  (4): PATCH /api/admin/property-listings/mark-inactive/:id
 *                PATCH /api/admin/property-listings/mark-active/:id
 *                PATCH /api/admin/property-listings/mark-sold/:id
 *                PATCH /api/admin/property-listings/mark-rented/:id
 *
 *   Mixed  (4): PATCH /api/mixed/property-listings/mark-inactive/:id
 *                PATCH /api/mixed/property-listings/mark-active/:id
 *                PATCH /api/mixed/property-listings/mark-sold/:id
 *                PATCH /api/mixed/property-listings/mark-rented/:id
 *
 * Real DB is used (same MONGO_URI from .env). No data is permanently mutated —
 * every test that changes a status resets it in afterEach.
 */

require("dotenv").config();
const request = require("supertest");
const app     = require("../server");

// ─── Tokens ───────────────────────────────────────────────────────────────────
// Admin panel token (super-admin session)
const ADMIN_TOKEN = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjZhMzkwNmI3NzkzMzcxOWNhN2UwZWI3NyIsInR5cGUiOiJhZG1pbiIsImlhdCI6MTc5MDE1MDgwOSwiZXhwIjoxNzkwNzU1NjA5fQ.7jDqeXQhbZ-0myj2B16I9qIM8eVIsp2RGZ1fvZMFCaE";

// Customer/owner user token (listedBy.id = 6a4664e8cdafad1bdf585e60)
const USER_TOKEN  = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjZhNDY2NGU4Y2RhZmFkMWJkZjU4NWU2MCIsImlhdCI6MTc5MDE1MDg2OSwiZXhwIjoxNzkwNzU1NjY5fQ.e_XVjjRIXiPFiylQt7KHK949X_urMCx1qGR7ak22AVw";

// ─── Listing IDs (real docs from DB — listedBy.id: 6a4664e8cdafad1bdf585e60) ─
const IDS = {
  activeSell:     "6a6b3799e9f804e96285335e",  // Residential Sell   — Active
  activeSell2:    "6a6b39a8e9f804e9628533a5",  // Residential Sell   — Active  (spare for admin sold test)
  activeRent:     "6a6b3e361963e7e4430a2ff9",  // Commercial  Rent   — Active
  activePG:       "6a6b45949c23a3f3554da020",  // Residential PG     — Active
  activePG2:      "6a6c745ac2a6cab97d919e73",  // Residential PG     — Active  (spare for mixed rented test)
  inactivePG:     "6a6c79ba7dcf5fa445cd1d46",  // Residential PG     — Inactive
  underReview:    "6a673ed38f01609b0db11b78",  // Residential Buy    — UnderReview
  FAKE_VALID_ID:  "000000000000000000000001",  // valid ObjectId format but does not exist in DB
  INVALID_ID:     "not-a-valid-id",            // malformed ObjectId
};

// ─── Helpers ──────────────────────────────────────────────────────────────────
const adminPatch  = (path) => request(app).patch(path).set("Authorization", `Bearer ${ADMIN_TOKEN}`);
const userPatch   = (path) => request(app).patch(path).set("Authorization", `Bearer ${USER_TOKEN}`);
const noAuthPatch = (path) => request(app).patch(path);

// Reset a listing back to its original status via admin API after a mutating test
async function resetToActive(id) {
  await adminPatch(`/api/admin/property-listings/mark-active/${id}`);
}
async function resetToInactive(id) {
  await adminPatch(`/api/admin/property-listings/mark-inactive/${id}`);
}

// ═════════════════════════════════════════════════════════════════════════════
// ADMIN APIs
// ═════════════════════════════════════════════════════════════════════════════

describe("ADMIN — mark-inactive", () => {
  // Reset after each mutating test
  afterEach(async () => {
    // Restore activeSell back to Active in case it was marked inactive
    await resetToActive(IDS.activeSell);
  });

  test("401 — no token", async () => {
    const res = await noAuthPatch(`/api/admin/property-listings/mark-inactive/${IDS.activeSell}`);
    expect(res.statusCode).toBe(401);
    expect(res.body.success).toBe(false);
  });

  test("400 — invalid ID format", async () => {
    const res = await adminPatch(`/api/admin/property-listings/mark-inactive/${IDS.INVALID_ID}`);
    expect(res.statusCode).toBe(400);
    expect(res.body.success).toBe(false);
  });

  test("404 — valid format but non-existent ID", async () => {
    const res = await adminPatch(`/api/admin/property-listings/mark-inactive/${IDS.FAKE_VALID_ID}`);
    expect(res.statusCode).toBe(404);
    expect(res.body.success).toBe(false);
  });

  test("400 — wrong status (already Inactive)", async () => {
    const res = await adminPatch(`/api/admin/property-listings/mark-inactive/${IDS.inactivePG}`);
    expect(res.statusCode).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toMatch(/Active/i);
  });

  test("400 — wrong status (UnderReview, not Active)", async () => {
    const res = await adminPatch(`/api/admin/property-listings/mark-inactive/${IDS.underReview}`);
    expect(res.statusCode).toBe(400);
    expect(res.body.success).toBe(false);
  });

  test("200 — Active → Inactive (success)", async () => {
    const res = await adminPatch(`/api/admin/property-listings/mark-inactive/${IDS.activeSell}`);
    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.status).toBe("Inactive");
  });
});

// ─────────────────────────────────────────────────────────────────────────────

describe("ADMIN — mark-active", () => {
  afterEach(async () => {
    // Restore activeRent back to Active in case test made it inactive first
    await resetToActive(IDS.activeRent);
  });

  test("401 — no token", async () => {
    const res = await noAuthPatch(`/api/admin/property-listings/mark-active/${IDS.inactivePG}`);
    expect(res.statusCode).toBe(401);
    expect(res.body.success).toBe(false);
  });

  test("400 — invalid ID format", async () => {
    const res = await adminPatch(`/api/admin/property-listings/mark-active/${IDS.INVALID_ID}`);
    expect(res.statusCode).toBe(400);
    expect(res.body.success).toBe(false);
  });

  test("404 — non-existent ID", async () => {
    const res = await adminPatch(`/api/admin/property-listings/mark-active/${IDS.FAKE_VALID_ID}`);
    expect(res.statusCode).toBe(404);
    expect(res.body.success).toBe(false);
  });

  test("400 — wrong status (UnderReview — not allowed)", async () => {
    const res = await adminPatch(`/api/admin/property-listings/mark-active/${IDS.underReview}`);
    expect(res.statusCode).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toMatch(/Inactive|Sold|Rented/i);
  });

  test("400 — wrong status (Active — already active)", async () => {
    const res = await adminPatch(`/api/admin/property-listings/mark-active/${IDS.activeSell}`);
    expect(res.statusCode).toBe(400);
    expect(res.body.success).toBe(false);
  });

  test("400 — Rejected status is no longer allowed (after fix)", async () => {
    // We have no Rejected listing in the real DB for this user so we
    // simulate by trying underReview which also fails — the key check
    // is that the allowed list message does NOT mention Rejected.
    const res = await adminPatch(`/api/admin/property-listings/mark-active/${IDS.underReview}`);
    expect(res.statusCode).toBe(400);
    expect(res.body.message).not.toMatch(/Rejected/i);
  });

  test("200 — Inactive → Active (success)", async () => {
    const res = await adminPatch(`/api/admin/property-listings/mark-active/${IDS.inactivePG}`);
    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.status).toBe("Active");
    // reset back to Inactive so other tests that rely on it are unaffected
    await resetToInactive(IDS.inactivePG);
  });
});

// ─────────────────────────────────────────────────────────────────────────────

describe("ADMIN — mark-sold", () => {
  afterEach(async () => {
    await resetToActive(IDS.activeSell2);
  });

  test("401 — no token", async () => {
    const res = await noAuthPatch(`/api/admin/property-listings/mark-sold/${IDS.activeSell2}`);
    expect(res.statusCode).toBe(401);
    expect(res.body.success).toBe(false);
  });

  test("400 — invalid ID format", async () => {
    const res = await adminPatch(`/api/admin/property-listings/mark-sold/${IDS.INVALID_ID}`);
    expect(res.statusCode).toBe(400);
    expect(res.body.success).toBe(false);
  });

  test("404 — non-existent ID", async () => {
    const res = await adminPatch(`/api/admin/property-listings/mark-sold/${IDS.FAKE_VALID_ID}`);
    expect(res.statusCode).toBe(404);
    expect(res.body.success).toBe(false);
  });

  test("400 — wrong status (Inactive, not Active)", async () => {
    const res = await adminPatch(`/api/admin/property-listings/mark-sold/${IDS.inactivePG}`);
    expect(res.statusCode).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toMatch(/Active/i);
  });

  test("400 — Active but wrong listing type (Rent listing, not Sell)", async () => {
    const res = await adminPatch(`/api/admin/property-listings/mark-sold/${IDS.activeRent}`);
    expect(res.statusCode).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toMatch(/Sell/i);
  });

  test("400 — Active but wrong listing type (PG listing, not Sell)", async () => {
    const res = await adminPatch(`/api/admin/property-listings/mark-sold/${IDS.activePG}`);
    expect(res.statusCode).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toMatch(/Sell/i);
  });

  test("200 — Active Sell → Sold (success)", async () => {
    const res = await adminPatch(`/api/admin/property-listings/mark-sold/${IDS.activeSell2}`);
    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.status).toBe("Sold");
    expect(res.body.data.soldAt).toBeDefined();
  });
});

// ─────────────────────────────────────────────────────────────────────────────

describe("ADMIN — mark-rented", () => {
  afterEach(async () => {
    await resetToActive(IDS.activeRent);
  });

  test("401 — no token", async () => {
    const res = await noAuthPatch(`/api/admin/property-listings/mark-rented/${IDS.activeRent}`);
    expect(res.statusCode).toBe(401);
    expect(res.body.success).toBe(false);
  });

  test("400 — invalid ID format", async () => {
    const res = await adminPatch(`/api/admin/property-listings/mark-rented/${IDS.INVALID_ID}`);
    expect(res.statusCode).toBe(400);
    expect(res.body.success).toBe(false);
  });

  test("404 — non-existent ID", async () => {
    const res = await adminPatch(`/api/admin/property-listings/mark-rented/${IDS.FAKE_VALID_ID}`);
    expect(res.statusCode).toBe(404);
    expect(res.body.success).toBe(false);
  });

  test("400 — wrong status (Inactive, not Active)", async () => {
    const res = await adminPatch(`/api/admin/property-listings/mark-rented/${IDS.inactivePG}`);
    expect(res.statusCode).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toMatch(/Active/i);
  });

  test("400 — Active but wrong listing type (Sell listing, not Rent/PG)", async () => {
    const res = await adminPatch(`/api/admin/property-listings/mark-rented/${IDS.activeSell}`);
    expect(res.statusCode).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toMatch(/Rent|PG/i);
  });

  test("200 — Active Rent → Rented (success)", async () => {
    const res = await adminPatch(`/api/admin/property-listings/mark-rented/${IDS.activeRent}`);
    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.status).toBe("Rented");
    expect(res.body.data.rentedAt).toBeDefined();
  });
});


// ═════════════════════════════════════════════════════════════════════════════
// MIXED (User-facing) APIs
// ═════════════════════════════════════════════════════════════════════════════

describe("MIXED — mark-inactive", () => {
  afterEach(async () => {
    await resetToActive(IDS.activeSell);
  });

  test("401 — no token", async () => {
    const res = await noAuthPatch(`/api/mixed/property-listings/mark-inactive/${IDS.activeSell}`);
    expect(res.statusCode).toBe(401);
    expect(res.body.success).toBe(false);
  });

  test("400 — invalid ID format", async () => {
    const res = await userPatch(`/api/mixed/property-listings/mark-inactive/${IDS.INVALID_ID}`);
    expect(res.statusCode).toBe(400);
    expect(res.body.success).toBe(false);
  });

  test("404 — non-existent ID", async () => {
    const res = await userPatch(`/api/mixed/property-listings/mark-inactive/${IDS.FAKE_VALID_ID}`);
    expect(res.statusCode).toBe(404);
    expect(res.body.success).toBe(false);
  });

  test("400 — wrong status (UnderReview, not Active)", async () => {
    const res = await userPatch(`/api/mixed/property-listings/mark-inactive/${IDS.underReview}`);
    expect(res.statusCode).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toMatch(/Active/i);
  });

  test("400 — wrong status (already Inactive)", async () => {
    const res = await userPatch(`/api/mixed/property-listings/mark-inactive/${IDS.inactivePG}`);
    expect(res.statusCode).toBe(400);
    expect(res.body.success).toBe(false);
  });

  test("200 — Active → Inactive (success)", async () => {
    const res = await userPatch(`/api/mixed/property-listings/mark-inactive/${IDS.activeSell}`);
    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.status).toBe("Inactive");
  });
});

// ─────────────────────────────────────────────────────────────────────────────

describe("MIXED — mark-active", () => {
  afterEach(async () => {
    // Restore inactivePG back to Inactive after tests that activate it
    await resetToInactive(IDS.inactivePG);
  });

  test("401 — no token", async () => {
    const res = await noAuthPatch(`/api/mixed/property-listings/mark-active/${IDS.inactivePG}`);
    expect(res.statusCode).toBe(401);
    expect(res.body.success).toBe(false);
  });

  test("400 — invalid ID format", async () => {
    const res = await userPatch(`/api/mixed/property-listings/mark-active/${IDS.INVALID_ID}`);
    expect(res.statusCode).toBe(400);
    expect(res.body.success).toBe(false);
  });

  test("404 — non-existent ID", async () => {
    const res = await userPatch(`/api/mixed/property-listings/mark-active/${IDS.FAKE_VALID_ID}`);
    expect(res.statusCode).toBe(404);
    expect(res.body.success).toBe(false);
  });

  test("400 — wrong status (UnderReview — not in allowed list)", async () => {
    const res = await userPatch(`/api/mixed/property-listings/mark-active/${IDS.underReview}`);
    expect(res.statusCode).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toMatch(/Inactive|Sold|Rented/i);
  });

  test("400 — wrong status (Active — already active)", async () => {
    const res = await userPatch(`/api/mixed/property-listings/mark-active/${IDS.activeSell}`);
    expect(res.statusCode).toBe(400);
    expect(res.body.success).toBe(false);
  });

  test("400 — Rejected → Active not allowed in mixed (skip Active, go directly)", async () => {
    // There's no rejected listing for this user; we reuse underReview which
    // also fails — confirming Rejected is not in the allowed list for mixed.
    // The error message must NOT mention Rejected as a valid from-state.
    const res = await userPatch(`/api/mixed/property-listings/mark-active/${IDS.underReview}`);
    expect(res.statusCode).toBe(400);
    expect(res.body.message).toMatch(/Inactive|Sold|Rented/i);
    expect(res.body.message).not.toMatch(/Rejected/i);
  });

  test("200 — Inactive → Active (success)", async () => {
    const res = await userPatch(`/api/mixed/property-listings/mark-active/${IDS.inactivePG}`);
    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.status).toBe("Active");
  });
});

// ─────────────────────────────────────────────────────────────────────────────

describe("MIXED — mark-sold", () => {
  afterEach(async () => {
    await resetToActive(IDS.activeSell);
  });

  test("401 — no token", async () => {
    const res = await noAuthPatch(`/api/mixed/property-listings/mark-sold/${IDS.activeSell}`);
    expect(res.statusCode).toBe(401);
    expect(res.body.success).toBe(false);
  });

  test("400 — invalid ID format", async () => {
    const res = await userPatch(`/api/mixed/property-listings/mark-sold/${IDS.INVALID_ID}`);
    expect(res.statusCode).toBe(400);
    expect(res.body.success).toBe(false);
  });

  test("404 — non-existent ID", async () => {
    const res = await userPatch(`/api/mixed/property-listings/mark-sold/${IDS.FAKE_VALID_ID}`);
    expect(res.statusCode).toBe(404);
    expect(res.body.success).toBe(false);
  });

  test("400 — skip Active, try mark-sold on Inactive listing directly", async () => {
    // inactivePG is Inactive — trying mark-sold without first going Active
    const res = await userPatch(`/api/mixed/property-listings/mark-sold/${IDS.inactivePG}`);
    expect(res.statusCode).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toMatch(/Active/i);
  });

  test("400 — skip Active, try mark-sold on UnderReview listing directly", async () => {
    const res = await userPatch(`/api/mixed/property-listings/mark-sold/${IDS.underReview}`);
    expect(res.statusCode).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toMatch(/Active/i);
  });

  test("400 — Active but wrong type (Rent listing, not Sell)", async () => {
    const res = await userPatch(`/api/mixed/property-listings/mark-sold/${IDS.activeRent}`);
    expect(res.statusCode).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toMatch(/Sell/i);
  });

  test("400 — Active but wrong type (PG listing, not Sell)", async () => {
    const res = await userPatch(`/api/mixed/property-listings/mark-sold/${IDS.activePG}`);
    expect(res.statusCode).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toMatch(/Sell/i);
  });

  test("200 — Active Sell → Sold (success)", async () => {
    const res = await userPatch(`/api/mixed/property-listings/mark-sold/${IDS.activeSell}`);
    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.status).toBe("Sold");
    expect(res.body.data.soldAt).toBeDefined();
  });
});

// ─────────────────────────────────────────────────────────────────────────────

describe("MIXED — mark-rented", () => {
  afterEach(async () => {
    await resetToActive(IDS.activePG2);
  });

  test("401 — no token", async () => {
    const res = await noAuthPatch(`/api/mixed/property-listings/mark-rented/${IDS.activePG2}`);
    expect(res.statusCode).toBe(401);
    expect(res.body.success).toBe(false);
  });

  test("400 — invalid ID format", async () => {
    const res = await userPatch(`/api/mixed/property-listings/mark-rented/${IDS.INVALID_ID}`);
    expect(res.statusCode).toBe(400);
    expect(res.body.success).toBe(false);
  });

  test("404 — non-existent ID", async () => {
    const res = await userPatch(`/api/mixed/property-listings/mark-rented/${IDS.FAKE_VALID_ID}`);
    expect(res.statusCode).toBe(404);
    expect(res.body.success).toBe(false);
  });

  test("400 — skip Active, try mark-rented on Inactive listing directly", async () => {
    const res = await userPatch(`/api/mixed/property-listings/mark-rented/${IDS.inactivePG}`);
    expect(res.statusCode).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toMatch(/Active/i);
  });

  test("400 — skip Active, try mark-rented on UnderReview listing directly", async () => {
    const res = await userPatch(`/api/mixed/property-listings/mark-rented/${IDS.underReview}`);
    expect(res.statusCode).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toMatch(/Active/i);
  });

  test("400 — Active but wrong type (Sell listing, not Rent/PG)", async () => {
    const res = await userPatch(`/api/mixed/property-listings/mark-rented/${IDS.activeSell}`);
    expect(res.statusCode).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toMatch(/Rent|PG/i);
  });

  test("200 — Active PG → Rented (success)", async () => {
    const res = await userPatch(`/api/mixed/property-listings/mark-rented/${IDS.activePG2}`);
    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.status).toBe("Rented");
    expect(res.body.data.rentedAt).toBeDefined();
  });
});
