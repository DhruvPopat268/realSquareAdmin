const mongoose = require("mongoose");
const { Types } = mongoose;
const { Inquiry }          = require("./model");
const { AssignedInquiry }  = require("./assignedInquiriesModel");
const SystemUser           = require("../../systemUsers.model");
const EnquiryPurchasedPlan  = require("../enquiryPurchasedPlans/model");
const UserCoinsWallet       = require("../userCoinsWallet/model");
const CoinsTransaction      = require("../coinsTransactions/model");
const LeadEnquiryCoinsConfig = require("../../admin/leadEnquiryCoinsConfig/model");

const ROLE_USERTYPE_MAP = {
  [process.env.OWNER_ROLE_ID]: "Owner",
  [process.env.BROKER_ROLE_ID]: "Broker",
  [process.env.BUILDER_ROLE_ID]: "Builder",
};

/**
 * Create a new inquiry
 * Returns the created inquiry and list of eligible users for assignment
 */
const createInquiry = async (req, res) => {
  try {
    if (req.body?.isProperty !== true) {
      return res.status(400).json({
        success: false,
        message: "Only individual property enquiries are supported",
      });
    }

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
      inquiryClassification,
      lastFollowUpDate,
      preferredCommunication,
      status: "active",
      ...(furnishingType                  && { furnishingType }),
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

/**
 * Cron job handler — GET /api/mixed/inquiries/cron-expire
 * Marks active inquiries with a lastFollowUpDate before today's UTC date as expired.
 */
const expireOldInquiries = async (req, res) => {
  try {
    const checkedAt = new Date();
    const currentDate = new Date(Date.UTC(
      checkedAt.getUTCFullYear(),
      checkedAt.getUTCMonth(),
      checkedAt.getUTCDate()
    ));
    const result = await Inquiry.updateMany(
      {
        status: "active",
        lastFollowUpDate: { $lt: currentDate },
      },
      { $set: { status: "expired" } }
    );

    return res.status(200).json({
      success: true,
      message: "Expired inquiries updated successfully",
      data: {
        expiredCount: result.modifiedCount,
        checkedAt,
      },
    });
  } catch (error) {
    console.error("Error expiring inquiries from cron:", error);
    return res.status(500).json({ success: false, message: "Failed to expire inquiries" });
  }
};

/**
 * Get all assigned inquiries for the logged-in user
 * GET /api/mixed/inquiries/assigned
 *
 * Supported query params:
 *   page, limit
 *   status         — assignment status: "active" | "purchased"
 *   classification — inquiry classification: "hot" | "warm" | "cold"
 *   purposeId      — inquiry listingType ObjectId
 *   categoryId     — inquiry propertyCategory ObjectId
 *   typeId         — inquiry propertyType ObjectId
 *   search         — searches preferredCity, preferredArea, createdBy.name, createdBy.mobile
 *                    (createdBy fields only visible for purchased assignments)
 * Closed enquiries (expired, inactive, completed, or rejected) are hidden for active/locked
 * assignments, while purchased assignments remain visible. stats.total counts
 * the visible assignments and is independent of list filters.
 */
const getAssignedInquiries = async (req, res) => {
  try {
    const userId = req.user?._id;
    const page   = Math.max(1, parseInt(req.query.page)  || 1);
    const limit  = Math.max(1, parseInt(req.query.limit) || 10);
    const skip   = (page - 1) * limit;

    // ── Base assignments for this user ────────────────────────────────────────
    const assignmentMatch = { "assignedTo.id": userId };

    // ── Build the post-lookup match on the joined inquiry ────────────────────
    const inquiryMatch = {};
    if (req.query.classification) inquiryMatch["inquiry.inquiryClassification"] = req.query.classification;
    if (req.query.purposeId)      inquiryMatch["inquiry.listingType"]            = new Types.ObjectId(req.query.purposeId);
    if (req.query.categoryId)     inquiryMatch["inquiry.propertyCategory"]       = new Types.ObjectId(req.query.categoryId);
    if (req.query.typeId)         inquiryMatch["inquiry.propertyType"]           = new Types.ObjectId(req.query.typeId);
    if (req.query.search) {
      const regex = new RegExp(req.query.search, "i");
      inquiryMatch.$or = [
        { "inquiry.preferredCity":    regex },
        { "inquiry.preferredArea":    regex },
        { "inquiry.createdBy.name":   regex },
        { "inquiry.createdBy.mobile": regex },
      ];
    }

    const inquiryJoinPipeline = [
      {
        $lookup: {
          from:         "inquiries",
          localField:   "inquiry",
          foreignField: "_id",
          as:           "inquiry",
        },
      },
      { $unwind: { path: "$inquiry", preserveNullAndEmptyArrays: false } },
      // Keep purchased enquiries accessible after closure, but hide closed locked cards.
      {
        $match: {
          $or: [
            { status: "purchased" },
            // Only active enquiries remain visible to users who have not unlocked them.
            { status: "active", "inquiry.status": "active" },
          ],
        },
      },
    ];

    // Stats describe the assignments visible to the user, regardless of list filters.
    const visibleAssignmentsPipeline = [
      { $match: assignmentMatch },
      ...inquiryJoinPipeline,
    ];

    // List and pagination respect both assignment and inquiry filters.
    const hasInquiryFilters = Object.keys(inquiryMatch).length > 0;
    const basePipeline = [
      { $match: { ...assignmentMatch, ...(req.query.status ? { status: req.query.status } : {}) } },
      ...inquiryJoinPipeline,
      ...(hasInquiryFilters ? [{ $match: inquiryMatch }] : []),
    ];

    const [countResult, assignments, statusStats, classStats] = await Promise.all([
      AssignedInquiry.aggregate([...basePipeline, { $count: "total" }]),
      AssignedInquiry.aggregate([
        ...basePipeline,
        { $sort: { createdAt: -1 } },
        { $skip: skip },
        { $limit: limit },
        // Lookup and replace listingType
        {
          $lookup: {
            from:         "propertypurposes",
            localField:   "inquiry.listingType",
            foreignField: "_id",
            as:           "inquiry.listingType",
          },
        },
        { $set: { "inquiry.listingType": { $arrayElemAt: ["$inquiry.listingType", 0] } } },
        // Lookup and replace propertyCategory
        {
          $lookup: {
            from:         "propertycategories",
            localField:   "inquiry.propertyCategory",
            foreignField: "_id",
            as:           "inquiry.propertyCategory",
          },
        },
        { $set: { "inquiry.propertyCategory": { $arrayElemAt: ["$inquiry.propertyCategory", 0] } } },
        // Lookup and replace propertyType
        {
          $lookup: {
            from:         "propertytypes",
            localField:   "inquiry.propertyType",
            foreignField: "_id",
            as:           "inquiry.propertyType",
          },
        },
        { $set: { "inquiry.propertyType": { $arrayElemAt: ["$inquiry.propertyType", 0] } } },
        // Only keep name from each ref
        {
          $set: {
            "inquiry.listingType":      { $cond: { if: { $ifNull: ["$inquiry.listingType._id", false] }, then: { _id: "$inquiry.listingType._id", name: "$inquiry.listingType.name" }, else: null } },
            "inquiry.propertyCategory": { $cond: { if: { $ifNull: ["$inquiry.propertyCategory._id", false] }, then: { _id: "$inquiry.propertyCategory._id", name: "$inquiry.propertyCategory.name" }, else: null } },
            "inquiry.propertyType":     { $cond: { if: { $ifNull: ["$inquiry.propertyType._id", false] }, then: { _id: "$inquiry.propertyType._id", name: "$inquiry.propertyType.name" }, else: null } },
          },
        },
      ]),
      AssignedInquiry.aggregate([
        ...visibleAssignmentsPipeline,
        { $group: { _id: "$status", count: { $sum: 1 } } },
      ]),
      // Classification stats use the same visible assignment set.
      AssignedInquiry.aggregate([
        ...visibleAssignmentsPipeline,
        { $group: { _id: "$inquiry.inquiryClassification", count: { $sum: 1 } } },
      ]),
    ]);

    const total = countResult[0]?.total ?? 0;

    const statsCounts = { total: 0, active: 0, purchased: 0, hot: 0, warm: 0, cold: 0 };
    statusStats.forEach(({ _id, count }) => { if (_id in statsCounts) statsCounts[_id] = count; });
    classStats.forEach(({ _id, count })  => { if (_id in statsCounts) statsCounts[_id] = count; });
    statsCounts.total = statsCounts.active + statsCounts.purchased;

    // ── Mask createdBy fields for non-purchased assignments ──────────────────
    const masked = assignments.map((a) => {
      if (a.status === "purchased" || !a.inquiry?.createdBy) return a;
      return {
        ...a,
        inquiry: {
          ...a.inquiry,
          createdBy: {
            ...a.inquiry.createdBy,
            id:     "****",
            name:   "****",
            mobile: "****",
            role:   "****",
          },
        },
      };
    });

    return res.status(200).json({
      success: true,
      data: {
        assignments: masked,
        pagination:  { total, page, limit, totalPages: Math.ceil(total / limit) },
        stats:       statsCounts,
      },
    });
  } catch (error) {
    console.error("Error fetching assigned inquiries:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch assigned inquiries",
      error:   error.message,
    });
  }
};

/**
 * Get all inquiries created by the logged-in user
 * GET /api/mixed/inquiries/my?page=1&limit=10
 * Returns paginated Inquiry records where createdBy.id matches the logged-in user;
 * stats.total equals the filtered record count in pagination.total.
 */
const getMyInquiries = async (req, res) => {
  try {
    const userId = req.user?._id;
    const page   = Math.max(1, parseInt(req.query.page)  || 1);
    const limit  = Math.max(1, parseInt(req.query.limit) || 10);
    const skip   = (page - 1) * limit;

    const filter = { "createdBy.id": userId };
    if (req.query.purposeId)        filter.listingType             = req.query.purposeId;
    if (req.query.categoryId)       filter.propertyCategory        = req.query.categoryId;
    if (req.query.typeId)           filter.propertyType            = req.query.typeId;
    if (req.query.status) {
      if (!["active", "expired", "inactive", "completed", "rejected"].includes(req.query.status)) {
        return res.status(400).json({ success: false, message: "Unsupported inquiry status filter" });
      }
      filter.status = req.query.status;
    }
    if (req.query.classification)   filter.inquiryClassification   = req.query.classification;
    if (req.query.search) {
      const regex = new RegExp(req.query.search, "i");
      filter.$or = [
        { preferredCity: regex },
        { preferredArea: regex },
      ];
    }

    const [inquiries, total, statusStats, classStats] = await Promise.all([
      Inquiry.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate("listingType",      "name")
        .populate("propertyCategory", "name")
        .populate("propertyType",     "name")
        .lean(),
      Inquiry.countDocuments(filter),
      Inquiry.aggregate([
        { $match: filter },
        { $group: { _id: "$status", count: { $sum: 1 } } },
      ]),
      Inquiry.aggregate([
        { $match: filter },
        { $group: { _id: "$inquiryClassification", count: { $sum: 1 } } },
      ]),
    ]);

    const statusCounts = { active: 0, expired: 0, inactive: 0, completed: 0, rejected: 0 };
    statusStats.forEach(({ _id, count }) => { if (_id in statusCounts) statusCounts[_id] = count; });

    const classCounts = { hot: 0, warm: 0, cold: 0 };
    classStats.forEach(({ _id, count }) => { if (_id in classCounts) classCounts[_id] = count; });

    return res.status(200).json({
      success: true,
      data: {
        inquiries,
        pagination: { total, page, limit, totalPages: Math.ceil(total / limit) },
        stats: { total, ...statusCounts, ...classCounts },
      },
    });
  } catch (error) {
    console.error("Error fetching user inquiries:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch inquiries",
      error:   error.message,
    });
  }
};

/**
 * Let the creator close an active inquiry as inactive or completed.
 * PATCH /api/mixed/inquiries/status
 * Body: { inquiryId, status: "inactive" | "completed" }
 */
const updateMyInquiryStatus = async (req, res) => {
  const { inquiryId, status } = req.body ?? {};
  if (!mongoose.isValidObjectId(inquiryId)) {
    return res.status(400).json({ success: false, message: "inquiryId must be a valid ID" });
  }
  if (!["inactive", "completed"].includes(status)) {
    return res.status(400).json({ success: false, message: 'status must be "inactive" or "completed"' });
  }

  try {
    const inquiry = await Inquiry.findOneAndUpdate(
      { _id: inquiryId, "createdBy.id": req.user._id, status: "active" },
      { $set: { status } },
      { new: true, runValidators: true }
    );
    if (inquiry) {
      return res.status(200).json({ success: true, message: "Inquiry status updated successfully", data: inquiry });
    }

    const ownedInquiry = await Inquiry.findOne({ _id: inquiryId, "createdBy.id": req.user._id }).select("_id");
    if (!ownedInquiry) {
      return res.status(404).json({ success: false, message: "Inquiry not found" });
    }
    return res.status(409).json({ success: false, message: "Only active inquiries can be updated" });
  } catch (error) {
    console.error("Error updating user inquiry status:", error);
    return res.status(500).json({ success: false, message: "Failed to update inquiry status" });
  }
};

/**
 * Purchase an assigned inquiry with one active enquiry-plan credit or coins.
 * PATCH /api/mixed/inquiries/purchase
 * Body: { assignmentId, purchasedVia: "plan" | "coins" }
 */
const purchaseAssignedInquiry = async (req, res) => {
  const assignmentId = req.body?.assignmentId;
  const purchasedVia = req.body?.purchasedVia;
  if (!mongoose.isValidObjectId(assignmentId)) {
    return res.status(400).json({ success: false, message: "assignmentId must be a valid ID" });
  }
  if (!["plan", "coins"].includes(purchasedVia)) {
    return res.status(400).json({ success: false, message: 'purchasedVia must be "plan" or "coins"' });
  }

  const userType = ROLE_USERTYPE_MAP[req.userRole];
  if (!userType) {
    return res.status(403).json({ success: false, message: "Only owners, brokers, and builders can purchase assigned inquiries" });
  }

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const assignment = await AssignedInquiry.findOne({
      _id: assignmentId,
      "assignedTo.id": req.user._id,
    }).session(session);

    if (!assignment) {
      const error = new Error("Assigned inquiry not found");
      error.status = 404;
      throw error;
    }
    if (assignment.status === "purchased") {
      const error = new Error("This inquiry has already been purchased");
      error.status = 409;
      throw error;
    }

    const inquiry = await Inquiry.findById(assignment.inquiry)
      .select("status")
      .session(session);
    if (!inquiry) {
      const error = new Error("Inquiry not found");
      error.status = 404;
      throw error;
    }
    if (inquiry.status === "expired") {
      const error = new Error("This inquiry has expired and cannot be purchased");
      error.status = 409;
      throw error;
    }
    if (inquiry.status === "rejected") {
      const error = new Error("This inquiry is rejected and cannot be purchased");
      error.status = 409;
      throw error;
    }
    if (inquiry.status !== "active") {
      const error = new Error(`This inquiry is ${inquiry.status} and cannot be purchased`);
      error.status = 409;
      throw error;
    }

    let purchaseDetails = {};

    if (purchasedVia === "plan") {
      const plan = await EnquiryPurchasedPlan.findOne({
        user: req.user._id,
        status: "Active",
      }).session(session);

      if (!plan || (plan.expiryDate && plan.expiryDate <= new Date())) {
        const error = new Error("No active enquiry plan with available credits was found");
        error.status = 400;
        throw error;
      }
      if (plan.plan.numberOfEnquiriesGiven !== -1 && plan.enquiriesUsed >= plan.plan.numberOfEnquiriesGiven) {
        const error = new Error("Your enquiry plan has no remaining credits");
        error.status = 400;
        throw error;
      }

      // Compare the usage count so concurrent purchases cannot spend one credit twice.
      const updatedPlan = await EnquiryPurchasedPlan.findOneAndUpdate(
        { _id: plan._id, status: "Active", enquiriesUsed: plan.enquiriesUsed },
        { $inc: { enquiriesUsed: 1 } },
        { new: true, session }
      );
      if (!updatedPlan) {
        const error = new Error("Your enquiry plan changed during purchase. Please try again");
        error.status = 409;
        throw error;
      }
      purchaseDetails.enquiriesUsed = updatedPlan.enquiriesUsed;
      assignment.coinsUsed = undefined;
    } else {
      const coinsConfig = await LeadEnquiryCoinsConfig.findOne({ _configKey: "singleton" })
        .select("coinsPerEnquiry")
        .session(session);
      const coinsRequired = coinsConfig?.coinsPerEnquiry ?? 0;
      if (coinsRequired <= 0) {
        const error = new Error("Coin purchase is not currently configured");
        error.status = 400;
        throw error;
      }

      const wallet = await UserCoinsWallet.findOneAndUpdate(
        { user: req.user._id, currentBalance: { $gte: coinsRequired } },
        { $inc: { currentBalance: -coinsRequired, totalDebitedCoins: coinsRequired } },
        { new: true, session }
      );
      if (!wallet) {
        const error = new Error("Insufficient coins balance");
        error.status = 400;
        throw error;
      }

      await CoinsTransaction.create([{
        user: req.user._id,
        userType,
        type: "Debit",
        coins: coinsRequired,
        reason: "InquiryPurchase",
        refId: assignment._id,
        refModel: "AssignedInquiry",
        balanceBefore: wallet.currentBalance + coinsRequired,
        balanceAfter: wallet.currentBalance,
        note: "Coins spent to unlock an assigned inquiry",
      }], { session });
      assignment.coinsUsed = coinsRequired;
      purchaseDetails.coinsUsed = coinsRequired;
      purchaseDetails.coinsBalance = wallet.currentBalance;
    }

    assignment.status = "purchased";
    assignment.purchasedAt = new Date();
    assignment.purchasedVia = purchasedVia;
    await assignment.save({ session });

    await session.commitTransaction();
    return res.status(200).json({
      success: true,
      message: "Inquiry purchased successfully",
      data: { assignment, purchasedVia, ...purchaseDetails },
    });
  } catch (error) {
    await session.abortTransaction();
    console.error("Error purchasing assigned inquiry:", error);
    return res.status(error.status || 500).json({
      success: false,
      message: error.status ? error.message : "Failed to purchase inquiry",
    });
  } finally {
    session.endSession();
  }
};

module.exports = {
  createInquiry,
  runCronAssignment,
  expireOldInquiries,
  getAssignedInquiries,
  getMyInquiries,
  updateMyInquiryStatus,
  purchaseAssignedInquiry,
};
