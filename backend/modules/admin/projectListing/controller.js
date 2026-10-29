const mongoose = require("mongoose");
const ProjectListing = require("../../mixed/projectListing/model");

const STATUSES = ["Active", "Inactive", "UnderReview", "Rejected", "Sold"];
const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

function buildQuery(query) {
  const filter = {};
  if (query.categoryId) {
    if (!mongoose.isValidObjectId(query.categoryId)) throw new Error("Invalid categoryId");
    filter["category.id"] = new mongoose.Types.ObjectId(query.categoryId);
  }
  if (query.roleId) {
    if (!mongoose.isValidObjectId(query.roleId)) throw new Error("Invalid roleId");
    filter["listedBy.role.id"] = new mongoose.Types.ObjectId(query.roleId);
  }
  if (query.userId) {
    if (!mongoose.isValidObjectId(query.userId)) throw new Error("Invalid userId");
    filter["listedBy.id"] = new mongoose.Types.ObjectId(query.userId);
  }
  if (query.status) {
    if (!STATUSES.includes(query.status)) throw new Error("Invalid status");
    // Include legacy lowercase Sold records in admin filtering.
    filter.status = query.status === "Sold" ? { $in: ["Sold", "sold"] } : query.status;
  }
  if (typeof query.city === "string" && query.city.trim()) {
    const city = query.city.trim().slice(0, 100);
    const locationSearch = { $regex: escapeRegex(city), $options: "i" };
    filter.$or = [{ cityName: locationSearch }, { "locality.address": locationSearch }];
  }
  return filter;
}

const getAll = async (req, res) => {
  try {
    const page = Math.max(1, Number.parseInt(req.query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, Number.parseInt(req.query.limit, 10) || 10));
    const filter = buildQuery(req.query);
    const [records, total, statusGroups] = await Promise.all([
      ProjectListing.find(filter)
        .select("category projectName developerName cityName locality listedBy media.images status approvedAt rejectedAt rejectedReasons idealFor projectStatus possessionDate minPrice maxPrice totalUnits availableUnits towerCount residentialDetails commercialDetails rera.reraId createdAt updatedAt")
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      ProjectListing.countDocuments(filter),
      ProjectListing.aggregate([
        { $match: filter },
        { $group: { _id: "$status", count: { $sum: 1 } } },
      ]),
    ]);

    const stats = { total: 0, Active: 0, Inactive: 0, Sold: 0, UnderReview: 0, Rejected: 0 };
    for (const group of statusGroups) {
      const status = group._id === "sold" ? "Sold" : group._id;
      if (Object.hasOwn(stats, status)) stats[status] += group.count;
      stats.total += group.count;
    }

    return res.json({
      success: true,
      data: { projects: records, stats },
      pagination: { total, page, limit, totalPages: Math.ceil(total / limit) },
    });
  } catch (error) {
    return res.status(error.message.startsWith("Invalid ") ? 400 : 500).json({ success: false, message: error.message });
  }
};

const getById = async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) return res.status(400).json({ success: false, message: "Invalid project listing ID" });
    const project = await ProjectListing.findById(req.params.id).lean();
    if (!project) return res.status(404).json({ success: false, message: "Project listing not found" });
    return res.json({ success: true, data: project });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

const approve = async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) return res.status(400).json({ success: false, message: "Invalid project listing ID" });
    const project = await ProjectListing.findOneAndUpdate(
      { _id: req.params.id, status: "UnderReview" },
      { $set: { status: "Active", approvedAt: new Date(), rejectedAt: null, rejectedReasons: [] } },
      { new: true }
    );
    if (!project) {
      const existing = await ProjectListing.findById(req.params.id).select("status");
      if (!existing) return res.status(404).json({ success: false, message: "Project listing not found" });
      return res.status(400).json({ success: false, message: `Project cannot be approved. Current status is '${existing.status}', expected 'UnderReview'` });
    }
    if (project.rera?.reraId) {
      project.rera.reraAdminApproved = true;
      await project.save();
    }
    return res.json({ success: true, message: "Project approved successfully", data: { status: project.status, approvedAt: project.approvedAt } });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

const reject = async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) return res.status(400).json({ success: false, message: "Invalid project listing ID" });
    if (!Array.isArray(req.body?.reasons) || req.body.reasons.length === 0) {
      return res.status(400).json({ success: false, message: "At least one rejection reason is required" });
    }
    const reasons = req.body.reasons.map((reason) => typeof reason === "string" ? reason.trim() : "").filter(Boolean);
    if (reasons.length === 0) return res.status(400).json({ success: false, message: "At least one non-empty rejection reason is required" });

    const project = await ProjectListing.findOneAndUpdate(
      { _id: req.params.id, status: "UnderReview" },
      { $set: { status: "Rejected", rejectedAt: new Date(), rejectedReasons: reasons, approvedAt: null } },
      { new: true }
    );
    if (!project) {
      const existing = await ProjectListing.findById(req.params.id).select("status");
      if (!existing) return res.status(404).json({ success: false, message: "Project listing not found" });
      return res.status(400).json({ success: false, message: `Project cannot be rejected. Current status is '${existing.status}', expected 'UnderReview'` });
    }
    return res.json({ success: true, message: "Project rejected successfully", data: { status: project.status, rejectedAt: project.rejectedAt, rejectedReasons: project.rejectedReasons } });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

const updateStatus = async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) return res.status(400).json({ success: false, message: "Invalid project listing ID" });
    const project = await ProjectListing.findById(req.params.id);
    if (!project) return res.status(404).json({ success: false, message: "Project listing not found" });

    const transitions = {
      Active: ["Inactive", "Sold"],
      Inactive: ["Active"],
      Sold: ["Active"],
      sold: ["Active"],
      Rejected: ["Active"],
      UnderReview: [],
    };
    const allowed = transitions[project.status] ?? [];
    if (!allowed.includes(req.body?.status)) {
      return res.status(400).json({ success: false, message: `Project cannot be changed from '${project.status}' to '${req.body?.status ?? ""}'. Allowed status changes: ${allowed.join(", ") || "none"}.` });
    }
    project.status = req.body.status;
    await project.save();
    return res.json({ success: true, message: "Project status updated successfully", data: { status: project.status } });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = { getAll, getById, approve, reject, updateStatus };
