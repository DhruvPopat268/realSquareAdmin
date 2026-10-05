const mongoose             = require("mongoose");
const EnquiryPlan          = require("../../modules/admin/enquiryPlansManagement/model");
const AdminWallet          = require("../../modules/admin/adminWallet/model");
const EnquiryPurchasedPlan = require("../../modules/mixed/enquiryPurchasedPlans/model");
const getUserDetailsSnapshot = require("../../modules/mixed/userDetailsSnapshot");

const handleEnquiryPlanUpgrade = async (txn, payment, purchaseAmount, signature) => {
  if (purchaseAmount !== txn.amount)
    throw new Error(`Amount mismatch: expected ${txn.amount}, got ${purchaseAmount}`);

  const { planId, activePlanId } = payment.notes ?? {};
  if (!planId)       throw new Error("planId missing in payment notes");
  if (!activePlanId) throw new Error("activePlanId missing in payment notes");

  const [plan, currentPlan] = await Promise.all([
    EnquiryPlan.findById(planId),
    EnquiryPurchasedPlan.findById(activePlanId),
  ]);

  if (!plan)        throw new Error(`Enquiry plan not found: ${planId}`);
  if (!currentPlan) throw new Error(`Active enquiry purchased plan not found: ${activePlanId}`);

  const expiryDurationDays = plan.expiryInDays ?? 0;
  const startDate          = new Date();
  const expiryDate         = expiryDurationDays === -1
    ? null
    : new Date(new Date(startDate).setDate(startDate.getDate() + expiryDurationDays));

  const userDetails = await getUserDetailsSnapshot(txn.userDetails || txn.user);
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

    const newPlan = new EnquiryPurchasedPlan({
      user:     txn.user,
      userType: txn.userType,
      userDetails,
      plan: {
        planId:                 plan._id,
        name:                   plan.name,
        numberOfEnquiriesGiven: plan.numberOfEnquiriesGiven,
        expiryInDays:           plan.expiryInDays,
        coins:                  plan.coins,
        amount:                 plan.amount,
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
    await newPlan.save({ session });

    // cancel old plan and point to new one
    currentPlan.status        = "Cancelled";
    currentPlan.changedPlanTo = newPlan._id;
    await currentPlan.save({ session });

    txn.razorpayPaymentId = payment.id;
    txn.razorpaySignature = signature;
    txn.status            = "Success";
    txn.refId             = newPlan._id;
    txn.refModel          = "EnquiryPlan";
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

module.exports = handleEnquiryPlanUpgrade;
