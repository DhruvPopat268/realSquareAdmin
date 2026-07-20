const crypto             = require("crypto");
const PaymentTransaction = require("../modules/mixed/transactions/model");

const handlers = {
  CoinsPurchase: require("./helpers/handleCoinsPurchase"),
  PlanPurchase:  require("./helpers/handlePlanPurchase"),
  PlanUpgrade:   require("./helpers/handlePlanUpgrade"),
};

const manageOnlinePayment = async (req, res) => {
  try {
    // ── 1. Verify Razorpay webhook signature ─────────────────────────────────
    const signature = req.headers["x-razorpay-signature"];
    const expected  = crypto
      .createHmac("sha256", process.env.RAZORPAY_WEBHOOK_SECRET)
      .update(req.body) // raw buffer
      .digest("hex");

    if (signature !== expected)
      return res.status(400).json({ success: false, message: "Invalid signature" });

    const event   = JSON.parse(req.body.toString());
    console.log("[Webhook] Event received:", JSON.stringify(event, null, 2));
    const payment = event.payload?.payment?.entity;

    // ── 2. Only handle captured payments ─────────────────────────────────────
    if (event.event !== "payment.captured" || !payment)
      return res.status(200).json({ success: true });

    const { order_id, amount } = payment;

    // ── 3. Find the pending PaymentTransaction ────────────────────────────────
    const txn = await PaymentTransaction.findOne({ razorpayOrderId: order_id });
    if (!txn)
      return res.status(200).json({ success: true, message: "Transaction not found" });

    // idempotency — already processed
    if (txn.status === "Success")
      return res.status(200).json({ success: true, message: "Already processed" });

    const purchaseAmount = amount / 100; // paise → ₹

    // ── 4. Route to the appropriate handler based on txn.reason ──────────────
    const handler = handlers[txn.reason];
    if (!handler)
      return res.status(200).json({ success: true, message: `No handler for reason: ${txn.reason}` });

    await handler(txn, payment, purchaseAmount, signature);

    return res.status(200).json({ success: true });
  } catch (err) {
    console.error("Webhook error:", err);
    return res.status(500).json({ success: false, message: err.message });
  }
};

module.exports = { manageOnlinePayment };
