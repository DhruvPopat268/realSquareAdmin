const mongoose = require("mongoose");

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
      mobile: {
        type: String,
        trim: true,
        required: true,
      },
      role: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Role",
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
      ref: "Purpose",
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
      min: {
        type: Number,
        min: 0,
        required: true,
      },
      max: {
        type: Number,
        min: 0,
        required: true,
      },
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

    // Furnishing preference
    furnishingType: {
      type: String,
      enum: ["Unfurnished", "Semi-Furnished", "Fully-Furnished"],
      required: true,
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
      enum: ["active", "expired"],
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
