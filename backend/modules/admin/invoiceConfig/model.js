const mongoose = require("mongoose");
const { Schema } = mongoose;

const invoiceConfigSchema = new Schema(
  {
    companyLogo:    { type: String, trim: true },           // URL to uploaded logo
    companyName:    { type: String, trim: true },
    companyMobile:  { type: String, trim: true },
    companyEmail:   { type: String, trim: true },
    companyAddress: { type: String, trim: true },
  },
  { timestamps: true }
);

// Singleton — only one config document ever exists
module.exports = mongoose.model("InvoiceConfig", invoiceConfigSchema);
