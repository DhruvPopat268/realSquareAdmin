const mongoose = require("mongoose");

const idealForSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    image: { type: String, required: true, trim: true },
    order: { type: Number, required: true, min: 1 },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

idealForSchema.index({ name: 1 }, { unique: true, collation: { locale: "en", strength: 2 } });

module.exports = mongoose.model("IdealFor", idealForSchema);
