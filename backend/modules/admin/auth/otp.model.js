const mongoose = require("mongoose");

const otpSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "SystemUser",
    default: null,
  },
  mobile: {
    type: String,
    default: null,
  },
  otp: {
    type: String,
    required: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
    expires: 60 * 10, // auto-delete after 10 minutes
  },
});

module.exports = mongoose.model("SystemUserOtp", otpSchema);
