const mongoose = require("mongoose");

const coinsTransactionSchema = new mongoose.Schema(
  {
    user:        { type: mongoose.Schema.Types.ObjectId, ref: "SystemUser", required: true },
    userType:    { type: String, enum: ["Owner", "Broker", "Builder"], required: true },
    type:        { type: String, enum: ["Credit", "Debit"], required: true },
    coins:       { type: Number, required: true },
    reason:      {
      type: String,
      enum: ["PlanPurchase", "CoinsPurchase", "Refund", "AdminCredit", "AdminDebit"],
      required: true,
    },
    // reference to the related document (purchasedPlan or transaction)
    refId:       { type: mongoose.Schema.Types.ObjectId, refPath: "refModel" },
    refModel:    { type: String, enum: ["PurchasedPlan", "PaymentTransaction"] },
    // snapshot of the coins offer used at purchase time (if any)
    coinsOffer:  {
      offerId:     { type: mongoose.Schema.Types.ObjectId, ref: "CoinsOffer" },
      name:        { type: String },
      description: { type: String },
      coins:       { type: Number },
      amount:      { type: Number },
    },
    balanceBefore: { type: Number, required: true },   // coins balance before this transaction
    balanceAfter:  { type: Number, required: true },   // coins balance after this transaction
    note:        { type: String, trim: true },
  },
  { timestamps: true }
);

coinsTransactionSchema.index({ user: 1, createdAt: -1 });

module.exports = mongoose.model("CoinsTransaction", coinsTransactionSchema);
