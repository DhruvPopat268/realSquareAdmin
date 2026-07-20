const PaymentTransaction = require("../../mixed/transactions/model");
const AdminWallet        = require("../adminWallet/model");

const getPaymentTransactions = async (req, res) => {
  try {
    const page  = Math.max(1, parseInt(req.query.page)  || 1);
    const limit = Math.max(1, parseInt(req.query.limit) || 10);
    const skip  = (page - 1) * limit;

    const filter = {};
    if (req.query.status)   filter.status   = req.query.status;
    if (req.query.userType) filter.userType = req.query.userType;
    if (req.query.reason)   filter.reason   = req.query.reason;
    if (req.query.userId)   filter.user     = req.query.userId;

    const [wallet, transactions, total] = await Promise.all([
      AdminWallet.findOne(),
      PaymentTransaction.find(filter)
        .populate("user", "mobile ownerProfile.fullName brokerProfile.fullName builderProfile.name")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      PaymentTransaction.countDocuments(filter),
    ]);

    const stats = {
      currentBalance: wallet?.currentBalance ?? 0,
      totalCredited:  wallet?.totalCredited  ?? 0,
      totalDebited:   wallet?.totalDebited   ?? 0,
    };

    res.json({
      success: true,
      stats,
      data: transactions,
      pagination: { total, page, limit, totalPages: Math.ceil(total / limit) },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

module.exports = { getPaymentTransactions };
