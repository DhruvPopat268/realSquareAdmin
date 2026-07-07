const mongoose = require("mongoose");

const planSchema = new mongoose.Schema(
  {
    name:                   { type: String, required: true, trim: true },
    description:            { type: String, trim: true },
    planType:               { type: String, enum: ["Free", "Paid"], required: true },
    numberOfPropertiesGiven:{ type: Number, required: true },
    expiryType:             { type: String, enum: ["Weekly", "Monthly", "Yearly"] },
    leadsPerDay:            { type: Number, required: true },
    roles:                  { type: [String], default: [] },
    coins:                  { type: Number },
    amount:                 { type: Number },
    isActive:               { type: Boolean, default: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Plan", planSchema);
