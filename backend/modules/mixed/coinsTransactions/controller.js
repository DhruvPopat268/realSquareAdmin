const CoinsTransaction = require("./model");
const UserCoinsWallet  = require("../userCoinsWallet/model");

const getCoinsTransactions = async (req, res) => {
  try {
    const page  = Math.max(1, parseInt(req.query.page)  || 1);
    const limit = Math.max(1, parseInt(req.query.limit) || 10);
    const skip  = (page - 1) * limit;

    const [transactions, total, wallet] = await Promise.all([
      CoinsTransaction.find({ user: req.user._id }).select("-__v").sort({ createdAt: -1 }).skip(skip).limit(limit),
      CoinsTransaction.countDocuments({ user: req.user._id }),
      UserCoinsWallet.findOne({ user: req.user._id }).select("currentBalance totalCreditedCoins totalDebitedCoins"),
    ]);

    res.json({
      success: true,
      data: {
        wallet: {
          currentBalance:     wallet?.currentBalance     ?? 0,
          totalCreditedCoins: wallet?.totalCreditedCoins ?? 0,
          totalDebitedCoins:  wallet?.totalDebitedCoins  ?? 0,
        },
        transactions,
        pagination: { total, page, limit, totalPages: Math.ceil(total / limit) },
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

module.exports = { getCoinsTransactions };
