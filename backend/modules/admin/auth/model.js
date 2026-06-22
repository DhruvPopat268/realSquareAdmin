const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const systemUserSchema = new mongoose.Schema(
  {
    name:     { type: String, required: true, trim: true },
    email:    { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, required: true, minlength: 6 },
    role:      { type: String, default: "admin" },
    isActive:  { type: Boolean, default: true },
    lastLogin:    { type: Date, default: null },
    lastActivity: { type: Date, default: null },
  },
  { timestamps: true }
);

systemUserSchema.pre("save", async function () {
  if (!this.isModified("password")) return;
  this.password = await bcrypt.hash(this.password, 10);
});

systemUserSchema.methods.matchPassword = function (enteredPassword) {
  return bcrypt.compare(enteredPassword, this.password);
};

module.exports = mongoose.model("SystemUser", systemUserSchema);
