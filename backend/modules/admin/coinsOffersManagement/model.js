const mongoose = require("mongoose");

const coinsOfferSchema = new mongoose.Schema(
  {
    name:        { type: String, required: true, trim: true },
    description: { type: String, trim: true },
    coins:       { type: Number, required: true },
    amount:      { type: Number, required: true },
    isActive:    { type: Boolean, default: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model("CoinsOffer", coinsOfferSchema);
