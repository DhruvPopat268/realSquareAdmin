const mongoose = require("mongoose");

const isCoworkingInquiry = (inquiry) => Boolean(
  process.env.LISTING_TYPE_RENT_ID &&
  process.env.CATEGORY_COMMERCIAL_ID &&
  process.env.COMMERCIAL_PROPERTY_TYPE_co_working_space_ID &&
  String(inquiry?.listingType ?? "") === String(process.env.LISTING_TYPE_RENT_ID) &&
  String(inquiry?.propertyCategory ?? "") === String(process.env.CATEGORY_COMMERCIAL_ID) &&
  String(inquiry?.propertyType ?? "") === String(process.env.COMMERCIAL_PROPERTY_TYPE_co_working_space_ID)
);

const coworkingWorkspaceRequirementSchema = new mongoose.Schema(
  {
    type: { type: String, enum: ["dedicated_coworking_desk", "individual_private_cabin", "virtual_office"], required: true },
    requiredSeats: {
      type: Number,
      min: 1,
      required: function () { return this.type === "dedicated_coworking_desk" || this.type === "individual_private_cabin"; },
    },
    minRentPerSeat: {
      type: Number,
      min: 1,
      required: function () { return this.type === "dedicated_coworking_desk" || this.type === "individual_private_cabin"; },
    },
    maxRentPerSeat: {
      type: Number,
      min: 1,
      required: function () { return this.type === "dedicated_coworking_desk" || this.type === "individual_private_cabin"; },
      validate: { validator: function (value) { return value >= this.minRentPerSeat; }, message: "maxRentPerSeat must be at least minRentPerSeat" },
    },
    minMonthlyRent: {
      type: Number,
      min: 1,
      required: function () { return this.type === "virtual_office"; },
    },
    maxMonthlyRent: {
      type: Number,
      min: 1,
      required: function () { return this.type === "virtual_office"; },
      validate: { validator: function (value) { return value >= this.minMonthlyRent; }, message: "maxMonthlyRent must be at least minMonthlyRent" },
    },
  },
  { _id: false },
);

const budgetRangeSchema = new mongoose.Schema(
  {
    min: { type: Number, min: 0, required: true },
    max: { type: Number, min: 0, required: true },
  },
  { _id: false },
);

const inquirySchema = new mongoose.Schema(
  {
    // User who created the inquiry
    createdBy: {
      id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "SystemUser",
        required: true,
      },
      name: {
        type: String,
        trim: true,
        required: true,
      },
      email: {
        type: String,
        trim: true,
        lowercase: true,
      },
      mobile: {
        type: String,
        trim: true,
        required: true,
      },
      role: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "SystemUserRole",
        required: true,
      },
    },

    // Property inquiry type flag
    isProperty: {
      type: Boolean,
      default: true,
      required: true,
    },

    // Listing type (Buy/Rent/PG) - Reference to Purpose
    listingType: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "PropertyPurpose",
      required: true,
    },

    // Property category (Residential/Commercial)
    propertyCategory: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "PropertyCategory",
    },

    // Property type (Apartment/Villa/Plot etc.)
    propertyType: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "PropertyType",
    },

    // Location details
    preferredCity: {
      type: String,
      trim: true,
      required: true,
    },

    preferredArea: {
      type: String,
      trim: true,
    },

    // Budget range
    budget: {
      type: budgetRangeSchema,
      required: function () { return !isCoworkingInquiry(this); },
    },

    // Workspace requirements replace the global budget for co-working inquiries.
    coworkingWorkspaces: {
      type: [coworkingWorkspaceRequirementSchema],
      default: undefined,
      validate: [
        { validator: (workspaces) => workspaces.length >= 1 && workspaces.length <= 3, message: "coworkingWorkspaces must contain one to three workspace types" },
        { validator: (workspaces) => new Set(workspaces.map(({ type }) => type)).size === workspaces.length, message: "coworkingWorkspaces cannot contain duplicate workspace types" },
      ],
    },

    // BHK requirement (for residential properties)
    bhk: {
      type: Number,
    },

    // Built-up area (for non-residential properties)
    builtUpArea: {
      value: { type: Number },
      unit: {
        type: String,
        enum: ["sqft", "sqyd", "sqmt"],
      },
    },

    // Plot area (for plot properties)
    plotArea: {
      value: { type: Number },
      unit: {
        type: String,
        enum: ["sqft", "sqyd", "sqmt"],
      },
    },

    // Project requirement details for Under Construction inquiries.
    carpetArea: {
      value: { type: Number, min: 0 },
      unit: { type: String, enum: ["sqft", "sqyd", "sqmt"] },
    },
    idealFor: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: "IdealFor",
    }],

    // Furnishing preference
    furnishingType: {
      type: String,
      enum: ["Unfurnished", "Semi-Furnished", "Fully-Furnished"],
    },

    // Inquiry classification (hot/warm/cold)
    inquiryClassification: {
      type: String,
      enum: ["hot", "warm", "cold"],
      lowercase: true,
      required: true,
    },

    // Last follow-up date
    lastFollowUpDate: {
      type: Date,
      required: true,
    },

    // Additional remarks/notes
    remarks: {
      type: String,
      trim: true,
    },

    // Preferred communication channels
    preferredCommunication: {
      type: [String],
      enum: ["call", "whatsapp", "email", "sms"],
      required: true,
      validate: {
        validator: function (v) {
          return v && v.length > 0;
        },
        message: "At least one communication preference is required",
      },
    },

    // Status tracking
    status: {
      type: String,
      enum: ["active", "expired", "inactive", "completed", "rejected"],
      default: "active",
      required: true,
    },

  },
  { timestamps: true }
);

inquirySchema.index({ "createdBy.id": 1, createdAt: -1 });
inquirySchema.index({ listingType: 1 });
inquirySchema.index({ propertyCategory: 1 });
inquirySchema.index({ inquiryClassification: 1 });
inquirySchema.index({ status: 1 });

module.exports = { Inquiry: mongoose.model("Inquiry", inquirySchema) };
