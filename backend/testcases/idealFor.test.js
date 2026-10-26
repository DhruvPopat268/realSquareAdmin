const express = require("express");
const request = require("supertest");

jest.mock("../middleware/auth", () => ({
  protect: (_req, _res, next) => next(),
}));
jest.mock("../utils/upload", () => ({
  uploadImage: {
    single: () => (req, _res, next) => {
      if (req.get("x-test-upload-image")) req.file = { path: "/var/www/storage/images/ideal-for-test.jpg" };
      next();
    },
  },
}));

const IdealFor = require("../modules/admin/idealFor/model");
const router = require("../modules/admin/idealFor/routes");

process.env.BACKEND_URL = "https://api.realsquare.test";
const app = express();
app.use(express.json());
app.use("/api/admin/ideal-for", router);

const first = { _id: "64a000000000000000000001", name: "Families", image: "https://api.realsquare.test/storage/families.jpg", order: 1, isActive: true };
const second = { _id: "64a000000000000000000002", name: "Investors", image: "https://api.realsquare.test/storage/investors.jpg", order: 2, isActive: false };

beforeEach(() => jest.restoreAllMocks());

describe("Ideal For master API", () => {
  test("lists all master records sorted by order", async () => {
    jest.spyOn(IdealFor, "find").mockReturnValue({ sort: jest.fn().mockResolvedValue([first, second]) });
    const response = await request(app).get("/api/admin/ideal-for");

    expect(response.status).toBe(200);
    expect(response.body.data.map((item) => item.order)).toEqual([1, 2]);
  });

  test("creates a record with the uploaded image, active default, and next order", async () => {
    jest.spyOn(IdealFor, "findOne").mockImplementation((filter) => filter?.name ? Promise.resolve(null) : { sort: jest.fn().mockResolvedValue({ order: 2 }) });
    jest.spyOn(IdealFor, "create").mockImplementation(async (data) => data);
    const response = await request(app).post("/api/admin/ideal-for").set("x-test-upload-image", "1").send({ name: "Professionals" });

    expect(response.status).toBe(201);
    expect(response.body.data).toMatchObject({ name: "Professionals", order: 3, isActive: true, image: "https://api.realsquare.test/storage/images/ideal-for-test.jpg" });
  });

  test("requires an uploaded image when creating a record", async () => {
    const noImageRouter = express.Router();
    noImageRouter.post("/", (_req, _res, next) => next(), require("../modules/admin/idealFor/validator").createIdealForValidator, require("../modules/admin/idealFor/controller").create);
    const noImageApp = express();
    noImageApp.use(express.json());
    noImageApp.use("/test", noImageRouter);
    const response = await request(noImageApp).post("/test").send({ name: "Without image" });

    expect(response.status).toBe(400);
    expect(response.body.errors.some((error) => /Image is required/i.test(error.msg))).toBe(true);
  });

  test("rejects duplicate names", async () => {
    jest.spyOn(IdealFor, "findOne").mockResolvedValue(first);
    const response = await request(app).post("/api/admin/ideal-for").set("x-test-upload-image", "1").send({ name: "Families" });

    expect(response.status).toBe(409);
  });

  test("updates name and active status while keeping the existing image", async () => {
    const record = { ...first, save: jest.fn().mockResolvedValue(undefined) };
    jest.spyOn(IdealFor, "findById").mockResolvedValue(record);
    jest.spyOn(IdealFor, "findOne").mockResolvedValue(null);
    const response = await request(app).put(`/api/admin/ideal-for/${first._id}`).send({ name: "Households", isActive: false });

    expect(response.status).toBe(200);
    expect(record).toMatchObject({ name: "Households", isActive: false, image: first.image });
  });

  test("reorders options by swapping adjacent order values", async () => {
    const records = [
      { ...first, save: jest.fn().mockResolvedValue(undefined) },
      { ...second, save: jest.fn().mockResolvedValue(undefined) },
    ];
    jest.spyOn(IdealFor, "find").mockReturnValue({ sort: jest.fn().mockResolvedValue(records) });
    const response = await request(app).patch(`/api/admin/ideal-for/${second._id}/reorder`).send({ direction: "up" });

    expect(response.status).toBe(200);
    expect(records.map((item) => item.order)).toEqual([2, 1]);
  });

  test("deletes an option and compacts the remaining order", async () => {
    const remaining = [
      { ...first, order: 1, save: jest.fn().mockResolvedValue(undefined) },
      { ...second, order: 3, save: jest.fn().mockResolvedValue(undefined) },
    ];
    jest.spyOn(IdealFor, "findByIdAndDelete").mockResolvedValue(first);
    jest.spyOn(IdealFor, "find").mockReturnValue({ sort: jest.fn().mockResolvedValue(remaining) });
    const response = await request(app).delete(`/api/admin/ideal-for/${first._id}`);

    expect(response.status).toBe(200);
    expect(remaining[1].order).toBe(2);
    expect(remaining[1].save).toHaveBeenCalled();
  });
});
