const mongoose = require("mongoose");

const systemUserRoleSchema = new mongoose.Schema(
  {
    name:        { type: String, required: true, trim: true },
    permissions: { type: [String], default: [] },
    isActive:    { type: Boolean, default: true },
  },
  { timestamps: true }
);

// case-insensitive unique index on name
systemUserRoleSchema.index({ name: 1 }, { unique: true, collation: { locale: "en", strength: 2 } });

module.exports = mongoose.model("SystemUserRole", systemUserRoleSchema);
