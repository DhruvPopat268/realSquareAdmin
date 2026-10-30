const express = require("express");
const request = require("supertest");

jest.mock("../middleware/userAuth", () => ({
  userProtect: (req, _res, next) => {
    req.user = { _id: "64a000000000000000000001" };
    next();
  },
}));
jest.mock("../utils/upload", () => ({ uploadImage: { any: () => (_req, _res, next) => next() } }));
jest.mock("../utils/cronProtect", () => (_req, _res, next) => next());

process.env.GOOGLE_MAPS_API_KEY = "city-suggestions-test-key";

const router = require("../modules/systemUsers.routes");

const app = express();
app.use(express.json());
app.use("/api/system-users", router);

const sessionToken = "session-token-123";

function googlePrediction({ placeId, text, city }) {
  return {
    placePrediction: {
      placeId,
      text: { text },
      structuredFormat: {
        mainText: { text: city },
        secondaryText: { text: text.split(",").slice(1).join(",").trim() },
      },
      types: ["locality", "geocode", "political"],
    },
  };
}

function googleResponse(body, { ok = true, status = 200 } = {}) {
  return { ok, status, json: jest.fn().mockResolvedValue(body) };
}

beforeEach(() => {
  process.env.GOOGLE_MAPS_API_KEY = "city-suggestions-test-key";
  global.fetch = jest.fn();
});

afterEach(() => {
  jest.restoreAllMocks();
  delete global.fetch;
});

describe("POST /api/system-users/city-suggestions", () => {
  test("forwards input, locality type, session token, and returns three-part city suggestions", async () => {
    global.fetch.mockResolvedValue(googleResponse({
      suggestions: [
        googlePrediction({ placeId: "city-1", city: "Vadodara", text: "Vadodara, Gujarat, India" }),
        googlePrediction({ placeId: "city-2", city: "Vadod", text: "Vadod, Surat, Gujarat, India" }),
      ],
    }));

    const response = await request(app)
      .post("/api/system-users/city-suggestions")
      .send({ input: "vadod", sessionToken });

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      success: true,
      data: {
        suggestions: [{
          placeId: "city-1",
          city: "Vadodara",
          displayAddress: "Vadodara, Gujarat, India",
        }],
      },
    });
    expect(global.fetch).toHaveBeenCalledWith(
      "https://places.googleapis.com/v1/places:autocomplete",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          "Content-Type": "application/json",
          "X-Goog-Api-Key": "city-suggestions-test-key",
        }),
        body: JSON.stringify({
          input: "vadod",
          includedPrimaryTypes: ["locality"],
          sessionToken,
        }),
      }),
    );
  });

  test.each([
    [{ placeId: "city-1", city: "Vadodara", text: "Vadodara, Gujarat" }],
    [{ placeId: "city-1", city: "Vadodara", text: "Vadodara, Vadodara, Gujarat, India" }],
    [{ placeId: "", city: "Vadodara", text: "Vadodara, Gujarat, India" }],
  ])("drops suggestions without a place ID and exactly three address parts", async (prediction) => {
    global.fetch.mockResolvedValue(googleResponse({ suggestions: [googlePrediction(prediction)] }));

    const response = await request(app)
      .post("/api/system-users/city-suggestions")
      .send({ input: "vadod", sessionToken });

    expect(response.status).toBe(200);
    expect(response.body.data.suggestions).toEqual([]);
  });

  test.each([
    [{ input: "v", sessionToken }, "input"],
    [{ input: "vadod", sessionToken: "" }, "sessionToken"],
    [{ input: "vadod", sessionToken: "not a safe token" }, "sessionToken"],
  ])("rejects invalid request fields %#", async (payload) => {
    const response = await request(app).post("/api/system-users/city-suggestions").send(payload);

    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);
    expect(global.fetch).not.toHaveBeenCalled();
  });

  test("returns a generic upstream error when Google responds with a failure", async () => {
    global.fetch.mockResolvedValue(googleResponse({}, { ok: false, status: 403 }));

    const response = await request(app)
      .post("/api/system-users/city-suggestions")
      .send({ input: "vadod", sessionToken });

    expect(response.status).toBe(502);
    expect(response.body).toEqual({ success: false, message: "Google Places could not return city suggestions." });
  });

  test("returns a configuration error when the Google API key is missing", async () => {
    delete process.env.GOOGLE_MAPS_API_KEY;

    const response = await request(app)
      .post("/api/system-users/city-suggestions")
      .send({ input: "vadod", sessionToken });

    expect(response.status).toBe(503);
    expect(global.fetch).not.toHaveBeenCalled();
  });

  test("returns a timeout response without exposing upstream details", async () => {
    global.fetch.mockRejectedValue(Object.assign(new Error("private upstream detail"), { name: "TimeoutError" }));

    const response = await request(app)
      .post("/api/system-users/city-suggestions")
      .send({ input: "vadod", sessionToken });

    expect(response.status).toBe(504);
    expect(response.body).toEqual({ success: false, message: "Google Places city suggestions timed out." });
  });
});

describe("POST /api/system-users/city-address-suggestions", () => {
  test("qualifies the query with the selected city and keeps exact city-component matches", async () => {
    global.fetch.mockResolvedValue(googleResponse({
      suggestions: [
        googlePrediction({ placeId: "address-1", city: "Bandra West", text: "Bandra West, Mumbai, Maharashtra, India" }),
        googlePrediction({ placeId: "address-2", city: "Bandra West", text: "Bandra West, Surat, Gujarat, India" }),
        googlePrediction({ placeId: "address-3", city: "Mumbai Central", text: "Mumbai Central, Maharashtra, India" }),
      ],
    }));

    const response = await request(app)
      .post("/api/system-users/city-address-suggestions")
      .send({ input: "Bandra West", cityName: "Mumbai", sessionToken });

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      success: true,
      data: { suggestions: [{ placeId: "address-1", address: "Bandra West, Mumbai, Maharashtra, India" }] },
    });
    expect(global.fetch).toHaveBeenCalledWith(
      "https://places.googleapis.com/v1/places:autocomplete",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ input: "Bandra West, Mumbai", sessionToken }),
      }),
    );
  });

  test.each([
    [{ input: "x", cityName: "Mumbai", sessionToken }],
    [{ input: "Bandra", cityName: "", sessionToken }],
    [{ input: "Bandra", cityName: "Mumbai", sessionToken: "invalid token" }],
  ])("rejects invalid request fields %#", async (payload) => {
    const response = await request(app).post("/api/system-users/city-address-suggestions").send(payload);

    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);
    expect(global.fetch).not.toHaveBeenCalled();
  });

  test("returns a generic upstream error when Google responds with a failure", async () => {
    global.fetch.mockResolvedValue(googleResponse({}, { ok: false, status: 403 }));

    const response = await request(app)
      .post("/api/system-users/city-address-suggestions")
      .send({ input: "Bandra", cityName: "Mumbai", sessionToken });

    expect(response.status).toBe(502);
    expect(response.body).toEqual({ success: false, message: "Google Places could not return address suggestions." });
  });
});
