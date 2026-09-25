const mongoose = require("mongoose");
const bcrypt    = require("bcryptjs");

// ── Panel user profile sub-schema ─────────────────────────────────────────────
// Used for admin panel users (admin / super-admin / staff etc.)
const panelUserProfileSchema = new mongoose.Schema({
  password:     { type: String, minlength: 6 },
  phone:        { type: String, trim: true },
}, { _id: false });

// ── Location sub-schema ──────────────────────────────────────────────────────
const locationSchema = new mongoose.Schema({
  name:      { type: String, trim: true },
  latitude:  { type: Number },
  longitude: { type: Number },
}, { _id: false });

// ── Owner profile sub-schema ─────────────────────────────────────────────────
const ownerBusinessDetailsSchema = new mongoose.Schema({
  logo:       { type: String },
  type:       { type: String, enum: ["private_owner", "real_estate_investment_trust", "property_management_group", "family_office"] },
  gstNumber:  { type: String, trim: true },
  mobile:     { type: String, trim: true },
  website:    { type: String, trim: true },
}, { _id: false });

const ownerProfileSchema = new mongoose.Schema({
  businessDetails: { type: ownerBusinessDetailsSchema },
}, { _id: false });

const customerProfileSchema = new mongoose.Schema({
  location:     { type: locationSchema },
  bio:          { type: String, trim: true },
  verified:     { type: Boolean, default: false },
}, { _id: false });

// ── Broker profile sub-schema ───────────────────────────────────────────────
const brokerProfileSchema = new mongoose.Schema({
  yearsOfExperience: { type: Number },
  agencyName:        { type: String, trim: true },
  bio:               { type: String, trim: true },
}, { _id: false });

// ── Builder profile sub-schema ───────────────────────────────────────────────
const builderProfileSchema = new mongoose.Schema({
  gstNumber:              { type: String, trim: true },
  cinNumber:              { type: String, trim: true },
  foundedYear:            { type: Number },
  totalProjectsDelivered: { type: Number },
  location:               { type: locationSchema },
}, { _id: false });

// ── Base system user schema ───────────────────────────────────────────────────
const systemUserSchema = new mongoose.Schema(
  {
    name:           { type: String, trim: true },
    email:          { type: String, lowercase: true, trim: true, unique: true },
    mobile:         { type: String, trim: true, required: true, unique: true },
    profilePhoto:   { type: String },
    role:           { type: mongoose.Schema.Types.ObjectId, ref: "SystemUserRole" },
    isSuperAdmin:   { type: Boolean, default: false },
    isActive:       { type: Boolean, default: true },
    autoApprovalProperties: { type: Boolean, default: false },
    freeListedProperties:   { type: Number, default: 0 },
    enquiryCities:          [{ type: String, trim: true }],
    lastLogin:      { type: Date },
    lastActivity:   { type: Date },
    profile:        { type: panelUserProfileSchema },   // panel users (admin / staff)
    customerProfile: { type: customerProfileSchema },   // customers
    ownerProfile:   { type: ownerProfileSchema },       // owners
    brokerProfile:  { type: brokerProfileSchema },      // brokers / agents
    builderProfile: { type: builderProfileSchema },     // builders / developers
  },
  { timestamps: true }
);

systemUserSchema.index({ mobile: 1 }, { unique: true });
systemUserSchema.index({ email: 1 }, { unique: true });

// ── Password hashing ──────────────────────────────────────────────────────────
systemUserSchema.pre("save", async function () {
  if (!this.isModified("profile.password")) return;
  this.profile.password = await bcrypt.hash(this.profile.password, 10);
});

// ── Instance methods ──────────────────────────────────────────────────────────
systemUserSchema.methods.matchPassword = function (enteredPassword) {
  return bcrypt.compare(enteredPassword, this.profile.password);
};

module.exports = mongoose.model("SystemUser", systemUserSchema);
