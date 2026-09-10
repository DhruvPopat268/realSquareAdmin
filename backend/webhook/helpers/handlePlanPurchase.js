const mongoose       = require("mongoose");
const Plan           = require("../../modules/admin/plansManagement/model");
const AdminWallet    = require("../../modules/admin/adminWallet/model");
const ListingPurchasedPlan  = require("../../modules/mixed/purchasedPlans/model");

const handlePlanPurchase = async (txn, payment, purchaseAmount, signature) => {
  if (purchaseAmount !== txn.amount)
    throw new Error(`Amount mismatch: expected ${txn.amount}, got ${purchaseAmount}`);

  const planId = payment.notes?.planId;
  if (!planId) throw new Error("planId missing in payment notes");

  const plan = await Plan.findById(planId);
  if (!plan) throw new Error(`Plan not found: ${planId}`);

  const expiryDurationDays = plan.expiryInDays ?? 0;
  const startDate          = new Date();
  const expiryDate         = expiryDurationDays === -1
    ? null
    : new Date(new Date(startDate).setDate(startDate.getDate() + expiryDurationDays));

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

    const purchasedPlan = new ListingPurchasedPlan({
      user:          txn.user,
      userType:      txn.userType,
      plan: {
        planId:                  plan._id,
        name:                    plan.name,
        numberOfPropertiesGiven: plan.numberOfPropertiesGiven,
        expiryInDays:            plan.expiryInDays,
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
    txn.refModel          = "ListingPlan";
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
