const mongoose = require("mongoose");

const counterSchema = new mongoose.Schema({
  key:   { type: String, required: true, unique: true }, // e.g. "invoice"
  seq:   { type: Number, default: 0 },
  prefix: { type: String, required: true },              // e.g. "RSVI"
});

/**
 * Atomically increments the counter for the given key and returns the next
 * formatted value, e.g. "RSVI-1", "RSVI-2", ...
 */
counterSchema.statics.nextVal = async function (key) {
  const doc = await this.findOneAndUpdate(
    { key },
    { $inc: { seq: 1 } },
    { new: true, upsert: false }
  );
  if (!doc) throw new Error(`Counter not found for key: ${key}`);
  return `${doc.prefix}-${doc.seq}`;
};

module.exports = mongoose.model("Counter", counterSchema);
