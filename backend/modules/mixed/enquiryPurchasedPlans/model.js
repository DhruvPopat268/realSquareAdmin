const mongoose = require("mongoose");

const enquiryPurchasedPlanSchema = new mongoose.Schema(
  {
    user:     { type: mongoose.Schema.Types.ObjectId, ref: "SystemUser", required: true },
    userType: { type: String, enum: ["Owner", "Broker", "Builder"], required: true },
    userDetails: {
      name:   { type: String, required: true, trim: true },
      mobile: { type: String, required: true, trim: true },
    },
    plan: {
      planId:                 { type: mongoose.Schema.Types.ObjectId, ref: "EnquiryPlan", required: true },
      name:                   { type: String, required: true },
      numberOfEnquiriesGiven: { type: Number, required: true }, // -1 = unlimited
      expiryInDays:           { type: Number },                 // -1 = never
      coins:                  { type: Number },
      amount:                 { type: Number },
    },
    enquiriesUsed:      { type: Number, default: 0 },
    paymentMethod:      { type: String, enum: ["Coins", "Online", "Free"], required: true },
    transactionId:      { type: mongoose.Schema.Types.ObjectId, refPath: "transactionModel" },
    transactionModel:   { type: String, enum: ["PaymentTransaction", "CoinsTransaction"] },
    amountPaid:         { type: Number, default: 0 },
    coinsPaid:          { type: Number, default: 0 },
    startDate:          { type: Date, required: true },
    expiryDate:         { type: Date },               // null = never expires
    expiryDurationDays: { type: Number },
    status:             { type: String, enum: ["Active", "Expired", "Consumed", "Cancelled"], default: "Active" },
    cancellationReason: { type: String, enum: ["User upgraded plan", "User switched role"] },
    changedPlanTo:      { type: mongoose.Schema.Types.ObjectId, ref: "EnquiryPurchasedPlan" },
  },
  { timestamps: true }
);

enquiryPurchasedPlanSchema.index({ user: 1, status: 1 });

module.exports = mongoose.model("EnquiryPurchasedPlan", enquiryPurchasedPlanSchema);
