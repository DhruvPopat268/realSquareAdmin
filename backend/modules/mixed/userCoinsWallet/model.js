const mongoose = require("mongoose");

const userCoinsWalletSchema = new mongoose.Schema(
  {
    user:               { type: mongoose.Schema.Types.ObjectId, ref: "SystemUser", required: true, unique: true },
    userType:           { type: String, enum: ["Owner", "Broker", "Builder"], required: true },
    currentBalance:     { type: Number, default: 0, min: 0 },
    totalCreditedCoins: { type: Number, default: 0 },
    totalDebitedCoins:  { type: Number, default: 0 },
  },
  { timestamps: true }
);

module.exports = mongoose.model("UserCoinsWallet", userCoinsWalletSchema);
