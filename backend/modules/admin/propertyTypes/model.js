const mongoose = require("mongoose");

const propertyTypeSchema = new mongoose.Schema(
  {
    name:             { type: String, required: true, trim: true },
    propertyCategory: { type: mongoose.Schema.Types.ObjectId, ref: "PropertyCategory", required: true },
    description:      { type: String, trim: true, default: "" },
    order:            { type: Number, default: 0 },
    isActive:         { type: Boolean, default: true },
  },
  { timestamps: true }
);

// case-insensitive unique name per category
propertyTypeSchema.index({ name: 1, propertyCategory: 1 }, { unique: true, collation: { locale: "en", strength: 2 } });
// unique display order per category
propertyTypeSchema.index({ order: 1, propertyCategory: 1 }, { unique: true });

module.exports = mongoose.model("PropertyType", propertyTypeSchema);
