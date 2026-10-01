const mongoose = require("mongoose");
const { Inquiry } = require("../../mixed/inquiries/model");
const { AssignedInquiry } = require("../../mixed/inquiries/assignedInquiriesModel");
const SystemUserRole = require("../systemUsersRoles/model");

// Register referenced models before populating inquiry property fields.
require("../propertyPurposes/model");
require("../propertyCategories/model");
require("../propertyTypes/model");
require("../systemUsersRoles/model");

const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const getPagination = (query) => {
  const page = Math.max(1, parseInt(query.page, 10) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(query.limit, 10) || 10));
  return { page, limit, skip: (page - 1) * limit };
};

const invalidObjectId = (value) => !mongoose.isValidObjectId(value);

const parseDateOnly = (value) => {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const date = new Date(`${value}T00:00:00.000Z`);
  return Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== value ? null : date;
};

const getInquiryRoles = async (_req, res) => {
  try {
    const roles = await SystemUserRole.find({
      isActive: true,
      name: { $in: [/^customer$/i, /^broker$/i, /^builder$/i, /^owner$/i] },
    })
      .select("name")
      .lean();

    const roleOrder = ["customer", "broker", "builder", "owner"];
    roles.sort((a, b) => roleOrder.indexOf(a.name.toLowerCase()) - roleOrder.indexOf(b.name.toLowerCase()));

    return res.status(200).json({ success: true, data: roles });
  } catch (error) {
    console.error("Error fetching inquiry roles:", error);
    return res.status(500).json({ success: false, message: "Failed to fetch inquiry roles" });
  }
};

const getInquiries = async (req, res) => {
  try {
    const filter = {};
    const { page, limit, skip } = getPagination(req.query);

    if (req.query.status) filter.status = req.query.status;
    if (req.query.classification) filter.inquiryClassification = req.query.classification;

    const hasFromDate = req.query.fromDate !== undefined;
    const hasToDate = req.query.toDate !== undefined;
    if (hasFromDate || hasToDate) {
      const fromDate = hasFromDate ? parseDateOnly(req.query.fromDate) : null;
      const toDate = hasToDate ? parseDateOnly(req.query.toDate) : null;
      if ((hasFromDate && !fromDate) || (hasToDate && !toDate)) {
        return res.status(400).json({ success: false, message: "fromDate and toDate must use YYYY-MM-DD format" });
      }
      if (fromDate && toDate && fromDate > toDate) {
        return res.status(400).json({ success: false, message: "fromDate must be on or before toDate" });
      }
      filter.createdAt = {};
      if (fromDate) filter.createdAt.$gte = fromDate;
      if (toDate) {
        const endOfToDate = new Date(toDate);
        endOfToDate.setUTCHours(23, 59, 59, 999);
        filter.createdAt.$lte = endOfToDate;
      }
    }

    if (req.query.isProperty !== undefined) {
      if (!["true", "false"].includes(req.query.isProperty)) {
        return res.status(400).json({ success: false, message: "isProperty must be true or false" });
      }
      filter.isProperty = req.query.isProperty === "true";
    }

    // Old-style direct field filters
    for (const [queryKey, field] of [
      ["listingType",      "listingType"],
      ["propertyCategory", "propertyCategory"],
      ["propertyType",     "propertyType"],
      ["createdById",      "createdBy.id"],
    ]) {
      if (!req.query[queryKey]) continue;
      if (invalidObjectId(req.query[queryKey])) {
        return res.status(400).json({ success: false, message: `${queryKey} must be a valid ID` });
      }
      filter[field] = req.query[queryKey];
    }

    // Purpose / category / propertyType filters (PropertiesPage naming convention)
    for (const [queryKey, field] of [
      ["purposeId",      "listingType"],
      ["categoryId",     "propertyCategory"],
      // Match the property-listing endpoint's typeId query parameter.
      ["typeId",          "propertyType"],
      ["propertyTypeId", "propertyType"],
    ]) {
      if (!req.query[queryKey]) continue;
      if (invalidObjectId(req.query[queryKey])) {
        return res.status(400).json({ success: false, message: `${queryKey} must be a valid ID` });
      }
      filter[field] = req.query[queryKey];
    }

    if (req.query.roleId) {
      if (invalidObjectId(req.query.roleId)) {
        return res.status(400).json({ success: false, message: "roleId must be a valid ID" });
      }
      filter["createdBy.role"] = req.query.roleId;
    }

    if (req.query.userId) {
      if (invalidObjectId(req.query.userId)) {
        return res.status(400).json({ success: false, message: "userId must be a valid ID" });
      }
      filter["createdBy.id"] = req.query.userId;
    }

    if (typeof req.query.search === "string" && req.query.search.trim()) {
      const search = new RegExp(escapeRegex(req.query.search.trim()), "i");
      filter.$or = [
        { preferredCity: search },
        { preferredArea: search },
      ];
    }

    const [inquiries, total, statsResult] = await Promise.all([
      Inquiry.find(filter)
        .populate("listingType", "name")
        .populate("propertyCategory", "name")
        .populate("propertyType", "name")
        .populate("createdBy.role", "name")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Inquiry.countDocuments(filter),
      Inquiry.aggregate([
        { $match: filter },
        {
          $group: {
            _id: null,
            active: { $sum: { $cond: [{ $eq: ["$status", "active"] }, 1, 0] } },
            expired: { $sum: { $cond: [{ $eq: ["$status", "expired"] }, 1, 0] } },
            hot: { $sum: { $cond: [{ $eq: ["$inquiryClassification", "hot"] }, 1, 0] } },
            warm: { $sum: { $cond: [{ $eq: ["$inquiryClassification", "warm"] }, 1, 0] } },
            cold: { $sum: { $cond: [{ $eq: ["$inquiryClassification", "cold"] }, 1, 0] } },
          },
        },
      ]),
    ]);

    const inquiryIds = inquiries.map(({ _id }) => _id);
    const assignmentStats = inquiryIds.length
      ? await AssignedInquiry.aggregate([
          { $match: { inquiry: { $in: inquiryIds } } },
          {
            $group: {
              _id: "$inquiry",
              totalAssigned: { $sum: 1 },
              totalPurchased: { $sum: { $cond: [{ $eq: ["$status", "purchased"] }, 1, 0] } },
            },
          },
        ])
      : [];
    const assignmentStatsByInquiryId = new Map(
      assignmentStats.map(({ _id, totalAssigned, totalPurchased }) => [String(_id), { totalAssigned, totalPurchased }])
    );
    const inquiriesWithAssignmentStats = inquiries.map((inquiry) => ({
      ...inquiry,
      totalAssigned: assignmentStatsByInquiryId.get(String(inquiry._id))?.totalAssigned ?? 0,
      totalPurchased: assignmentStatsByInquiryId.get(String(inquiry._id))?.totalPurchased ?? 0,
    }));

    const { active = 0, expired = 0, hot = 0, warm = 0, cold = 0 } = statsResult[0] || {};
    const stats = { active, expired, hot, warm, cold };

    return res.status(200).json({
      success: true,
      data: inquiriesWithAssignmentStats,
      stats,
      pagination: { total, page, limit, totalPages: Math.ceil(total / limit) },
    });
  } catch (error) {
    console.error("Error fetching admin inquiries:", error);
    return res.status(500).json({ success: false, message: "Failed to fetch inquiries" });
  }
};

const getAssignedInquiries = async (req, res) => {
  try {
    const filter = {};
    const { page, limit, skip } = getPagination(req.query);

    if (req.query.status) filter.status = req.query.status;
    if (req.query.assignmentSource) filter.assignmentSource = req.query.assignmentSource;
    if (req.query.purchasedVia) filter.purchasedVia = req.query.purchasedVia;

    if (req.query.inquiryId) {
      if (invalidObjectId(req.query.inquiryId)) {
        return res.status(400).json({ success: false, message: "inquiryId must be a valid ID" });
      }
      filter.inquiry = req.query.inquiryId;
    }
    if (req.query.assignedToId) {
      if (invalidObjectId(req.query.assignedToId)) {
        return res.status(400).json({ success: false, message: "assignedToId must be a valid ID" });
      }
      filter["assignedTo.id"] = req.query.assignedToId;
    }

    const [assignments, total, statusStats] = await Promise.all([
      AssignedInquiry.find(filter)
        .populate({
          path: "inquiry",
          populate: [
            { path: "listingType", select: "name" },
            { path: "propertyCategory", select: "name" },
            { path: "propertyType", select: "name" },
          ],
        })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      AssignedInquiry.countDocuments(filter),
      AssignedInquiry.aggregate([
        { $match: filter },
        { $group: { _id: "$status", count: { $sum: 1 } } },
      ]),
    ]);

    const stats = { active: 0, purchased: 0 };
    statusStats.forEach(({ _id, count }) => { if (_id in stats) stats[_id] = count; });

    return res.status(200).json({
      success: true,
      data: assignments,
      stats,
      pagination: { total, page, limit, totalPages: Math.ceil(total / limit) },
    });
  } catch (error) {
    console.error("Error fetching admin assigned inquiries:", error);
    return res.status(500).json({ success: false, message: "Failed to fetch assigned inquiries" });
  }
};

const getAssignedInquiriesByInquiryId = async (req, res) => {
  try {
    const { inquiryId } = req.params;
    if (invalidObjectId(inquiryId)) {
      return res.status(400).json({ success: false, message: "inquiryId must be a valid ID" });
    }

    const { page, limit, skip } = getPagination(req.query);
    const filter = { inquiry: inquiryId };
    const [assignments, total, totalPurchased] = await Promise.all([
      AssignedInquiry.find(filter)
        .populate({ path: "assignedTo.role", model: SystemUserRole, select: "name" })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      AssignedInquiry.countDocuments(filter),
      AssignedInquiry.countDocuments({ ...filter, status: "purchased" }),
    ]);
    const stats = {
      totalAssigned: total,
      totalPurchased,
    };

    return res.status(200).json({
      success: true,
      data: assignments,
      count: total,
      stats,
      pagination: { total, page, limit, totalPages: Math.ceil(total / limit) },
    });
  } catch (error) {
    console.error("Error fetching assignments for inquiry:", error);
    return res.status(500).json({ success: false, message: "Failed to fetch inquiry assignments" });
  }
};

module.exports = { getInquiries, getAssignedInquiries, getAssignedInquiriesByInquiryId, getInquiryRoles };
