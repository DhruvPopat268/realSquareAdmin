jest.mock("../modules/admin/virtualSpace/model", () => ({
  find: jest.fn(),
  findOne: jest.fn(),
  create: jest.fn(),
  findByIdAndUpdate: jest.fn(),
  findByIdAndDelete: jest.fn(),
}));

const VirtualSpace = require("../modules/admin/virtualSpace/model");
const {
  getVirtualSpaces,
  createVirtualSpace,
  updateVirtualSpace,
  deleteVirtualSpace,
} = require("../modules/admin/virtualSpace/controller");
const {
  validateActiveCoworkingBenefits,
} = require("../modules/mixed/propertyListing/validator");

function response() {
  return {
    statusCode: 200,
    body: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(body) {
      this.body = body;
      return this;
    },
  };
}

function req(body = {}, params = {}, query = {}) {
  return { body, params, query };
}

beforeEach(() => {
  jest.clearAllMocks();
});

describe("virtual space benefits master", () => {
  test("lists rows using active and title filters", async () => {
    const sort = jest.fn().mockResolvedValue([]);
    VirtualSpace.find.mockReturnValue({ sort });

    const res = response();
    await getVirtualSpaces(
      req({}, {}, { isActive: "false", search: "office" }),
      res,
    );

    expect(VirtualSpace.find).toHaveBeenCalledWith({
      isActive: false,
      title: expect.any(RegExp),
    });
    expect(res.body).toEqual({ success: true, data: [] });
  });

  test("creates a titled list of benefits", async () => {
    VirtualSpace.findOne.mockReturnValue({
      collation: jest.fn().mockResolvedValue(null),
    });
    VirtualSpace.create.mockResolvedValue({
      _id: "master-1",
      title: "Virtual Office",
      benefits: ["Business address"],
      isActive: true,
    });

    const res = response();
    await createVirtualSpace(
      req({
        title: " Virtual Office ",
        benefits: [" Business address "],
        isActive: true,
      }),
      res,
    );

    expect(VirtualSpace.create).toHaveBeenCalledWith({
      title: "Virtual Office",
      benefits: ["Business address"],
      isActive: true,
    });
    expect(res.statusCode).toBe(201);
  });

  test("rejects a duplicate title", async () => {
    VirtualSpace.findOne.mockReturnValue({
      collation: jest.fn().mockResolvedValue({ _id: "existing" }),
    });

    const res = response();
    await createVirtualSpace(
      req({ title: "Virtual Office", benefits: ["Address"] }),
      res,
    );

    expect(res.statusCode).toBe(409);
  });

  test("updates fields including active status", async () => {
    VirtualSpace.findByIdAndUpdate.mockResolvedValue({
      _id: "master-1",
      isActive: false,
    });

    const res = response();
    await updateVirtualSpace(req({ isActive: false }, { id: "master-1" }), res);

    expect(VirtualSpace.findByIdAndUpdate).toHaveBeenCalledWith(
      "master-1",
      { isActive: false },
      { new: true, runValidators: true },
    );
    expect(res.body.data.isActive).toBe(false);
  });

  test("deletes a master row", async () => {
    VirtualSpace.findByIdAndDelete.mockResolvedValue({ _id: "master-1" });

    const res = response();
    await deleteVirtualSpace(req({}, { id: "master-1" }), res);

    expect(res.body.success).toBe(true);
  });
});

describe("virtual space listing benefits", () => {
  const masterId = "6ad8604cdaad6d32b13b7d67";

  test("accepts choices from active masters", async () => {
    VirtualSpace.find.mockReturnValue({
      select: jest.fn().mockReturnThis(),
      lean: jest.fn().mockResolvedValue([
        {
          _id: masterId,
          title: "Virtual Office",
          benefits: ["Business address"],
        },
      ]),
    });

    await expect(
      validateActiveCoworkingBenefits([
        {
          type: "virtualSpace",
          benefits: [
            {
              _id: masterId,
              title: "Virtual Office",
              benefits: ["Business address"],
            },
          ],
        },
      ]),
    ).resolves.toBe(true);
  });

  test("rejects choices that are not in active masters", async () => {
    VirtualSpace.find.mockReturnValue({
      select: jest.fn().mockReturnThis(),
      lean: jest.fn().mockResolvedValue([
        {
          _id: masterId,
          title: "Virtual Office",
          benefits: ["Business address"],
        },
      ]),
    });

    await expect(
      validateActiveCoworkingBenefits([
        {
          type: "virtualSpace",
          benefits: [
            {
              _id: masterId,
              title: "Virtual Office",
              benefits: ["Mail forwarding"],
            },
          ],
        },
      ]),
    ).rejects.toThrow(/active benefits/);
  });
});
