const mongoose = require("mongoose");

const purchasedPlanSchema = new mongoose.Schema(
  {
    user:          { type: mongoose.Schema.Types.ObjectId, ref: "SystemUser", required: true },
    userType:      { type: String, enum: ["Owner", "Broker", "Builder"], required: true },
    plan:          { type: mongoose.Schema.Types.ObjectId, ref: "Plan", required: true },
    paymentMethod:    { type: String, enum: ["Coins", "Online"], required: true },
    transactionId:    { type: mongoose.Schema.Types.ObjectId, refPath: "transactionModel" },
    transactionModel: { type: String, enum: ["PaymentTransaction", "CoinsTransaction"] },
    amountPaid:    { type: Number, default: 0 },
    coinsPaid:     { type: Number, default: 0 },
    expiryType:    { type: String, enum: ["Weekly", "Monthly", "Yearly"] },
    startDate:     { type: Date, required: true },
    expiryDate:    { type: Date, required: true },
    status:        { type: String, enum: ["Active", "Expired", "Consumed"], default: "Active" },
  },
  { timestamps: true }
);

purchasedPlanSchema.index({ user: 1, status: 1 });

module.exports = mongoose.model("PurchasedPlan", purchasedPlanSchema);
