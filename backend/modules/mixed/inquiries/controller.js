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

// Ensure these models are registered before populate runs
require("../../admin/propertyPurposes/model");
require("../../admin/propertyCategories/model");
require("../../admin/propertyTypes/model");

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
 */
const getAssignedInquiries = async (req, res) => {
  try {
    const userId = req.user?._id;
    const page   = Math.max(1, parseInt(req.query.page)  || 1);
    const limit  = Math.max(1, parseInt(req.query.limit) || 10);
    const skip   = (page - 1) * limit;

    // ── Build the base match on AssignedInquiry ──────────────────────────────
    const assignmentMatch = { "assignedTo.id": userId };
    if (req.query.status) assignmentMatch.status = req.query.status;

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

    const hasInquiryFilters = Object.keys(inquiryMatch).length > 0;

    // ── Aggregation pipeline ─────────────────────────────────────────────────
    const basePipeline = [
      { $match: assignmentMatch },
      {
        $lookup: {
          from:         "inquiries",
          localField:   "inquiry",
          foreignField: "_id",
          as:           "inquiry",
        },
      },
      { $unwind: { path: "$inquiry", preserveNullAndEmptyArrays: false } },
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
      // Stats — always run on the base match (no filters) so counts reflect all assignments
      AssignedInquiry.aggregate([
        { $match: { "assignedTo.id": userId } },
        { $group: { _id: "$status", count: { $sum: 1 } } },
      ]),
      // Classification stats — join inquiry to get classification counts
      AssignedInquiry.aggregate([
        { $match: { "assignedTo.id": userId } },
        {
          $lookup: {
            from:         "inquiries",
            localField:   "inquiry",
            foreignField: "_id",
            as:           "inquiry",
          },
        },
        { $unwind: { path: "$inquiry", preserveNullAndEmptyArrays: false } },
        { $group: { _id: "$inquiry.inquiryClassification", count: { $sum: 1 } } },
      ]),
    ]);

    const total = countResult[0]?.total ?? 0;

    const statsCounts = { active: 0, purchased: 0, hot: 0, warm: 0, cold: 0 };
    statusStats.forEach(({ _id, count }) => { if (_id in statsCounts) statsCounts[_id] = count; });
    classStats.forEach(({ _id, count })  => { if (_id in statsCounts) statsCounts[_id] = count; });

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
 * Returns paginated Inquiry records where createdBy.id matches the logged-in user
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
    if (req.query.status)           filter.status                  = req.query.status;
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

    const statusCounts = { active: 0, expired: 0 };
    statusStats.forEach(({ _id, count }) => { if (_id in statusCounts) statusCounts[_id] = count; });

    const classCounts = { hot: 0, warm: 0, cold: 0 };
    classStats.forEach(({ _id, count }) => { if (_id in classCounts) classCounts[_id] = count; });

    return res.status(200).json({
      success: true,
      data: {
        inquiries,
        pagination: { total, page, limit, totalPages: Math.ceil(total / limit) },
        stats: { ...statusCounts, ...classCounts },
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
 * Purchase an assigned inquiry with one active enquiry-plan credit or coins.
 * PATCH /api/mixed/inquiries/:assignmentId/purchase
 * Body: { purchasedVia: "plan" | "coins" }
 */
const purchaseAssignedInquiry = async (req, res) => {
  const purchasedVia = req.body?.purchasedVia;
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
      _id: req.params.assignmentId,
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

module.exports = { createInquiry, runCronAssignment, getAssignedInquiries, getMyInquiries, purchaseAssignedInquiry };
