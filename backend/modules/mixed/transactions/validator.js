const { body } = require("express-validator");
const PaymentTransaction = require("./model");

const generateInvoiceValidator = [
  body("transactionId")
    .notEmpty().withMessage("transactionId is required")
    .isMongoId().withMessage("transactionId must be a valid MongoDB ObjectId")
    .custom(async (id) => {
      const txn = await PaymentTransaction.findById(id).select("status").lean();
      if (!txn)
        throw new Error("Transaction not found");
      if (txn.status !== "Success")
        throw new Error("Invoice can only be generated for successful transactions");
    }),
];

module.exports = { generateInvoiceValidator };
