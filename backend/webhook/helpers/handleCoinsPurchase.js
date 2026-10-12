const mongoose        = require("mongoose");
const CoinsOffer      = require("../../modules/admin/coinsOffersManagement/model");
const AdminWallet     = require("../../modules/admin/adminWallet/model");
const UserCoinsWallet = require("../../modules/mixed/userCoinsWallet/model");
const CoinsTransaction = require("../../modules/mixed/coinsTransactions/model");
const GstConfig       = require("../../modules/admin/gstConfig/model");
const getUserDetailsSnapshot = require("../../modules/mixed/userDetailsSnapshot");

const handleCoinsPurchase = async (txn, payment, purchaseAmount, signature) => {
  // amount integrity — compare against our own transaction record
  if (purchaseAmount !== txn.amount)
    throw new Error(`Amount mismatch: expected ${txn.amount}, got ${purchaseAmount}`);

  // ── Resolve coins to credit ───────────────────────────────────────────────
  let coinsToCredit = purchaseAmount; // default: 1 coin = ₹1
  let offerSnapshot = null;

  const notes = payment.notes ?? {};
  if (notes.coinsOfferId) {
    const offer = await CoinsOffer.findById(notes.coinsOfferId);
    if (offer) {
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
    coinsToCredit = Number(notes.coins);
  }

  // ── Tax breakdown ─────────────────────────────────────────────────────────
  const gstConfig  = await GstConfig.findOne().lean();
  const cgst       = gstConfig?.cgst      ?? 0;
  const sgst       = gstConfig?.sgst      ?? 0;
  const igst       = gstConfig?.igst      ?? 0;
  const taxRate    = igst > 0 ? igst : (cgst + sgst);
  const taxAmount  = parseFloat(((txn.amount * taxRate) / (100 + taxRate)).toFixed(2));
  const baseAmount = parseFloat((txn.amount - taxAmount).toFixed(2));

  // ── MongoDB transaction ───────────────────────────────────────────────────
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const userDetails = await getUserDetailsSnapshot(txn.userDetails || txn.user);
    const adminWallet = await AdminWallet.findOneAndUpdate(
      {},
      {
        $inc: { currentBalance: purchaseAmount, totalCredited: purchaseAmount },
        $set: { lastCreditedAt: new Date(), lastCreditedAmount: purchaseAmount },
      },
      { new: true, upsert: true, session }
    );

    txn.razorpayPaymentId = payment.id;
    txn.razorpaySignature = signature;
    txn.status            = "Success";
    txn.baseAmount        = baseAmount;
    txn.taxBreakdown      = { cgst, sgst, igst, taxAmount };
    txn.balanceBefore     = adminWallet.currentBalance - purchaseAmount;
    txn.balanceAfter      = adminWallet.currentBalance;
    await txn.save({ session });

    const userWallet = await UserCoinsWallet.findOneAndUpdate(
      { user: txn.user },
      {
        $inc:         { currentBalance: coinsToCredit, totalCreditedCoins: coinsToCredit },
        $setOnInsert: { userType: txn.userType, userDetails },
      },
      { new: true, upsert: true, session }
    );

    const coinsTxn = new CoinsTransaction({
      user:          txn.user,
      userType:      txn.userType,
      userDetails,
      type:          "Credit",
      coins:         coinsToCredit,
      reason:        "CoinsPurchase",
      refId:         txn._id,
      refModel:      "PaymentTransaction",
      coinsOffer:    offerSnapshot,
      balanceBefore: userWallet.currentBalance - coinsToCredit,
      balanceAfter:  userWallet.currentBalance,
    });
    await coinsTxn.save({ session });

    await session.commitTransaction();
  } catch (err) {
    await session.abortTransaction();
    throw err;
  } finally {
    session.endSession();
  }
};

module.exports = handleCoinsPurchase;
