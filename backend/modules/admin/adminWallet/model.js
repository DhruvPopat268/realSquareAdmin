const mongoose = require("mongoose");

const adminWalletSchema = new mongoose.Schema(
  {
    currentBalance:      { type: Number, default: 0 },
    totalCredited:       { type: Number, default: 0 },
    totalDebited:        { type: Number, default: 0 },
    lastCreditedAt:      { type: Date },
    lastCreditedAmount:  { type: Number },
    lastDebitedAt:       { type: Date },
    lastDebitedAmount:   { type: Number },
  },
  { timestamps: true }
);

module.exports = mongoose.model("AdminWallet", adminWalletSchema);
