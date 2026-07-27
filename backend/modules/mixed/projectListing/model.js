const mongoose = require("mongoose");
const { Schema } = mongoose;

// ─── Reusable sub-schemas ────────────────────────────────────────────────────

const areaSchema = new Schema(
  {
    value: { type: Number },
    unit:  { type: String, enum: ["sqft", "sqyd", "sqmt"] },
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

// ─── Configuration (per unit type inside a project) ──────────────────────────

const configurationSchema = new Schema(
  {
    bhk:            { type: Number },
    builtUpArea:    areaSchema,
    carpetArea:     areaSchema,
    price:          { type: Number },
    totalUnits:     { type: Number },
    availableUnits: { type: Number },
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
    projectName:    { type: String, trim: true, required: true },
    reraNumber:     { type: String, trim: true },
    launchDate:     { type: Date },
    possessionDate: { type: Date },
    amenities:      [{ type: String, trim: true }],

    // ── Configurations ────────────────────────────────────────────────────────
    configurations: [configurationSchema],

    // ── Derived price range (from configurations) ─────────────────────────────
    minPrice: { type: Number },
    maxPrice: { type: Number },

    // ── Location ──────────────────────────────────────────────────────────────
    city:     { id: { type: Schema.Types.ObjectId, ref: "City", required: true }, name: { type: String, trim: true } },
    locality: localitySchema,

    // ── Listed By ─────────────────────────────────────────────────────────────
    listedBy: { type: Schema.Types.ObjectId, ref: "SystemUser", required: true },

    // ── Media ─────────────────────────────────────────────────────────────────
    media: {
      images: [{ type: String, trim: true }],           // S3/CDN URLs
    },

    // ── Meta ──────────────────────────────────────────────────────────────────
    status: { type: String, enum: ["Active", "Inactive", "UnderReview", "Rejected"], default: "UnderReview" },
  },
  { timestamps: true }
);

// ─── Indexes ──────────────────────────────────────────────────────────────────

projectListingSchema.index({ "city.id": 1, "category.id": 1 });
projectListingSchema.index({ listedBy: 1 });
projectListingSchema.index({ status: 1 });
projectListingSchema.index({ minPrice: 1, maxPrice: 1 });
projectListingSchema.index({ "locality.latitude": 1, "locality.longitude": 1 });

module.exports = mongoose.model("ProjectListing", projectListingSchema);
