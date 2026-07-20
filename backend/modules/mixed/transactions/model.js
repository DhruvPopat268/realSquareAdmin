const mongoose = require("mongoose");

const paymentTransactionSchema = new mongoose.Schema(
  {
    user:              { type: mongoose.Schema.Types.ObjectId, ref: "SystemUser", required: true },
    userType:          { type: String, enum: ["Owner", "Broker", "Builder"], required: true },
    refId:             { type: mongoose.Schema.Types.ObjectId, refPath: "refModel" },
    refModel:          { type: String, enum: ["Plan"] },
    reason:            { type: String, enum: ["PlanPurchase", "CoinsPurchase", "Refund", "AdminCredit", "AdminDebit", "PlanUpgrade"], required: true },
    razorpayOrderId:   { type: String, required: true },
    razorpayPaymentId: { type: String },
    razorpaySignature: { type: String },
    amount:            { type: Number, required: true },
    currency:          { type: String, default: "INR" },
    balanceBefore:     { type: Number, required: true },
    balanceAfter:      { type: Number, required: true },
    status:            { type: String, enum: ["Pending", "Success", "Failed"], default: "Pending" },
    failureReason:     { type: String },
  },
  { timestamps: true }
);

paymentTransactionSchema.index({ user: 1, status: 1 });
paymentTransactionSchema.index({ razorpayOrderId: 1 }, { unique: true });

module.exports = mongoose.model("PaymentTransaction", paymentTransactionSchema);
