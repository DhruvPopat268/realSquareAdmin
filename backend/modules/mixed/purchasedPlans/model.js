const mongoose = require("mongoose");

const purchasedPlanSchema = new mongoose.Schema(
  {
    user:          { type: mongoose.Schema.Types.ObjectId, ref: "SystemUser", required: true },
    userType:      { type: String, enum: ["Owner", "Broker", "Builder"], required: true },
    plan: {
      planId:                  { type: mongoose.Schema.Types.ObjectId, ref: "ListingPlan", required: true },
      name:                    { type: String, required: true },
      numberOfPropertiesGiven: { type: Number, required: true },
      expiryInDays:            { type: Number },
      coins:                   { type: Number },
      amount:                  { type: Number },
    },
    propertiesUsed: { type: Number, default: 0 },
    paymentMethod:    { type: String, enum: ["Coins", "Online"], required: true },
    transactionId:    { type: mongoose.Schema.Types.ObjectId, refPath: "transactionModel" },
    transactionModel: { type: String, enum: ["PaymentTransaction", "CoinsTransaction"] },
    amountPaid:    { type: Number, default: 0 },
    coinsPaid:     { type: Number, default: 0 },
    startDate:     { type: Date, required: true },
    expiryDate:    { type: Date, required: true },
    expiryDurationDays: { type: Number },
    status:        { type: String, enum: ["Active", "Expired", "Consumed", "Cancelled"], default: "Active" },
    changedPlanTo: { type: mongoose.Schema.Types.ObjectId, ref: "ListingPurchasedPlan" },
  },
  { timestamps: true }
);

purchasedPlanSchema.index({ user: 1, status: 1 });

module.exports = mongoose.model("ListingPurchasedPlan", purchasedPlanSchema);