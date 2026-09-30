const EnquiryPurchasedPlan = require("../../mixed/enquiryPurchasedPlans/model");

// ── Get All Enquiry Purchased Plans ───────────────────────────────────────────
const getEnquiryPurchasedPlans = async (req, res) => {
  try {
    const filter = {};
    if (req.query.status)   filter.status   = req.query.status;
    if (req.query.userType) filter.userType = req.query.userType;
    if (req.query.userId)   filter.user     = req.query.userId;

    const page  = Math.max(1, parseInt(req.query.page)  || 1);
    const limit = Math.max(1, parseInt(req.query.limit) || 10);
    const skip  = (page - 1) * limit;

    const [records, total, statsRaw] = await Promise.all([
      EnquiryPurchasedPlan.find(filter)
        .populate("user", "mobile name")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      EnquiryPurchasedPlan.countDocuments(filter),
      EnquiryPurchasedPlan.aggregate([
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

module.exports = { getEnquiryPurchasedPlans };
