const ListingPurchasedPlan = require("../../mixed/purchasedPlans/model");
const mongoose = require("mongoose");

// ── Get All Purchased Plans ───────────────────────────────────────────────────
const getListingPurchasedPlans = async (req, res) => {
  try {
    const filter = {};
    if (req.query.planType) {
      if (!["Free", "Paid"].includes(req.query.planType)) {
        return res.status(400).json({ success: false, message: "planType must be Free or Paid" });
      }
      // Plan type is derived from the snapshot values, matching the admin UI.
      filter.$nor = [{ "plan.amount": 0, "plan.coins": 0 }];
      if (req.query.planType === "Free") {
        delete filter.$nor;
        filter["plan.amount"] = 0;
        filter["plan.coins"] = 0;
      }
    }
    if (req.query.status)   filter.status   = req.query.status;
    if (req.query.userType) filter.userType = req.query.userType;
    if (req.query.userId) {
      if (!mongoose.isValidObjectId(req.query.userId)) {
        return res.status(400).json({ success: false, message: "userId must be a valid ID" });
      }
      // Mongoose casts find() filters, but aggregation $match does not.
      filter.user = new mongoose.Types.ObjectId(req.query.userId);
    }

    const page  = Math.max(1, parseInt(req.query.page)  || 1);
    const limit = Math.max(1, parseInt(req.query.limit) || 10);
    const skip  = (page - 1) * limit;

    const [records, total, statsRaw] = await Promise.all([
      ListingPurchasedPlan.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      ListingPurchasedPlan.countDocuments(filter),
      ListingPurchasedPlan.aggregate([
        { $match: filter },
        { $group: { _id: "$status", count: { $sum: 1 } } },
      ]),
    ]);

    const stats = {
      active:    statsRaw.find((s) => s._id === "Active")?.count    ?? 0,
      expired:   statsRaw.find((s) => s._id === "Expired")?.count   ?? 0,
      consumed:  statsRaw.find((s) => s._id === "Consumed")?.count  ?? 0,
      cancelled: statsRaw.find((s) => s._id === "Cancelled")?.count ?? 0,
    };

    res.json({
      success: true,
      data: records,
      stats,
      pagination: { total, page, limit, totalPages: Math.ceil(total / limit) },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

module.exports = { getListingPurchasedPlans };
