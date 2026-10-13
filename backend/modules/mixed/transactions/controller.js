const { validationResult } = require("express-validator");
const PaymentTransaction   = require("./model");
const { generateInvoice }  = require("./generateInvoiceHelper");

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

// ── Generate Invoice ──────────────────────────────────────────────────────────
const generateInvoiceController = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty())
    return res.status(400).json({ success: false, errors: errors.array() });

  const { transactionId } = req.body;

  try {
    // Ownership check — transaction must belong to the logged-in user
    const txnCheck = await PaymentTransaction.findById(transactionId).select("user invoiceUrl").lean();
    if (txnCheck.user.toString() !== req.user._id.toString())
      return res.status(403).json({ success: false, message: "You are not authorized to generate invoice for this transaction" });
    if (txnCheck.invoiceUrl)
      return res.status(409).json({ success: false, message: "An invoice has already been generated for this transaction" });

    const invoiceUrl = await generateInvoice(transactionId);

    const txn = await PaymentTransaction.findById(transactionId)
      .select("invoiceNumber invoiceUrl amount reason status userDetails userType createdAt")
      .lean();

    res.json({
      success: true,
      message: "Invoice generated successfully",
      data: {
        invoiceUrl,
        invoiceNumber: txn.invoiceNumber,
        transaction:   txn,
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

module.exports = { getPaymentTransactions, generateInvoiceController };

