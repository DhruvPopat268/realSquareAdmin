const mongoose      = require("mongoose");
const Plan          = require("../../modules/admin/plansManagement/model");
const AdminWallet   = require("../../modules/admin/adminWallet/model");
const ListingPurchasedPlan = require("../../modules/mixed/purchasedPlans/model");
const { getTransactionTax } = require("../../modules/mixed/transactions/taxJurisdiction");
const { generateInvoice } = require("../../modules/mixed/transactions/generateInvoiceHelper");
const getUserDetailsSnapshot = require("../../modules/mixed/userDetailsSnapshot");

const handlePlanUpgrade = async (txn, payment, purchaseAmount, signature) => {
  if (purchaseAmount !== txn.amount)
    throw new Error(`Amount mismatch: expected ${txn.amount}, got ${purchaseAmount}`);

  const { planId, activePlanId } = payment.notes ?? {};
  if (!planId)       throw new Error("planId missing in payment notes");
  if (!activePlanId) throw new Error("activePlanId missing in payment notes");

  const [plan, currentPlan] = await Promise.all([
    Plan.findById(planId),
    ListingPurchasedPlan.findById(activePlanId),
  ]);

  if (!plan)        throw new Error(`Plan not found: ${planId}`);
  if (!currentPlan) throw new Error(`Active purchased plan not found: ${activePlanId}`);

  const { baseAmount, taxBreakdown } = await getTransactionTax(txn);

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

    const newPlan = new ListingPurchasedPlan({
      user:          txn.user,
      userType:      txn.userType,
      userDetails,
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
    await newPlan.save({ session });

    currentPlan.status             = "Cancelled";
    currentPlan.cancellationReason = "User upgraded plan";
    currentPlan.changedPlanTo      = newPlan._id;
    await currentPlan.save({ session });

    txn.razorpayPaymentId = payment.id;
    txn.razorpaySignature = signature;
    txn.status            = "Success";
    txn.refId             = newPlan._id;
    txn.refModel          = "ListingPlan";
    txn.baseAmount        = baseAmount;
    txn.taxBreakdown      = taxBreakdown;
    txn.balanceBefore     = adminWallet.currentBalance - purchaseAmount;
    txn.balanceAfter      = adminWallet.currentBalance;
    await txn.save({ session });

    await session.commitTransaction();
  } catch (err) {
    await session.abortTransaction();
    throw err;
  } finally {
    await session.endSession();
  }

  try {
    await generateInvoice(txn._id);
  } catch (invoiceError) {
    console.error("[handlePlanUpgrade] invoice generation failed for transaction", txn._id, invoiceError);
  }
};

module.exports = handlePlanUpgrade;
