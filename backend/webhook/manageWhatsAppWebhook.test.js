const crypto = require("crypto");

jest.mock("../modules/mixed/inquiries/model", () => ({
  Inquiry: {
    findById: jest.fn(),
    findByIdAndUpdate: jest.fn(),
  },
}));

const { Inquiry } = require("../modules/mixed/inquiries/model");
const {
  getQuickReply,
  isValidSignature,
  processQuickReply,
  verifyWhatsAppWebhook,
} = require("./manageWhatsAppWebhook");

const INQUIRY_ID = "6a0000000000000000000001";
const MESSAGE_ID = "wamid.test-message-001";

const mockInquiryFind = (inquiry) => {
  Inquiry.findById.mockReturnValue({
    select: () => ({ lean: async () => inquiry }),
  });
};

describe("WhatsApp reply webhook helpers", () => {
  beforeEach(() => jest.clearAllMocks());

  test("verifies Meta's callback URL using WHATSAPP_WEBHOOK_SECRET", () => {
    process.env.WHATSAPP_WEBHOOK_SECRET = "test-verify-token";
    const res = {
      status: jest.fn().mockReturnThis(),
      type: jest.fn().mockReturnThis(),
      send: jest.fn(),
    };

    verifyWhatsAppWebhook({
      query: {
        "hub.mode": "subscribe",
        "hub.verify_token": "test-verify-token",
        "hub.challenge": "challenge-value",
      },
    }, res);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.type).toHaveBeenCalledWith("text/plain");
    expect(res.send).toHaveBeenCalledWith("challenge-value");
  });

  test("accepts Meta's signed raw request body only when signature matches", () => {
    const rawBody = Buffer.from('{"object":"whatsapp_business_account"}');
    const appSecret = "test-app-secret";
    const signature = `sha256=${crypto.createHmac("sha256", appSecret).update(rawBody).digest("hex")}`;

    expect(isValidSignature(rawBody, signature, appSecret)).toBe(true);
    expect(isValidSignature(rawBody, "sha256=invalid", appSecret)).toBe(false);
  });

  test("extracts a Confirm quick reply payload", () => {
    expect(getQuickReply({
      type: "button",
      button: { text: "Confirm", payload: `inquiry_confirm:${INQUIRY_ID}` },
    })).toEqual({ payload: `inquiry_confirm:${INQUIRY_ID}`, label: "Confirm" });
  });

  test("records confirmation from the inquiry creator and marks it verified", async () => {
    mockInquiryFind({
      _id: INQUIRY_ID,
      createdBy: { mobile: "9157193754" },
    });
    Inquiry.findByIdAndUpdate.mockResolvedValue({});

    const result = await processQuickReply({
      id: MESSAGE_ID,
      from: "919157193754",
      timestamp: "1790752396",
      type: "button",
      button: { text: "Confirm", payload: `inquiry_confirm:${INQUIRY_ID}` },
    });

    expect(result).toBe("processed");
    expect(Inquiry.findByIdAndUpdate).toHaveBeenCalledWith(INQUIRY_ID, {
      $set: expect.objectContaining({
        "whatsappResponse.status": "confirmed",
        "whatsappResponse.messageId": MESSAGE_ID,
        "whatsappResponse.from": "919157193754",
        "verifiedByUser.isVerified": true,
        "verifiedByUser.source": "whatsapp",
      }),
    });
  });

  test("records a Reject response without marking the inquiry verified", async () => {
    mockInquiryFind({ _id: INQUIRY_ID, createdBy: { mobile: "919157193754" } });
    Inquiry.findByIdAndUpdate.mockResolvedValue({});

    const result = await processQuickReply({
      id: MESSAGE_ID,
      from: "919157193754",
      type: "button",
      button: { text: "Reject", payload: `inquiry_reject:${INQUIRY_ID}` },
    });

    expect(result).toBe("processed");
    const update = Inquiry.findByIdAndUpdate.mock.calls[0][1].$set;
    expect(update["whatsappResponse.status"]).toBe("rejected");
    expect(update.status).toBe("rejected");
    expect(update["verifiedByUser.isVerified"]).toBe(false);
    expect(Inquiry.findByIdAndUpdate.mock.calls[0][1].$unset).toEqual({ "verifiedByUser.source": 1 });
  });

  test("ignores a reply if the sender does not match the inquiry creator", async () => {
    mockInquiryFind({ _id: INQUIRY_ID, createdBy: { mobile: "9157193754" } });

    const result = await processQuickReply({
      id: MESSAGE_ID,
      from: "919999999999",
      type: "button",
      button: { text: "Confirm", payload: `inquiry_confirm:${INQUIRY_ID}` },
    });

    expect(result).toBe("ignored");
    expect(Inquiry.findByIdAndUpdate).not.toHaveBeenCalled();
  });
});
