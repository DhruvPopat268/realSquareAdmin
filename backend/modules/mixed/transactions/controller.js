const PaymentTransaction = require("./model");

const getPaymentTransactions = async (req, res) => {
  try {
    const page  = Math.max(1, parseInt(req.query.page)  || 1);
    const limit = Math.max(1, parseInt(req.query.limit) || 10);
    const skip  = (page - 1) * limit;

    const [transactions, total, stats] = await Promise.all([
      PaymentTransaction.find({ user: req.user._id }).select("-__v").sort({ createdAt: -1 }).skip(skip).limit(limit),
      PaymentTransaction.countDocuments({ user: req.user._id }),
      PaymentTransaction.aggregate([
        { $match: { user: req.user._id } },
        { $group: { _id: "$status", count: { $sum: 1 } } },
      ]),
    ]);

    const counts = { Pending: 0, Success: 0, Failed: 0 };
    stats.forEach(({ _id, count }) => { counts[_id] = count; });

    res.json({
      success: true,
      data: {
        stats:      counts,
        transactions,
        pagination: { total, page, limit, totalPages: Math.ceil(total / limit) },
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

module.exports = { getPaymentTransactions };
