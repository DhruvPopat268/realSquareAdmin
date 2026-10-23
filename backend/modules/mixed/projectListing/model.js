const mongoose = require("mongoose");
const { Schema } = mongoose;

// ─── Reusable sub-schemas ────────────────────────────────────────────────────

const areaSchema = new Schema(
  {
    value: { type: Number },
    unit:  { type: String, enum: ["sqft", "sqyd", "sqmt"], default: "sqft" },
  },
  { _id: false }
);

const localitySchema = new Schema(
  {
    address:   { type: String, trim: true },
    latitude:  { type: Number },
    longitude: { type: Number },
  },
  { _id: false }
);

const furnishingItemSchema = new Schema(
  {
    id:    { type: Schema.Types.ObjectId, ref: "FurnishingAmenity" },
    name:  { type: String, trim: true },
    icon:  { type: String, trim: true },
    count: { type: Number },
  },
  { _id: false }
);

const amenityItemSchema = new Schema(
  {
    id:    { type: Schema.Types.ObjectId, ref: "FurnishingAmenity" },
    name:  { type: String, trim: true },
    icon:  { type: String, trim: true },
    count: { type: Number },
  },
  { _id: false }
);

const residentialProjectConfigurationSchema = new Schema(
  {
    bhk:         { type: String, trim: true },
    builtUpArea: areaSchema,
    carpetArea:  areaSchema,
  },
  { _id: false }
);

const commercialProjectConfigurationSchema = new Schema(
  {
    builtUpArea: areaSchema,
    carpetArea:  areaSchema,
  },
  { _id: false }
);

const residentialDetailsSchema = new Schema(
  {
    configurations: [residentialProjectConfigurationSchema],
  },
  { _id: false }
);

const commercialDetailsSchema = new Schema(
  {
    zoneType: {
      type: String,
      enum: ["Industrial", "Commercial", "Residential", "SEZ", "OpenSpaces", "Agricultural", "Others"],
    },
    locationHub: {
      type: String,
      enum: ["IT Park", "Business Park", "Mall", "Commercial Project", "Residential Project", "Retail Complex/Building", "Market/High Street", "Others"],
    },
    configurations: [commercialProjectConfigurationSchema],
  },
  { _id: false }
);

// ─── Main Project Listing Schema ─────────────────────────────────────────────

const projectListingSchema = new Schema(
  {
    // ── Identity ──────────────────────────────────────────────────────────────
    category:     { id: { type: Schema.Types.ObjectId, ref: "PropertyCategory", required: true }, name: { type: String, trim: true } },
    propertyType: { id: { type: Schema.Types.ObjectId, ref: "PropertyType", required: true }, name: { type: String, trim: true } },

    // ── Project Info ──────────────────────────────────────────────────────────
    projectName:        { type: String, trim: true, required: true },
    developerName:      { type: String, trim: true },
    projectDescription: { type: String, trim: true },
    projectStatus:      { type: String, enum: ["Ready to Move", "Under Construction", "New Launch"] },
    reraId:             { type: String, trim: true },
    launchDate:         { type: Date },
    possessionDate:     { type: Date },
    totalUnits:         { type: Number, min: 1 },
    availableUnits:     { type: Number, min: 0 },
    towerCount:         { type: Number, min: 1 },

    // ── Project configurations ───────────────────────────────────────────────
    residentialDetails: residentialDetailsSchema,
    commercialDetails:  commercialDetailsSchema,

    // ── Project-level Furnishings & Amenities ────────────────────────────────
    furnishType: { type: String, enum: ["Unfurnished", "Semi-Furnished", "Fully-Furnished"] },
    furnishings: [furnishingItemSchema],
    amenities:   [amenityItemSchema],

    // ── Derived price range (from configurations) ─────────────────────────────
    minPrice: { type: Number },
    maxPrice: { type: Number },

    // ── Location ──────────────────────────────────────────────────────────────
    city:     { id: { type: Schema.Types.ObjectId, ref: "City", required: true }, name: { type: String, trim: true } },
    locality: localitySchema,

    // ── Listed By ─────────────────────────────────────────────────────────────
    listedBy: {
      id: { type: Schema.Types.ObjectId, ref: "SystemUser", required: true },
      name: { type: String, trim: true },
      mobile: { type: String, trim: true },
      email: { type: String, trim: true },
      profilePhoto: { type: String, trim: true },
      role: {
        id: { type: Schema.Types.ObjectId, ref: "SystemUserRole" },
        name: { type: String, trim: true },
      },
    },

    // ── Media ─────────────────────────────────────────────────────────────────
    media: {
      images: [{ type: String, trim: true }], // S3/CDN URLs (first is primary/cover)
      videos: {
        videoUrl: { type: String, trim: true },
        ytVideoUrl: { type: String, trim: true },
      },
      reelVideo: {
        reelUrl: { type: String, trim: true },
        ytReelUrl: { type: String, trim: true },
      },
    },
    brochureUrl: { type: String, trim: true },

    // ── Meta ──────────────────────────────────────────────────────────────────
    status: { type: String, enum: ["Active", "Inactive", "UnderReview", "Rejected"], default: "UnderReview" },
  },
  { timestamps: true }
);

// ─── Indexes ──────────────────────────────────────────────────────────────────

projectListingSchema.index({ "city.id": 1, "category.id": 1 });
projectListingSchema.index({ "listedBy.id": 1 });
projectListingSchema.index({ status: 1 });
projectListingSchema.index({ minPrice: 1, maxPrice: 1 });
projectListingSchema.index({ "locality.latitude": 1, "locality.longitude": 1 });

module.exports = mongoose.model("ProjectListing", projectListingSchema);
