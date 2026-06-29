const mongoose = require("mongoose");

const citySchema = new mongoose.Schema(
  {
    name:     { type: String, required: true, trim: true },
    state:    { type: mongoose.Schema.Types.ObjectId, ref: "State", required: true },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

// case-insensitive unique index on name per state
citySchema.index({ name: 1, state: 1 }, { unique: true, collation: { locale: "en", strength: 2 } });

module.exports = mongoose.model("City", citySchema);
