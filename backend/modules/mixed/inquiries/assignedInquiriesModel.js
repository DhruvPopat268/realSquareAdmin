import mongoose from "mongoose";

const assignedInquiriesSchema = new mongoose.Schema(
  {
    // Reference to the inquiry
    inquiry: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Inquiry",
      required: true,
    },

    // User the inquiry is assigned to
    assignedTo: {
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

    // When the inquiry was assigned
    assignedAt: {
      type: Date,
      default: Date.now,
      required: true,
    },

    // When the user purchased/bought the inquiry
    purchasedAt: {
      type: Date,
    },

    // Status of the assignment
    status: {
      type: String,
      enum: ["active", "purchased"],
      default: "active",
      required: true,
    },

    // Assignment source (automatic = when inquiry created, cron = by cron job)
    assignmentSource: {
      type: String,
      enum: ["automatic", "cron"],
      default: "automatic",
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes for optimal query performance
assignedInquiriesSchema.index({ "assignedTo.id": 1, status: 1, createdAt: -1 });
assignedInquiriesSchema.index({ inquiry: 1, "assignedTo.id": 1 }, { unique: true });
assignedInquiriesSchema.index({ status: 1 });
assignedInquiriesSchema.index({ assignmentSource: 1 });

export const AssignedInquiry = mongoose.model("AssignedInquiry", assignedInquiriesSchema);
