const mongoose           = require("mongoose");
const PaymentTransaction = require("../../mixed/transactions/model");
const AdminWallet        = require("../adminWallet/model");
const { generateInvoice } = require("../../mixed/transactions/generateInvoiceHelper");

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

    const [wallet, transactions, total, taxAgg] = await Promise.all([
      AdminWallet.findOne(),
      PaymentTransaction.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      PaymentTransaction.countDocuments(filter),
      PaymentTransaction.aggregate([
        { $match: { status: "Success" } },
        {
          $group: {
            _id:                null,
            totalTaxCollected:  { $sum: "$taxBreakdown.taxAmount" },
            totalBaseAmount:    { $sum: "$baseAmount" },
          },
        },
      ]),
    ]);

    const stats = {
      currentBalance:    wallet?.currentBalance    ?? 0,
      totalCredited:     wallet?.totalCredited     ?? 0,
      totalDebited:      wallet?.totalDebited      ?? 0,
      totalTaxCollected: taxAgg[0]?.totalTaxCollected ?? 0,
      totalBaseAmount:   taxAgg[0]?.totalBaseAmount   ?? 0,
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

const generateAdminInvoice = async (req, res) => {
  const { transactionId } = req.params;

  try {
    if (!mongoose.Types.ObjectId.isValid(transactionId)) {
      return res.status(400).json({ success: false, message: "Invalid transaction ID" });
    }

    const transaction = await PaymentTransaction.findById(transactionId).select("status invoiceUrl");
    if (!transaction) {
      return res.status(404).json({ success: false, message: "Transaction not found" });
    }
    if (transaction.invoiceUrl) {
      return res.status(409).json({
        success: false,
        message: "An invoice has already been generated for this transaction",
        data: { invoiceUrl: transaction.invoiceUrl },
      });
    }
    if (transaction.status !== "Success") {
      return res.status(400).json({ success: false, message: "Invoice can only be generated for successful transactions" });
    }

    const invoiceUrl = await generateInvoice(transactionId);
    return res.json({ success: true, message: "Invoice generated successfully", data: { invoiceUrl } });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

module.exports = { getPaymentTransactions, generateAdminInvoice };
