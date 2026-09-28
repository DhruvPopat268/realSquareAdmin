const { Types } = require("mongoose");
const { Inquiry }          = require("./model");
const { AssignedInquiry }  = require("./assignedInquiriesModel");
const SystemUser           = require("../../systemUsers.model");

/**
 * Create a new inquiry
 * Returns the created inquiry and list of eligible users for assignment
 */
const createInquiry = async (req, res) => {
  try {
    const userId = req.user?._id;
    const user   = req.user;

    const {
      isProperty, listingType, propertyCategory, propertyType,
      preferredCity, preferredArea, budget, bhk, builtUpArea,
      plotArea, furnishingType, inquiryClassification, lastFollowUpDate,
      remarks, preferredCommunication,
    } = req.body;

    // Build createdBy object from logged-in user
    const createdByData = {
      id:     userId,
      name:   user.name || user.ownerProfile?.fullName || user.brokerProfile?.fullName || user.builderProfile?.fullName,
      mobile: user.mobile,
      role:   user.role?._id,
    };

    // Profile completion check
    if (!createdByData.name || !createdByData.mobile || !createdByData.role) {
      return res.status(400).json({
        success: false,
        message: "User profile is incomplete. Name, mobile, and role are required.",
      });
    }

    // Build inquiry document
    const inquiryData = {
      createdBy: createdByData,
      isProperty,
      listingType,
      preferredCity,
      budget: { min: budget.min, max: budget.max },
      furnishingType,
      inquiryClassification,
      lastFollowUpDate,
      preferredCommunication,
      status: "active",
      ...(propertyCategory                && { propertyCategory }),
      ...(propertyType                    && { propertyType }),
      ...(preferredArea                   && { preferredArea }),
      ...(bhk !== undefined               && { bhk }),
      ...(builtUpArea                     && { builtUpArea }),
      ...(plotArea                        && { plotArea }),
      ...(remarks                         && { remarks }),
    };

    const inquiry = await Inquiry.create(inquiryData);

    // Find eligible users and create AssignedInquiry records for each
    const assignedCount = await createAssignments(inquiry);

    return res.status(201).json({
      success:        true,
      message:        "Inquiry created successfully",
      inquiry:        inquiry,
      assignedCount:  assignedCount,
    });
  } catch (error) {
    console.error("Error creating inquiry:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to create inquiry",
      error:   error.message,
    });
  }
};

/**
 * Find eligible users for an inquiry
 * - isProperty true  → Owner, Broker, Builder whose enquiryCities includes the inquiry city
 * - isProperty false → Broker and Builder only whose enquiryCities includes the inquiry city
 * - Excludes the inquiry creator
 * - Profile must be complete (name, mobile, role)
 */
const findEligibleUsers = async (inquiry) => {
  try {
    const OWNER_ROLE_ID   = new Types.ObjectId(process.env.OWNER_ROLE_ID);
    const BROKER_ROLE_ID  = new Types.ObjectId(process.env.BROKER_ROLE_ID);
    const BUILDER_ROLE_ID = new Types.ObjectId(process.env.BUILDER_ROLE_ID);

    const roleFilter = inquiry.isProperty
      ? { role: { $in: [OWNER_ROLE_ID, BROKER_ROLE_ID, BUILDER_ROLE_ID] } }
      : { role: { $in: [BROKER_ROLE_ID, BUILDER_ROLE_ID] } };

    const users = await SystemUser.find({
      ...roleFilter,
      enquiryCities: inquiry.preferredCity,
      name:   { $exists: true, $ne: "" },
      mobile: { $exists: true, $ne: "" },
      _id:    { $ne: inquiry.createdBy.id },
    }).select("_id name mobile role").populate("role", "name");

    return users.map((u) => ({ id: u._id, name: u.name, mobile: u.mobile, role: u.role?.name ?? null, roleId: u.role?._id ?? null }));
  } catch (error) {
    console.error("Error finding eligible users:", error);
    return [];
  }
};

/**
 * Create AssignedInquiry records for all eligible users
 * - Uses insertMany with ordered: false so one duplicate doesn't block the rest
 * - assignmentSource is set to "automatic"
 * - Returns the count of successfully created records
 */
const createAssignments = async (inquiry) => {
  try {
    const eligibleUsers = await findEligibleUsers(inquiry);

    if (!eligibleUsers.length) return 0;

    const assignments = eligibleUsers.map((u) => ({
      inquiry:          inquiry._id,
      assignedTo: {
        id:     u.id,
        name:   u.name,
        mobile: u.mobile,
        role:   u.roleId,
      },
      assignedAt:       new Date(),
      status:           "active",
      assignmentSource: "automatic",
    }));

    const result = await AssignedInquiry.insertMany(assignments, { ordered: false });
    return result.length;
  } catch (error) {
    // ordered: false — partial inserts are fine, just log and return 0
    console.error("Error creating assignments:", error);
    return 0;
  }
};

/**
 * Cron job handler — GET /api/mixed/inquiries/cron-assign
 * Secured via x-cron-secret header — no user auth required
 *
 * Flow:
 *  1. Fetch all active inquiries
 *  2. For each inquiry find eligible users
 *  3. insertMany with ordered: false — unique index silently skips already-assigned users
 *  4. Return summary of processed inquiries and total new assignments created
 */
const runCronAssignment = async (req, res) => {
  try {
    // Fetch all active inquiries
    const inquiries = await Inquiry.find({ status: "active" });

    if (!inquiries.length) {
      return res.status(200).json({
        success: true,
        message: "No active inquiries found",
        processed: 0,
        newAssignments: 0,
      });
    }

    let totalNewAssignments = 0;

    for (const inquiry of inquiries) {
      const eligibleUsers = await findEligibleUsers(inquiry);
      if (!eligibleUsers.length) continue;

      const assignments = eligibleUsers.map((u) => ({
        inquiry:          inquiry._id,
        assignedTo: {
          id:     u.id,
          name:   u.name,
          mobile: u.mobile,
          role:   u.roleId,
        },
        assignedAt:       new Date(),
        status:           "active",
        assignmentSource: "cron",
      }));

      try {
        const result = await AssignedInquiry.insertMany(assignments, { ordered: false });
        totalNewAssignments += result.length;
      } catch (insertErr) {
        // BulkWriteError with code 11000 = duplicate key — already assigned users skipped
        // Count only the successfully inserted ones
        if (insertErr.insertedDocs) {
          totalNewAssignments += insertErr.insertedDocs.length;
        }
      }
    }

    return res.status(200).json({
      success:        true,
      message:        "Cron assignment completed",
      processed:      inquiries.length,
      newAssignments: totalNewAssignments,
    });
  } catch (error) {
    console.error("Error in cron assignment:", error);
    return res.status(500).json({
      success: false,
      message: "Cron assignment failed",
      error:   error.message,
    });
  }
};

module.exports = { createInquiry, runCronAssignment };
