const mongoose              = require("mongoose");
const Razorpay              = require("razorpay");
const EnquiryPlan           = require("../../admin/enquiryPlansManagement/model");
const PaymentTransaction    = require("../transactions/model");
const AdminWallet           = require("../../admin/adminWallet/model");
const UserCoinsWallet       = require("../userCoinsWallet/model");
const CoinsTransaction      = require("../coinsTransactions/model");
const EnquiryPurchasedPlan  = require("./model");

const razorpay = new Razorpay({
  key_id:     process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

const ROLE_USERTYPE_MAP = {
  [process.env.OWNER_ROLE_ID]:   "Owner",
  [process.env.BROKER_ROLE_ID]:  "Broker",
  [process.env.BUILDER_ROLE_ID]: "Builder",
};

// ── Get Active Enquiry Plans for the user's role ──────────────────────────────
const getActiveEnquiryPlans = async (req, res) => {
  try {
    const wantsUpgrade = req.query.userWantToUpgrade === "true";

    const filter = { isActive: true, roles: req.userRole };
    let plans = await EnquiryPlan.find(filter).select("-__v -roles -createdAt -updatedAt");

    if (wantsUpgrade) {
      const activePlan = await EnquiryPurchasedPlan.findOne({ user: req.user._id, status: "Active" });
      if (activePlan) {
        plans = plans.map((p) => ({
          ...p.toObject(),
          currentPlan: p._id.toString() === activePlan.plan.planId.toString(),
        }));
      }
    }

    // distinct expiryInDays sorted: -1 first, then ascending
    const allExpiryValues = plans.map((p) => (p.toObject ? p.toObject() : p).expiryInDays ?? p.expiryInDays);
    const distinctExpiry  = [...new Set(allExpiryValues)]
      .filter((v) => v != null)
      .sort((a, b) => {
        if (a === -1) return -1;
        if (b === -1) return 1;
        return a - b;
      });

    res.json({ success: true, data: plans, expiryTabs: distinctExpiry });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ── Create Razorpay Order for Enquiry Plan Purchase ───────────────────────────
const createEnquiryPlanOrder = async (req, res) => {
  try {
    const { planId } = req.body;
    if (!planId)
      return res.status(400).json({ success: false, message: "planId is required" });

    const userType = ROLE_USERTYPE_MAP[req.userRole];
    if (!userType)
      return res.status(403).json({ success: false, message: "Not authorized to purchase a plan" });

    const plan = await EnquiryPlan.findById(planId);
    if (!plan || !plan.isActive)
      return res.status(404).json({ success: false, message: "Plan not found or inactive" });

    if (!plan.amount || plan.amount <= 0)
      return res.status(400).json({ success: false, message: "This plan cannot be purchased online" });

    if (!plan.roles.includes(req.userRole))
      return res.status(403).json({ success: false, message: "This plan is not available for your role" });

    const existing = await EnquiryPurchasedPlan.findOne({ user: req.user._id, status: "Active" });
    if (existing)
      return res.status(400).json({ success: false, message: "You already have an active enquiry plan" });

    const razorpayOrder = await razorpay.orders.create({
      amount:   plan.amount * 100,
      currency: "INR",
      receipt:  `eq_${req.user._id.toString().slice(-8)}_${Date.now().toString().slice(-8)}`,
      notes: {
        userId:   req.user._id.toString(),
        userType,
        planId:   plan._id.toString(),
        type:     "enquiry",
      },
    });

    const adminWallet   = await AdminWallet.findOne();
    const balanceBefore = adminWallet?.currentBalance ?? 0;

    const transaction = await PaymentTransaction.create({
      user:            req.user._id,
      userType,
      reason:          "EnquiryPlanPurchase",
      razorpayOrderId: razorpayOrder.id,
      amount:          plan.amount,
      currency:        "INR",
      balanceBefore,
      balanceAfter:    balanceBefore + plan.amount,
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
          name:                   plan.name,
          numberOfEnquiriesGiven: plan.numberOfEnquiriesGiven,
          expiryInDays:           plan.expiryInDays,
          amount:                 plan.amount,
        },
      },
    });
  } catch (err) {
    console.error("createEnquiryPlanOrder error:", err);
    res.status(500).json({ success: false, message: err.message ?? err.error?.description ?? "Internal server error" });
  }
};

// ── Create Razorpay Order for Enquiry Plan Upgrade (Online) ───────────────────
const upgradeEnquiryPlanOrder = async (req, res) => {
  try {
    const { planId } = req.body;
    if (!planId)
      return res.status(400).json({ success: false, message: "planId is required" });

    const userType = ROLE_USERTYPE_MAP[req.userRole];
    if (!userType)
      return res.status(403).json({ success: false, message: "Not authorized to purchase a plan" });

    const activePlan = await EnquiryPurchasedPlan.findOne({ user: req.user._id, status: "Active" });
    if (!activePlan)
      return res.status(400).json({ success: false, message: "No active enquiry plan found to upgrade" });

    const plan = await EnquiryPlan.findById(planId);
    if (!plan || !plan.isActive)
      return res.status(404).json({ success: false, message: "Plan not found or inactive" });

    if (!plan.roles.includes(req.userRole))
      return res.status(403).json({ success: false, message: "This plan is not available for your role" });

    if (!plan.amount)
      return res.status(400).json({ success: false, message: "This plan cannot be purchased online" });

    if (activePlan.plan.planId.toString() === planId)
      return res.status(400).json({ success: false, message: "You already have this plan as your active plan" });

    const razorpayOrder = await razorpay.orders.create({
      amount:   plan.amount * 100,
      currency: "INR",
      receipt:  `eu_${req.user._id.toString().slice(-8)}_${Date.now().toString().slice(-8)}`,
      notes: {
        userId:        req.user._id.toString(),
        userType,
        planId:        plan._id.toString(),
        activePlanId:  activePlan._id.toString(),
        isUpgrade:     "true",
        type:          "enquiry",
      },
    });

    const adminWallet   = await AdminWallet.findOne();
    const balanceBefore = adminWallet?.currentBalance ?? 0;

    const transaction = await PaymentTransaction.create({
      user:            req.user._id,
      userType,
      reason:          "EnquiryPlanUpgrade",
      razorpayOrderId: razorpayOrder.id,
      amount:          plan.amount,
      currency:        "INR",
      balanceBefore,
      balanceAfter:    balanceBefore + plan.amount,
      status:          "Pending",
    });

    res.status(201).json({
      success: true,
      data: {
        orderId:       razorpayOrder.id,
        amount:        razorpayOrder.amount,
        currency:      razorpayOrder.currency,
        transactionId: transaction._id,
        activePlanId:  activePlan._id,
        plan: {
          name:                   plan.name,
          numberOfEnquiriesGiven: plan.numberOfEnquiriesGiven,
          expiryInDays:           plan.expiryInDays,
          amount:                 plan.amount,
        },
      },
    });
  } catch (err) {
    console.error("upgradeEnquiryPlanOrder error:", err);
    res.status(500).json({ success: false, message: err.message ?? err.error?.description ?? "Internal server error" });
  }
};

// ── Cancel Enquiry Plan Order ─────────────────────────────────────────────────
const cancelEnquiryPlanOrder = async (req, res) => {
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

// ── Purchase Enquiry Plan (Free or with Coins) ────────────────────────────────
const purchaseEnquiryPlan = async (req, res) => {
  try {
    const { planId } = req.body;
    if (!planId)
      return res.status(400).json({ success: false, message: "planId is required" });

    const userType = ROLE_USERTYPE_MAP[req.userRole];
    if (!userType)
      return res.status(403).json({ success: false, message: "Not authorized to purchase a plan" });

    const plan = await EnquiryPlan.findById(planId);
    if (!plan || !plan.isActive)
      return res.status(404).json({ success: false, message: "Plan not found or inactive" });

    if (!plan.roles.includes(req.userRole))
      return res.status(403).json({ success: false, message: "This plan is not available for your role" });

    const existing = await EnquiryPurchasedPlan.findOne({ user: req.user._id, status: "Active" });
    if (existing)
      return res.status(400).json({ success: false, message: "You already have an active enquiry plan" });

    const expiryDurationDays = plan.expiryInDays ?? 0;
    const startDate          = new Date();
    const expiryDate         = expiryDurationDays === -1
      ? null
      : new Date(new Date(startDate).setDate(startDate.getDate() + expiryDurationDays));

    const planSnapshot = {
      planId:                 plan._id,
      name:                   plan.name,
      numberOfEnquiriesGiven: plan.numberOfEnquiriesGiven,
      expiryInDays:           plan.expiryInDays,
      coins:                  plan.coins,
      amount:                 plan.amount,
    };

    // ── Free Plan ─────────────────────────────────────────────────────────────
    if (!plan.coins && !plan.amount) {
      const purchased = await EnquiryPurchasedPlan.create({
        user:               req.user._id,
        userType,
        plan:               planSnapshot,
        paymentMethod:      "Free",
        coinsPaid:          0,
        startDate,
        expiryDate,
        expiryDurationDays,
        status:             "Active",
      });
      return res.status(201).json({ success: true, data: purchased });
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

      const purchased = new EnquiryPurchasedPlan({
        user:               req.user._id,
        userType,
        plan:               planSnapshot,
        paymentMethod:      "Coins",
        coinsPaid:          plan.coins,
        startDate,
        expiryDate,
        expiryDurationDays,
        status:             "Active",
      });
      await purchased.save({ session });

      const coinsTxn = new CoinsTransaction({
        user:          req.user._id,
        userType,
        type:          "Debit",
        coins:         plan.coins,
        reason:        "EnquiryPlanPurchase",
        refId:         purchased._id,
        refModel:      "EnquiryPurchasedPlan",
        balanceBefore: userWallet.currentBalance + plan.coins,
        balanceAfter:  userWallet.currentBalance,
      });
      await coinsTxn.save({ session });

      await session.commitTransaction();
      res.status(201).json({ success: true, data: purchased });
    } catch (err) {
      await session.abortTransaction();
      throw err;
    } finally {
      session.endSession();
    }
  } catch (err) {
    console.error("purchaseEnquiryPlan error:", err);
    res.status(500).json({ success: false, message: err.message });
  }
};

// ── Upgrade Enquiry Plan (Free or with Coins) ─────────────────────────────────
const upgradeEnquiryPlan = async (req, res) => {
  try {
    const { planId } = req.body;
    if (!planId)
      return res.status(400).json({ success: false, message: "planId is required" });

    const userType = ROLE_USERTYPE_MAP[req.userRole];
    if (!userType)
      return res.status(403).json({ success: false, message: "Not authorized to purchase a plan" });

    const activePlan = await EnquiryPurchasedPlan.findOne({ user: req.user._id, status: "Active" });
    if (!activePlan)
      return res.status(400).json({ success: false, message: "No active enquiry plan found to upgrade" });

    if (activePlan.plan.planId.toString() === planId)
      return res.status(400).json({ success: false, message: "You already have this plan as your active plan" });

    const plan = await EnquiryPlan.findById(planId);
    if (!plan || !plan.isActive)
      return res.status(404).json({ success: false, message: "Plan not found or inactive" });

    if (!plan.roles.includes(req.userRole))
      return res.status(403).json({ success: false, message: "This plan is not available for your role" });

    const isFree = plan.coins === 0 && plan.amount === 0;

    const expiryDurationDays = plan.expiryInDays ?? 0;
    const startDate          = new Date();
    const expiryDate         = expiryDurationDays === -1
      ? null
      : new Date(new Date(startDate).setDate(startDate.getDate() + expiryDurationDays));

    const planSnapshot = {
      planId:                 plan._id,
      name:                   plan.name,
      numberOfEnquiriesGiven: plan.numberOfEnquiriesGiven,
      expiryInDays:           plan.expiryInDays,
      coins:                  plan.coins,
      amount:                 plan.amount,
    };

    // ── Free Plan ─────────────────────────────────────────────────────────────
    if (isFree) {
      const session = await mongoose.startSession();
      session.startTransaction();
      try {
        const newPlan = new EnquiryPurchasedPlan({
          user:               req.user._id,
          userType,
          plan:               planSnapshot,
          paymentMethod:      "Free",
          coinsPaid:          0,
          startDate,
          expiryDate,
          expiryDurationDays,
          status:             "Active",
        });
        await newPlan.save({ session });

        activePlan.status        = "Cancelled";
        activePlan.changedPlanTo = newPlan._id;
        await activePlan.save({ session });

        await session.commitTransaction();
        return res.status(201).json({ success: true, data: newPlan });
      } catch (err) {
        await session.abortTransaction();
        throw err;
      } finally {
        session.endSession();
      }
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

      const newPlan = new EnquiryPurchasedPlan({
        user:               req.user._id,
        userType,
        plan:               planSnapshot,
        paymentMethod:      "Coins",
        coinsPaid:          plan.coins,
        startDate,
        expiryDate,
        expiryDurationDays,
        status:             "Active",
      });
      await newPlan.save({ session });

      activePlan.status        = "Cancelled";
      activePlan.changedPlanTo = newPlan._id;
      await activePlan.save({ session });

      const coinsTxn = new CoinsTransaction({
        user:          req.user._id,
        userType,
        type:          "Debit",
        coins:         plan.coins,
        reason:        "EnquiryPlanUpgrade",
        refId:         newPlan._id,
        refModel:      "EnquiryPurchasedPlan",
        balanceBefore: userWallet.currentBalance + plan.coins,
        balanceAfter:  userWallet.currentBalance,
      });
      await coinsTxn.save({ session });

      await session.commitTransaction();
      res.status(201).json({ success: true, data: newPlan });
    } catch (err) {
      await session.abortTransaction();
      throw err;
    } finally {
      session.endSession();
    }
  } catch (err) {
    console.error("upgradeEnquiryPlan error:", err);
    res.status(500).json({ success: false, message: err.message });
  }
};

module.exports = {
  getActiveEnquiryPlans,
  createEnquiryPlanOrder,
  upgradeEnquiryPlanOrder,
  cancelEnquiryPlanOrder,
  purchaseEnquiryPlan,
  upgradeEnquiryPlan,
};
