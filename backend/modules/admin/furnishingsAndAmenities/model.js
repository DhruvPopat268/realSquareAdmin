const mongoose = require("mongoose");
const { Schema } = mongoose;

const furnishingAmenitySchema = new Schema(
  {
    name:     { type: String, required: true, trim: true },
    type:     { type: String, enum: ["Furnishing", "Amenity"], required: true },
    hasCount: { type: Boolean, default: false }, // true = quantity selector (Fan, AC, Wardrobe etc.)
    icon:     { type: String, trim: true },       // icon key or URL
    order:    { type: Number, default: 0 },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

furnishingAmenitySchema.index({ name: 1, type: 1 }, { unique: true, collation: { locale: "en", strength: 2 } });

module.exports = mongoose.model("FurnishingAmenity", furnishingAmenitySchema);