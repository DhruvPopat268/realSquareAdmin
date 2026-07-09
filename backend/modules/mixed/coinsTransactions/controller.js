const CoinsTransaction = require("./model");
const UserCoinsWallet  = require("../userCoinsWallet/model");

const getCoinsTransactions = async (req, res) => {
  try {
    const [transactions, wallet] = await Promise.all([
      CoinsTransaction.find({ user: req.user._id }).select("-__v").sort({ createdAt: -1 }),
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
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

module.exports = { getCoinsTransactions };
