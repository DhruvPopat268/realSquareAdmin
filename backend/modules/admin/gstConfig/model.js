const mongoose = require("mongoose");

const gstConfigSchema = new mongoose.Schema(
  {
    cgst: { type: Number, required: true, min: 0, max: 100 },
    sgst: { type: Number, required: true, min: 0, max: 100 },
    igst: { type: Number, required: true, min: 0, max: 100 },
  },
  { timestamps: true }
);

// Singleton — only one config document ever exists
module.exports = mongoose.model("GstConfig", gstConfigSchema);
