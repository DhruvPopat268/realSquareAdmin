const mongoose             = require("mongoose");
const EnquiryPlan          = require("../../modules/admin/enquiryPlansManagement/model");
const AdminWallet          = require("../../modules/admin/adminWallet/model");
const EnquiryPurchasedPlan = require("../../modules/mixed/enquiryPurchasedPlans/model");
const getUserDetailsSnapshot = require("../../modules/mixed/userDetailsSnapshot");

const handleEnquiryPlanPurchase = async (txn, payment, purchaseAmount, signature) => {
  if (purchaseAmount !== txn.amount)
    throw new Error(`Amount mismatch: expected ${txn.amount}, got ${purchaseAmount}`);

  const planId = payment.notes?.planId;
  if (!planId) throw new Error("planId missing in payment notes");

  const plan = await EnquiryPlan.findById(planId);
  if (!plan) throw new Error(`Enquiry plan not found: ${planId}`);

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

    const purchased = new EnquiryPurchasedPlan({
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
    await purchased.save({ session });

    txn.razorpayPaymentId = payment.id;
    txn.razorpaySignature = signature;
    txn.status            = "Success";
    txn.refId             = purchased._id;
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

module.exports = handleEnquiryPlanPurchase;
