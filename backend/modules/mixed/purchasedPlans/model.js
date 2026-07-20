const mongoose = require("mongoose");

const purchasedPlanSchema = new mongoose.Schema(
  {
    user:          { type: mongoose.Schema.Types.ObjectId, ref: "SystemUser", required: true },
    userType:      { type: String, enum: ["Owner", "Broker", "Builder"], required: true },
    plan: {
      planId:                  { type: mongoose.Schema.Types.ObjectId, ref: "Plan", required: true },
      name:                    { type: String, required: true },
      planType:                { type: String, enum: ["Free", "Paid"], required: true },
      numberOfPropertiesGiven: { type: Number, required: true },
      expiryType:              { type: String, enum: ["Weekly", "Monthly", "Yearly"] },
      leadsPerDay:             { type: Number, required: true },
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
    changedPlanTo: { type: mongoose.Schema.Types.ObjectId, ref: "PurchasedPlan" },
  },
  { timestamps: true }
);

purchasedPlanSchema.index({ user: 1, status: 1 });

module.exports = mongoose.model("PurchasedPlan", purchasedPlanSchema);