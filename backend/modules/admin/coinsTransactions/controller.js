const CoinsTransaction = require("../../mixed/coinsTransactions/model");

// ── Get All Coins Transactions ────────────────────────────────────────────────
const getCoinsTransactions = async (req, res) => {
  try {
    const filter = {};
    if (req.query.type)     filter.type     = req.query.type;
    if (req.query.reason)   filter.reason   = req.query.reason;
    if (req.query.userType) filter.userType = req.query.userType;
    if (req.query.userId)   filter.user     = req.query.userId;

    const page  = Math.max(1, parseInt(req.query.page)  || 1);
    const limit = Math.max(1, parseInt(req.query.limit) || 10);
    const skip  = (page - 1) * limit;

    const [transactions, total, stats] = await Promise.all([
      CoinsTransaction.find(filter)
        .populate("user", "mobile ownerProfile.fullName brokerProfile.fullName builderProfile.name")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      CoinsTransaction.countDocuments(filter),
      CoinsTransaction.aggregate([
        { $match: filter },
        { $group: { _id: "$type", total: { $sum: "$coins" } } },
      ]),
    ]);

    const totalCredited = stats.find((s) => s._id === "Credit")?.total ?? 0;
    const totalDebited  = stats.find((s) => s._id === "Debit")?.total  ?? 0;

    res.json({
      success: true,
      data: transactions,
      stats: { totalCredited, totalDebited },
      pagination: { total, page, limit, totalPages: Math.ceil(total / limit) },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

module.exports = { getCoinsTransactions };
