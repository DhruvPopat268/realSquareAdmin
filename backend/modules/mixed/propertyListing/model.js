const mongoose = require("mongoose");
const { Schema } = mongoose;

// ─── Reusable sub-schemas ────────────────────────────────────────────────────

const areaSchema = new Schema(
  {
    value: { type: Number },
    unit: { type: String, enum: ["sqft", "sqyd", "sqmt"] },
  },
  { _id: false }
);

const localitySchema = new Schema(
  {
    address: { type: String, trim: true },
    latitude: { type: Number },
    longitude: { type: Number },
  },
  { _id: false }
);

// ─── Shared Furnishing & Amenity sub-schema ──────────────────────────────────

const furnishingItemSchema = new Schema(
  {
    id:    { type: Schema.Types.ObjectId, ref: "FurnishingAmenity" },
    name:  { type: String, trim: true },
    icon:  { type: String, trim: true },           // denormalized from FurnishingAmenity
    count: { type: Number },                       // only when hasCount = true
  },
  { _id: false }
);

const amenityItemSchema = new Schema(
  {
    id:    { type: Schema.Types.ObjectId, ref: "FurnishingAmenity" },
    name:  { type: String, trim: true },
    icon:  { type: String, trim: true },           // denormalized from FurnishingAmenity
    count: { type: Number },
  },
  { _id: false }
);

// ─── Residential (Apartment / House / Duplex / Floor / Villa / Penthouse / Studio / Farmhouse) ──

const residentialDetailsSchema = new Schema(
  {
    societyName: { type: String, trim: true },
    bhk: { type: Number },                     // 1,2,3,4,5...
    builtUpArea: areaSchema,
    furnishType: { type: String, enum: ["Unfurnished", "Semi-Furnished", "Fully-Furnished"] },
    furnishings: [furnishingItemSchema],
    amenities:   [amenityItemSchema],
  },
  { _id: false }
);

// ─── Plot / Agricultural Land ────────────────────────────────────────────────

const plotDetailsSchema = new Schema(
  {
    societyName: { type: String, trim: true },
    plotArea: areaSchema,
    length: { type: Number },
    width: { type: Number },
  },
  { _id: false }
);

// ─── PG / Co-living ──────────────────────────────────────────────────────────

const pgRoomSchema = new Schema(
  {
    roomType: { type: String, enum: ["1 Sharing", "2 Sharing", "3 Sharing", "4 Sharing", "5 Sharing", "6 Sharing", "7 Sharing"] },
    bedsAvailable: { type: Number, default: 1 },
    rent: { type: Number },
    securityDeposit: { type: Number },
  },
  { _id: false }
);

const pgDetailsSchema = new Schema(
  {
    pgName: { type: String, trim: true },
    totalBedsAvailable: { type: Number },
    pgFor: { type: String, enum: ["Girls", "Boys", "Both"] },
    bestSuitedFor: [{ type: String, enum: ["Students", "Professionals"] }],
    mealsAvailable: { type: Boolean, default: false },
    meals: [{ type: String, enum: ["Breakfast", "Lunch", "Dinner"] }],
    noticePeriod: { type: Number },                   // in days
    lockInPeriod: { type: Number },                   // in days
    commonAreas: [{ type: String, enum: ["Living Room", "Kitchen", "Dining Area", "Bathroom", "Balcony", "Terrace", "Laundry Room", "Study Room", "Gym", "Parking"] }],
    rooms: [pgRoomSchema],
    furnishType: { type: String, enum: ["Unfurnished", "Semi-Furnished", "Fully-Furnished"] },
    furnishings: [furnishingItemSchema],               // PG-level furnishings (Bed, Wardrobe, etc.)
    amenities:   [amenityItemSchema],                  // PG-level amenities (WiFi, Laundry, etc.)
  },
  { _id: false }
);

// ─── Commercial (Office / Shop / Showroom / Warehouse / Plot / Others) ───────

const commercialDetailsSchema = new Schema(
  {
    societyName: { type: String, trim: true },
    propertyType: { type: String, trim: true },  // only for "Others" type
    zoneType: { type: String, enum: ["Industrial", "Commercial", "Residential", "SEZ", "OpenSpaces", "Agricultural", "Others"] },
    locationHub: { type: String, enum: ["IT Park", "Business Park", "Mall", "Commercial Project", "Residential Project", "Retail Complex/Building", "Market/High Street", "Others"] },
    builtUpArea: areaSchema,
    carpetArea: areaSchema,
    plotArea: areaSchema,                        // plot
    length: { type: Number },
    width: { type: Number },
    ownership: { type: String, enum: ["Freehold", "Leasehold", "CooperativeSociety", "PowerOfAttorney"] },
    totalFloors: { type: Number },
    yourFloor: { type: String, trim: true },
    minSeats: { type: Number },              // office only
    minCabins: { type: Number },           // office only
    minMeetingRooms: { type: Number },     // office only
    furnishType: { type: String, enum: ["Unfurnished", "Semi-Furnished", "Fully-Furnished"] },
    furnishings: [furnishingItemSchema],
    amenities:   [amenityItemSchema],
  },
  { _id: false }
);

// ─── Sell Info ────────────────────────────────────────────────────────────────

const sellInfoSchema = new Schema(
  {
    price: { type: Number },
    constructionStatus: { type: String, enum: ["UnderConstruction", "ReadyToMove"] },
    ageOfProperty: { type: Number },        // in years, only when ReadyToMove
    availableFrom: { type: Date },          // only when UnderConstruction
  },
  { _id: false }
);

// ─── Rent Info ────────────────────────────────────────────────────────────────

const rentInfoSchema = new Schema(
  {
    monthlyRent: { type: Number },
    availableFrom: { type: Date },
    securityDeposit: {
      type: { type: String, enum: ["None", "1Month", "2Month", "Custom"] },
      amount: { type: Number },                         // only when type = Custom
    },
  },
  { _id: false }
);

// ─── RERA sub-schema ─────────────────────────────────────────────────────────

const reraProjectDetailsSchema = new Schema(
  {
    projectName:    { type: String },
    developerName:  { type: String },
    localityOrCity: { type: String },
    state:          { type: String },
    projectType:    { type: String },
    completionDate: { type: String },
    totalUnits:     { type: String },
    status:         { type: String },
    confidence:     { type: String, enum: ["high", "low", "unknown"] },
  },
  { _id: false }
);

const reraSchema = new Schema(
  {
    reraId:            { type: String, trim: true },
    reraStatus:        { type: String, enum: ["unverified", "verified"], default: "unverified" },
    reraAdminApproved: { type: Boolean, default: false },
    verifiedAt:        { type: Date, default: null },
    projectDetails:    reraProjectDetailsSchema,
    sources:           [{ type: String }],
  },
  { _id: false }
);

// ─── Main Property Listing Schema ────────────────────────────────────────────

const propertyListingSchema = new Schema(
  {
    // ── Identity ──────────────────────────────────────────────────────────────
    category: {
      id: { type: Schema.Types.ObjectId, ref: "PropertyCategory", required: true },
      name: { type: String, trim: true },
    },
    listingType: {
      id: { type: Schema.Types.ObjectId, ref: "PropertyPurpose", required: true },
      name: { type: String, trim: true },
    }, // Sell / Rent / PG
    propertyType: {
      id: { type: Schema.Types.ObjectId, ref: "PropertyType" },
      name: { type: String, trim: true },
    },

    // ── Location ──────────────────────────────────────────────────────────────
    cityName: { type: String, trim: true },
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
      images: [{ type: String, trim: true }],           // S3/CDN URLs (first is primary/cover)
    },

    // ── Type-specific details (only one will be populated per listing) ────────
    residentialDetails: residentialDetailsSchema,
    plotDetails: plotDetailsSchema,
    pgDetails: pgDetailsSchema,
    commercialDetails: commercialDetailsSchema,

    // ── Listing-type-specific pricing ─────────────────────────────────────────
    sellInfo: sellInfoSchema,
    rentInfo: rentInfoSchema,

    // ── Meta ──────────────────────────────────────────────────────────────────
    status: {
      type: String,
      enum: ["Active", "Inactive", "Sold", "Rented", "UnderReview", "Rejected"],
      default: "UnderReview",
    },
    approvedAt:      { type: Date, default: null },
    rejectedAt:      { type: Date, default: null },
    rejectedReasons: [{ type: String, trim: true }],
    soldAt:          { type: Date, default: null },
    rentedAt:        { type: Date, default: null },

    // ── RERA ──────────────────────────────────────────────────────────────────
    rera: reraSchema,
  },
  { timestamps: true }
);

// ─── Indexes ──────────────────────────────────────────────────────────────────

propertyListingSchema.index({ cityName: 1, "category.id": 1, "listingType.id": 1 });
propertyListingSchema.index({ "listedBy.id": 1 });
propertyListingSchema.index({ status: 1 });
propertyListingSchema.index({ "locality.latitude": 1, "locality.longitude": 1 });

module.exports = mongoose.model("PropertyListing", propertyListingSchema);
