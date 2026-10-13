const mongoose = require("mongoose");
const { Schema } = mongoose;

const locationSchema = new Schema({
  name:      { type: String, trim: true },
  latitude:  { type: Number },
  longitude: { type: Number },
}, { _id: false });

const invoiceConfigSchema = new Schema(
  {
    companyLogo:    { type: String, trim: true },           // URL to uploaded logo
    companyName:    { type: String, trim: true },
    companyMobile:  { type: String, trim: true },
    companyEmail:   { type: String, trim: true },
    companyAddress: { type: locationSchema },
    companyState:   { type: String, trim: true },
  },
  { timestamps: true }
);

// Singleton — only one config document ever exists
module.exports = mongoose.model("InvoiceConfig", invoiceConfigSchema);
