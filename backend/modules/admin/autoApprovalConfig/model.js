const mongoose = require("mongoose");
const { Schema } = mongoose;

const autoApprovalConfigSchema = new Schema(
  {
    roleId:   { type: Schema.Types.ObjectId, ref: "SystemUserRole", required: true, unique: true },
    isActive: { type: Boolean, default: false },
  },
  { timestamps: true }
);

module.exports = mongoose.model("AutoApprovalConfig", autoApprovalConfigSchema);
