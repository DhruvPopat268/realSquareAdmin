const mongoose = require("mongoose");

const planSchema = new mongoose.Schema(
  {
    name:                   { type: String, required: true, trim: true },
    description:            { type: String, trim: true },
    numberOfPropertiesGiven:{ type: Number, required: true },
    expiryInDays:           { type: Number, min: -1 },
    roles:                  { type: [String], default: [] },
    coins:                  { type: Number, min: 0 },
    amount:                 { type: Number, min: 0 },
    isActive:               { type: Boolean, default: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model("ListingPlan", planSchema);
