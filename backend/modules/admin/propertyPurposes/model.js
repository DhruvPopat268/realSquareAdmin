const mongoose = require("mongoose");

const propertyPurposeSchema = new mongoose.Schema(
  {
    name:        { type: String, required: true, trim: true },
    description: { type: String, trim: true, default: "" },
    isActive:    { type: Boolean, default: true },
  },
  { timestamps: true }
);

propertyPurposeSchema.index({ name: 1 }, { unique: true, collation: { locale: "en", strength: 2 } });

module.exports = mongoose.model("PropertyPurpose", propertyPurposeSchema);
