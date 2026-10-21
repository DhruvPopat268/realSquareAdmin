const mongoose = require("mongoose");
const schema = new mongoose.Schema({
  title: { type: String, required: true, trim: true },
  benefits: { type: [{ type: String, trim: true }], required: true, validate: [(items) => items.length > 0, "At least one benefit is required"] },
  isActive: { type: Boolean, default: true },
}, { timestamps: true });
schema.index({ title: 1 }, { unique: true, collation: { locale: "en", strength: 2 } });
module.exports = mongoose.model("VirtualSpace", schema);
