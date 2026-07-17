const mongoose           = require("mongoose");
const Razorpay           = require("razorpay");
const Plan               = require("../../admin/plansManagement/model");
const PaymentTransaction = require("../transactions/model");
const AdminWallet        = require("../../admin/adminWallet/model");
const UserCoinsWallet    = require("../userCoinsWallet/model");
const CoinsTransaction   = require("../coinsTransactions/model");
const PurchasedPlan      = require("./model");

const razorpay = new Razorpay({
  key_id:     process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

const ROLE_USERTYPE_MAP = {
  [process.env.OWNER_ROLE_ID]:   "Owner",
  [process.env.BROKER_ROLE_ID]:  "Broker",
  [process.env.BUILDER_ROLE_ID]: "Builder",
};

// ── Create Razorpay Order for Plan Purchase ───────────────────────────────────
const createPlanOrder = async (req, res) => {
  try {
    const { planId } = req.body;
    if (!planId)
      return res.status(400).json({ success: false, message: "planId is required" });

    const userType = ROLE_USERTYPE_MAP[req.userRole];
    if (!userType)
      return res.status(403).json({ success: false, message: "Not authorized to purchase a plan" });

    const plan = await Plan.findById(planId);
    if (!plan || !plan.isActive)
      return res.status(404).json({ success: false, message: "Plan not found or inactive" });

    if (plan.planType !== "Paid")
      return res.status(400).json({ success: false, message: "Only paid plans require an order" });

    if (!plan.roles.includes(req.userRole))
      return res.status(403).json({ success: false, message: "This plan is not available for your role" });

    if (!plan.amount)
      return res.status(400).json({ success: false, message: "This plan cannot be purchased online" });

    const existingActivePlan = await PurchasedPlan.findOne({ user: req.user._id, status: "Active" });
    if (existingActivePlan)
      return res.status(400).json({ success: false, message: "You already have an active plan" });

    const purchaseAmount = plan.amount;

    // create razorpay order (amount in paise)
    const razorpayOrder = await razorpay.orders.create({
      amount:   purchaseAmount * 100,
      currency: "INR",
      receipt:  `p_${req.user._id.toString().slice(-8)}_${Date.now().toString().slice(-8)}`,
      notes: {
        userId:   req.user._id.toString(),
        userType,
        planId:   plan._id.toString(),
      },
    });

    // fetch admin wallet balance for snapshot
    const adminWallet   = await AdminWallet.findOne();
    const balanceBefore = adminWallet?.currentBalance ?? 0;

    // create paymentTransaction with Pending status
    const transaction = await PaymentTransaction.create({
      user:            req.user._id,
      userType,
      reason:          "PlanPurchase",
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
        plan: {
          name:                    plan.name,
          planType:                plan.planType,
          numberOfPropertiesGiven: plan.numberOfPropertiesGiven,
          expiryType:              plan.expiryType,
          leadsPerDay:             plan.leadsPerDay,
          amount:                  plan.amount,
        },
      },
    });
  } catch (err) {
    console.error("createPlanOrder error:", err);
    res.status(500).json({ success: false, message: err.message ?? err.error?.description ?? "Internal server error" });
  }
};

// ── Cancel Plan Order ─────────────────────────────────────────────────────────
const cancelPlanOrder = async (req, res) => {
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

// ── Get Active Plans for the user's role ─────────────────────────────────────
const getActivePlans = async (req, res) => {
  try {
    const plans = await Plan.find({ isActive: true, roles: req.userRole }).select("-__v -roles -createdAt -updatedAt");
    res.json({ success: true, data: plans });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ── Purchase Plan (Free or with Coins) ───────────────────────────────────────
const purchasePlan = async (req, res) => {
  try {
    const { planId } = req.body;
    if (!planId)
      return res.status(400).json({ success: false, message: "planId is required" });

    const userType = ROLE_USERTYPE_MAP[req.userRole];
    if (!userType)
      return res.status(403).json({ success: false, message: "Not authorized to purchase a plan" });

    const plan = await Plan.findById(planId);
    if (!plan || !plan.isActive)
      return res.status(404).json({ success: false, message: "Plan not found or inactive" });

    if (!plan.roles.includes(req.userRole))
      return res.status(403).json({ success: false, message: "This plan is not available for your role" });

    const existingActivePlan = await PurchasedPlan.findOne({ user: req.user._id, status: "Active" });
    if (existingActivePlan)
      return res.status(400).json({ success: false, message: "You already have an active plan" });

    const expiryDurationDays = Number(process.env[`${plan.expiryType?.toUpperCase()}_PLAN_EXPIRY_DAYS`]);
    const startDate          = new Date();
    const expiryDate         = new Date(startDate);
    expiryDate.setDate(expiryDate.getDate() + expiryDurationDays);

    const planSnapshot = {
      planId:                  plan._id,
      name:                    plan.name,
      planType:                plan.planType,
      numberOfPropertiesGiven: plan.numberOfPropertiesGiven,
      expiryType:              plan.expiryType,
      leadsPerDay:             plan.leadsPerDay,
      coins:                   plan.coins,
      amount:                  plan.amount,
    };

    // ── Free Plan ─────────────────────────────────────────────────────────────
    if (plan.planType === "Free") {
      const purchasedPlan = await PurchasedPlan.create({
        user:          req.user._id,
        userType,
        plan:          planSnapshot,
        paymentMethod: "Coins",
        coinsPaid:     0,
        startDate,
        expiryDate,
        expiryDurationDays,
        status:        "Active",
      });
      return res.status(201).json({ success: true, data: purchasedPlan });
    }

    // ── Paid Plan (Coins) ─────────────────────────────────────────────────────
    if (!plan.coins)
      return res.status(400).json({ success: false, message: "This plan cannot be purchased with coins" });

    const userWallet = await UserCoinsWallet.findOne({ user: req.user._id });
    if (!userWallet || userWallet.currentBalance < plan.coins)
      return res.status(400).json({ success: false, message: "Insufficient coins balance" });

    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      userWallet.currentBalance    -= plan.coins;
      userWallet.totalDebitedCoins += plan.coins;
      await userWallet.save({ session });

      const purchasedPlan = new PurchasedPlan({
        user:          req.user._id,
        userType,
        plan:          planSnapshot,
        paymentMethod: "Coins",
        coinsPaid:     plan.coins,
        startDate,
        expiryDate,
        expiryDurationDays,
        status:        "Active",
      });
      await purchasedPlan.save({ session });

      const coinsTxn = new CoinsTransaction({
        user:          req.user._id,
        userType,
        type:          "Debit",
        coins:         plan.coins,
        reason:        "PlanPurchase",
        refId:         purchasedPlan._id,
        refModel:      "PurchasedPlan",
        balanceBefore: userWallet.currentBalance + plan.coins,
        balanceAfter:  userWallet.currentBalance,
      });
      await coinsTxn.save({ session });

      await session.commitTransaction();
      res.status(201).json({ success: true, data: purchasedPlan });
    } catch (err) {
      await session.abortTransaction();
      throw err;
    } finally {
      session.endSession();
    }
  } catch (err) {
    console.error("purchasePlan error:", err);
    res.status(500).json({ success: false, message: err.message });
  }
};

module.exports = { createPlanOrder, cancelPlanOrder, getActivePlans, purchasePlan };