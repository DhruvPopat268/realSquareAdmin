const mongoose = require("mongoose");

const freeListingConfigSchema = new mongoose.Schema(
  {
    noOfListings: { type: Number, required: true, min: -1, default: 0 }, // -1 = unlimited
  },
  { timestamps: true }
);

module.exports = mongoose.model("FreeListingConfig", freeListingConfigSchema);
