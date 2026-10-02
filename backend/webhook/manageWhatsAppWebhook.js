const crypto = require("crypto");
const mongoose = require("mongoose");
const { Inquiry } = require("../modules/mixed/inquiries/model");

const normalizePhone = (value) => {
  let digits = String(value ?? "").replace(/\D/g, "");
  if (digits.length === 11 && digits.startsWith("0")) digits = digits.slice(1);
  if (digits.length === 10) return `91${digits}`;
  if (digits.length === 12 && digits.startsWith("91")) return digits;
  return digits;
};

const verifyWhatsAppWebhook = (req, res) => {
  const mode = req.query["hub.mode"];
  const token = req.query["hub.verify_token"];
  const challenge = req.query["hub.challenge"];
  const expectedToken = process.env.WHATSAPP_WEBHOOK_SECRET
    || process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN;

  if (!expectedToken) {
    console.error("[WhatsApp Webhook] WHATSAPP_WEBHOOK_SECRET is not configured");
    return res.status(500).send("Webhook verification is not configured");
  }

  if (mode === "subscribe" && token === expectedToken && challenge) {
    console.info("[WhatsApp Webhook] Meta callback URL verification succeeded");
    return res.status(200).type("text/plain").send(challenge);
  }

  console.warn("[WhatsApp Webhook] Meta callback URL verification was rejected");
  return res.sendStatus(403);
};

const isValidSignature = (rawBody, signature, appSecret) => {
  if (!Buffer.isBuffer(rawBody) || !signature || !appSecret) return false;
  const expected = `sha256=${crypto.createHmac("sha256", appSecret).update(rawBody).digest("hex")}`;
  const receivedBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expected);
  return receivedBuffer.length === expectedBuffer.length
    && crypto.timingSafeEqual(receivedBuffer, expectedBuffer);
};

const getQuickReply = (message) => {
  if (message?.type === "button") {
    return { payload: message.button?.payload, label: message.button?.text };
  }
  if (message?.type === "interactive" && message.interactive?.type === "button_reply") {
    return {
      payload: message.interactive.button_reply.id,
      label: message.interactive.button_reply.title,
    };
  }
  return null;
};

const processQuickReply = async (message) => {
  const reply = getQuickReply(message);
  const match = reply?.payload?.match(/^inquiry_(confirm|reject):([a-f\d]{24})$/i);
  if (!match) return "ignored";

  const [, action, inquiryId] = match;
  const sender = normalizePhone(message.from);
  if (!sender || !mongoose.isValidObjectId(inquiryId)) {
    console.warn("[WhatsApp Webhook] Ignored a reply with invalid sender or inquiry ID");
    return "ignored";
  }

  const inquiry = await Inquiry.findById(inquiryId).select("createdBy whatsappResponse").lean();
  if (!inquiry) {
    console.warn(`[WhatsApp Webhook] Inquiry ${inquiryId} from a reply was not found`);
    return "ignored";
  }

  if (normalizePhone(inquiry.createdBy?.mobile) !== sender) {
    console.warn(`[WhatsApp Webhook] Rejected reply from an unexpected number for inquiry ${inquiryId}`);
    return "ignored";
  }

  if (message.id && inquiry.whatsappResponse?.messageId === message.id) {
    console.info(`[WhatsApp Webhook] Duplicate reply ${message.id} ignored for inquiry ${inquiryId}`);
    return "duplicate";
  }

  const status = action === "confirm" ? "confirmed" : "rejected";
  await Inquiry.findByIdAndUpdate(inquiryId, {
    $set: {
      "whatsappResponse.status": status,
      "whatsappResponse.respondedAt": new Date(Number(message.timestamp) * 1000 || Date.now()),
      "whatsappResponse.messageId": message.id,
      "whatsappResponse.from": sender,
      "verifiedByUser.isVerified": status === "confirmed",
      ...(status === "confirmed" ? { "verifiedByUser.source": "whatsapp" } : {}),
    },
    ...(status === "rejected" ? { $unset: { "verifiedByUser.source": 1 } } : {}),
  });

  console.info(`[WhatsApp Webhook] Inquiry ${inquiryId} response recorded: ${status}`);
  return "processed";
};

const receiveWhatsAppWebhook = async (req, res) => {
  const appSecret = process.env.WHATSAPP_APP_SECRET;
  if (!appSecret) {
    console.error("[WhatsApp Webhook] WHATSAPP_APP_SECRET is not configured");
    return res.sendStatus(500);
  }
  if (!isValidSignature(req.body, req.headers["x-hub-signature-256"], appSecret)) {
    console.warn("[WhatsApp Webhook] Rejected request with an invalid signature");
    return res.sendStatus(401);
  }

  let event;
  try {
    event = JSON.parse(req.body.toString("utf8"));
  } catch (error) {
    console.error("[WhatsApp Webhook] Could not parse the signed request body:", error.message);
    return res.sendStatus(400);
  }

  console.log("[WhatsApp Webhook] Received payload:", JSON.stringify(event, null, 2));

  if (event.object !== "whatsapp_business_account") {
    return res.sendStatus(404);
  }

  try {
    let processed = 0;
    let ignored = 0;
    for (const entry of event.entry ?? []) {
      for (const change of entry.changes ?? []) {
        for (const message of change.value?.messages ?? []) {
          const result = await processQuickReply(message);
          if (result === "processed") processed += 1;
          else ignored += 1;
        }
      }
    }
    console.info(`[WhatsApp Webhook] Event handled: ${processed} reply/replies recorded, ${ignored} ignored`);
    return res.sendStatus(200);
  } catch (error) {
    console.error("[WhatsApp Webhook] Failed to process callback:", error.message);
    return res.sendStatus(500);
  }
};

module.exports = {
  verifyWhatsAppWebhook,
  receiveWhatsAppWebhook,
  isValidSignature,
  getQuickReply,
  processQuickReply,
};
