const crypto             = require("crypto");
const mongoose           = require("mongoose");
const PaymentTransaction = require("../modules/mixed/transactions/model");
const CoinsTransaction   = require("../modules/mixed/coinsTransactions/model");
const AdminWallet        = require("../modules/admin/adminWallet/model");
const UserCoinsWallet    = require("../modules/mixed/userCoinsWallet/model");
const CoinsOffer         = require("../modules/admin/coinsOffersManagement/model");

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

    const { order_id, id: razorpayPaymentId, amount } = payment;

    // ── 3. Find the pending PaymentTransaction ────────────────────────────────
    const txn = await PaymentTransaction.findOne({ razorpayOrderId: order_id });
    if (!txn)
      return res.status(200).json({ success: true, message: "Transaction not found" });

    // idempotency — already processed
    if (txn.status === "Success")
      return res.status(200).json({ success: true, message: "Already processed" });

    const purchaseAmount = amount / 100; // paise → ₹

    // ── 4. Resolve coins from CoinsOffer if applicable ────────────────────────
    let coinsToCredit = purchaseAmount; // default: 1 coin = ₹1
    let offerSnapshot = null;

    const notes = payment.notes ?? {};
    if (notes.coinsOfferId) {
      const offer = await CoinsOffer.findById(notes.coinsOfferId);
      if (offer) {
        if (purchaseAmount !== offer.amount)
          throw new Error(`Amount mismatch: expected ${offer.amount}, got ${purchaseAmount}`);
        coinsToCredit = offer.coins;
        offerSnapshot = {
          offerId:     offer._id,
          name:        offer.name,
          description: offer.description,
          coins:       offer.coins,
          amount:      offer.amount,
        };
      }
    } else if (notes.coins) {
      if (purchaseAmount !== Number(notes.coins))
        throw new Error(`Amount mismatch: expected ${notes.coins}, got ${purchaseAmount}`);
      coinsToCredit = Number(notes.coins);
    }

    // ── 5. Run all DB writes in a MongoDB transaction ─────────────────────────
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      const adminWallet = await AdminWallet.findOneAndUpdate(
        {},
        {
          $inc: { currentBalance: purchaseAmount, totalCredited: purchaseAmount },
          $set: { lastCreditedAt: new Date(), lastCreditedAmount: purchaseAmount },
        },
        { new: true, upsert: true, session }
      );

      txn.razorpayPaymentId = razorpayPaymentId;
      txn.razorpaySignature = signature;
      txn.status            = "Success";
      txn.balanceBefore     = adminWallet.currentBalance - purchaseAmount;
      txn.balanceAfter      = adminWallet.currentBalance;
      await txn.save({ session });

      const userWallet = await UserCoinsWallet.findOneAndUpdate(
        { user: txn.user },
        {
          $inc:         { currentBalance: coinsToCredit, totalCreditedCoins: coinsToCredit },
          $setOnInsert: { userType: txn.userType },
        },
        { new: true, upsert: true, session }
      );

      await CoinsTransaction.create(
        [{
          user:          txn.user,
          userType:      txn.userType,
          type:          "Credit",
          coins:         coinsToCredit,
          reason:        "CoinsPurchase",
          refId:         txn._id,
          refModel:      "PaymentTransaction",
          coinsOffer:    offerSnapshot,
          balanceBefore: userWallet.currentBalance - coinsToCredit,
          balanceAfter:  userWallet.currentBalance,
        }],
        { session }
      );

      await session.commitTransaction();
    } catch (txnErr) {
      await session.abortTransaction();
      throw txnErr;
    } finally {
      session.endSession();
    }

    return res.status(200).json({ success: true });
  } catch (err) {
    console.error("Webhook error:", err);
    return res.status(500).json({ success: false, message: err.message });
  }
};

module.exports = { manageOnlinePayment };
