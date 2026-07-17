const mongoose       = require("mongoose");
const Plan           = require("../../modules/admin/plansManagement/model");
const AdminWallet    = require("../../modules/admin/adminWallet/model");
const PurchasedPlan  = require("../../modules/mixed/purchasedPlans/model");

const EXPIRY_DAYS = {
  Weekly:  Number(process.env.WEEKLY_PLAN_EXPIRY_DAYS),
  Monthly: Number(process.env.MONTHLY_PLAN_EXPIRY_DAYS),
  Yearly:  Number(process.env.YEARLY_PLAN_EXPIRY_DAYS),
};

const handlePlanPurchase = async (txn, payment, purchaseAmount, signature) => {
  // ── Amount integrity check ────────────────────────────────────────────────
  if (purchaseAmount !== txn.amount)
    throw new Error(`Amount mismatch: expected ${txn.amount}, got ${purchaseAmount}`);

  // ── Fetch plan for snapshot and expiry calculation ────────────────────────
  const planId = payment.notes?.planId;
  if (!planId) throw new Error("planId missing in payment notes");

  const plan = await Plan.findById(planId);
  if (!plan) throw new Error(`Plan not found: ${planId}`);

  const expiryDurationDays = EXPIRY_DAYS[plan.expiryType];
  const startDate          = new Date();
  const expiryDate         = new Date(startDate);
  expiryDate.setDate(expiryDate.getDate() + expiryDurationDays);

  // ── MongoDB transaction ───────────────────────────────────────────────────
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

    const purchasedPlan = new PurchasedPlan({
      user:          txn.user,
      userType:      txn.userType,
      plan: {
        planId:                  plan._id,
        name:                    plan.name,
        planType:                plan.planType,
        numberOfPropertiesGiven: plan.numberOfPropertiesGiven,
        expiryType:              plan.expiryType,
        leadsPerDay:             plan.leadsPerDay,
        coins:                   plan.coins,
        amount:                  plan.amount,
      },
      paymentMethod:    "Online",
      transactionId:    txn._id,
      transactionModel: "PaymentTransaction",
      amountPaid:       purchaseAmount,
      startDate,
      expiryDate,
      expiryDurationDays,
      status:           "Active",
    });
    await purchasedPlan.save({ session });

    txn.razorpayPaymentId = payment.id;
    txn.razorpaySignature = signature;
    txn.status            = "Success";
    txn.refId             = purchasedPlan._id;
    txn.refModel          = "Plan";
    txn.balanceBefore     = adminWallet.currentBalance - purchaseAmount;
    txn.balanceAfter      = adminWallet.currentBalance;
    await txn.save({ session });

    await session.commitTransaction();
  } catch (err) {
    await session.abortTransaction();
    throw err;
  } finally {
    session.endSession();
  }
};

module.exports = handlePlanPurchase;
