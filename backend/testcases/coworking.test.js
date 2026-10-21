const { validateCoworkingDetails } = require("../modules/mixed/propertyListing/validator");
const { ensureCoworkingRentPurpose } = require("../modules/mixed/propertyListing/controller");

describe("coworking create validation", () => {
  const details = {
    workSpaceFloor: 0,
    workspaces: [
      {
        type: "cabin",
        available: 2,
        config: [
          { availableSeats: 4, rentPerSeat: 5000 },
          { availableSeats: 3, rentPerSeat: 7000 },
        ],
      },
      { type: "hall", availableSeats: 30, rentPerSeat: 2000 },
    ],
  };

  test("accepts a cabin group and hall with valid seats and rents", () => {
    expect(validateCoworkingDetails(details)).toBe(true);
    expect(
      validateCoworkingDetails({
        ...details,
        workspaces: [
          ...details.workspaces,
          {
            type: "virtualSpace",
            monthlyRent: 5000,
            benefits: [
              {
                _id: "6ad8604cdaad6d32b13b7d67",
                title: "Virtual Office",
                benefits: ["Business address"],
              },
            ],
          },
        ],
      }),
    ).toBe(true);
  });

  test.each([-1, 0, 1, 12])("accepts workspace floor %i", (workSpaceFloor) => {
    expect(validateCoworkingDetails({ ...details, workSpaceFloor })).toBe(true);
  });

  test.each([undefined, null, "", -2, 1.5, "first"]) (
    "rejects invalid workspace floor %p",
    (workSpaceFloor) => {
      expect(() => validateCoworkingDetails({ ...details, workSpaceFloor })).toThrow(/workSpaceFloor/);
    },
  );

  test("accepts a virtual space with a monthly rent and selected benefits", () => {
    expect(
      validateCoworkingDetails({
        workSpaceFloor: 0,
        workspaces: [
          {
            type: "virtualSpace",
            monthlyRent: 5000,
            benefits: [
              {
                _id: "6ad8604cdaad6d32b13b7d67",
                title: "Virtual Office",
                benefits: ["Business address"],
              },
            ],
          },
        ],
      }),
    ).toBe(true);
  });

  test.each([undefined, null, "", 0, -1, "not-a-number"])(
    "rejects invalid virtual space monthly rent %p",
    (monthlyRent) => {
      expect(() =>
        validateCoworkingDetails({
          workSpaceFloor: 0,
          workspaces: [
            {
              type: "virtualSpace",
              monthlyRent,
              benefits: [
                {
                  _id: "6ad8604cdaad6d32b13b7d67",
                  title: "Virtual Office",
                  benefits: ["Business address"],
                },
              ],
            },
          ],
        }),
      ).toThrow(/monthlyRent/);
    },
  );

  test("requires at least one virtual space benefit", () => {
    expect(() =>
      validateCoworkingDetails({
        workSpaceFloor: 0,
        workspaces: [
          {
            type: "virtualSpace",
            monthlyRent: 5000,
            benefits: [],
          },
        ],
      }),
    ).toThrow(/benefits/);
  });

  test("requires at least one workspace", () => {
    expect(() => validateCoworkingDetails({ workSpaceFloor: 0, workspaces: [] })).toThrow(/at least one workspace/);
  });

  test("rejects duplicate workspace types", () => {
    expect(() => validateCoworkingDetails({
      workSpaceFloor: 0,
      workspaces: [details.workspaces[1], details.workspaces[1]],
    })).toThrow(/duplicate hall/);
  });

  test("rejects unsupported workspace types", () => {
    expect(() => validateCoworkingDetails({
      workSpaceFloor: 0,
      workspaces: [{ type: "virtual" }],
    })).toThrow(/type must be cabin, hall, or virtualSpace/);
  });

  test("requires cabin config count to match available cabins", () => {
    expect(() => validateCoworkingDetails({
      workSpaceFloor: 0,
      workspaces: [{ ...details.workspaces[0], available: 3 }],
    })).toThrow(/one entry per available cabin/);
  });

  test.each([0, -1, 1.25])("rejects cabin seat count %p", (availableSeats) => {
    expect(() => validateCoworkingDetails({
      workSpaceFloor: 0,
      workspaces: [{
        type: "cabin",
        available: 1,
        config: [{ availableSeats, rentPerSeat: 1000 }],
      }],
    })).toThrow(/availableSeats must be a positive integer/);
  });

  test.each([-1, "", "not-a-number"]) ("rejects cabin rent %p", (rentPerSeat) => {
    expect(() => validateCoworkingDetails({
      workSpaceFloor: 0,
      workspaces: [{
        type: "cabin",
        available: 1,
        config: [{ availableSeats: 2, rentPerSeat }],
      }],
    })).toThrow(/rentPerSeat must be zero or greater/);
  });

  test("rejects hall data with zero seats", () => {
    expect(() => validateCoworkingDetails({
      workSpaceFloor: 0,
      workspaces: [{ type: "hall", availableSeats: 0, rentPerSeat: 1000 }],
    })).toThrow(/Hall availableSeats must be a positive integer/);
  });

  test("rejects negative hall rent", () => {
    expect(() => validateCoworkingDetails({
      workSpaceFloor: 0,
      workspaces: [{ type: "hall", availableSeats: 10, rentPerSeat: -1 }],
    })).toThrow(/Hall rentPerSeat must be zero or greater/);
  });

  test("rejects deposit fields in the coworking payload", () => {
    expect(() => validateCoworkingDetails({
      workSpaceFloor: 0,
      workspaces: [{ ...details.workspaces[1], depositPerSeat: 2000 }],
    })).toThrow(/do not accept deposit fields/);
  });
});

describe("coworking purpose normalization", () => {
  const rentPurposeId = "rent-purpose-id";

  beforeEach(() => {
    process.env.COMMERCIAL_PROPERTY_TYPE_co_working_space_ID = "coworking-type-id";
    process.env.LISTING_TYPE_RENT_ID = rentPurposeId;
  });

  test("sets Rent purpose for coworking listings", () => {
    const req = { body: { propertyTypeId: "coworking-type-id", listingTypeId: "sell-purpose-id" } };
    const next = jest.fn();

    ensureCoworkingRentPurpose(req, {}, next);

    expect(req.body.listingTypeId).toBe(rentPurposeId);
    expect(next).toHaveBeenCalledTimes(1);
  });

  test("keeps purpose unchanged for other property types", () => {
    const req = { body: { propertyTypeId: "office-type-id", listingTypeId: "sell-purpose-id" } };
    const next = jest.fn();

    ensureCoworkingRentPurpose(req, {}, next);

    expect(req.body.listingTypeId).toBe("sell-purpose-id");
    expect(next).toHaveBeenCalledTimes(1);
  });
});
