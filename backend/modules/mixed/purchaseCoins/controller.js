const Razorpay           = require("razorpay");
const CoinsOffer         = require("../../admin/coinsOffersManagement/model");
const PaymentTransaction = require("../transactions/model");
const AdminWallet        = require("../../admin/adminWallet/model");

const razorpay = new Razorpay({
  key_id:     process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

const ROLE_USERTYPE_MAP = {
  [process.env.OWNER_ROLE_ID]:   "Owner",
  [process.env.BROKER_ROLE_ID]:  "Broker",
  [process.env.BUILDER_ROLE_ID]: "Builder",
};

// ── Create Razorpay Order for Coins Purchase ──────────────────────────────────
const createCoinsOrder = async (req, res) => {
  try {
    const { coinsOfferId, coins } = req.body;

    // resolve userType from role
    const userType = ROLE_USERTYPE_MAP[req.userRole];
    if (!userType)
      return res.status(403).json({ success: false, message: "Not authorized to purchase coins" });

    let purchaseCoins, purchaseAmount, offerDoc = null;

    if (coinsOfferId) {
      // offer-based purchase
      offerDoc = await CoinsOffer.findById(coinsOfferId);
      if (!offerDoc || !offerDoc.isActive)
        return res.status(404).json({ success: false, message: "Coins offer not found or inactive" });

      purchaseCoins  = offerDoc.coins;
      purchaseAmount = offerDoc.amount;
    } else {
      // direct purchase — only coins required, amount = coins (1 coin = ₹1)
      if (!coins)
        return res.status(400).json({ success: false, message: "coins is required for direct purchase" });

      purchaseCoins  = coins;
      purchaseAmount = coins;
    }

    // create razorpay order (amount in paise)
    const razorpayOrder = await razorpay.orders.create({
      amount:   purchaseAmount * 100,
      currency: "INR",
      receipt:  `c_${req.user._id.toString().slice(-8)}_${Date.now().toString().slice(-8)}`,
      notes: {
        userId:      req.user._id.toString(),
        userType,
        coinsOfferId: offerDoc?._id?.toString() ?? null,
        coins:        purchaseCoins,
      },
    });

    // fetch admin wallet balance for snapshot
    const adminWallet  = await AdminWallet.findOne();
    const balanceBefore = adminWallet?.currentBalance ?? 0;

    // create paymentTransaction with Pending status
    const transaction = await PaymentTransaction.create({
      user:            req.user._id,
      userType,
      reason:          "CoinsPurchase",
      razorpayOrderId: razorpayOrder.id,
      amount:          purchaseAmount,
      currency:        "INR",
      balanceBefore,
      balanceAfter:    balanceBefore + purchaseAmount,
      status:          "Pending",
    });

    res.status(201).json({
      success: true,
      data: {
        orderId:       razorpayOrder.id,
        amount:        razorpayOrder.amount,
        currency:      razorpayOrder.currency,
        transactionId: transaction._id,
        coins:         purchaseCoins,
        offer: offerDoc ? {
          name:   offerDoc.name,
          coins:  offerDoc.coins,
          amount: offerDoc.amount,
        } : null,
      },
    });
  } catch (err) {
    console.error("createCoinsOrder error:", err);
    res.status(500).json({ success: false, message: err.message ?? err.error?.description ?? "Internal server error" });
  }
};

// ── Cancel Coins Order ──────────────────────────────────────────────────────────
const cancelCoinsOrder = async (req, res) => {
  try {
    const transaction = await PaymentTransaction.findById(req.params.transactionId);
    if (!transaction)
      return res.status(404).json({ success: false, message: "Transaction not found" });

    if (transaction.status === "Success")
      return res.json({ success: true, message: "Payment already completed" });

    transaction.status        = "Failed";
    transaction.failureReason = "Cancelled by user";
    await transaction.save();

    res.json({ success: true, message: "Transaction marked as failed" });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

module.exports = { createCoinsOrder, cancelCoinsOrder };
