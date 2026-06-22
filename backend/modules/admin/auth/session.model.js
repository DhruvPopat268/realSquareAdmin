const mongoose = require("mongoose");

const systemUserSessionSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "SystemUser",
      required: true,
    },
    token: {
      type: String,
      required: true,
    },
    createdAt: {
      type: Date,
      default: Date.now,
      expires: 60 * 60 * 24 * 7, // auto-delete after 7 days (matches JWT expiry)
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("SystemUserSession", systemUserSessionSchema);
