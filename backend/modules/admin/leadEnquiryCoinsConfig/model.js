const mongoose = require("mongoose");

const leadEnquiryCoinsConfigSchema = new mongoose.Schema(
  {
    // Singleton doc — always upserted with this fixed key
    _configKey:       { type: String, default: "singleton", immutable: true },
    coinsPerLead:     { type: Number, required: true, min: 0, default: 0 },
    coinsPerEnquiry:  { type: Number, required: true, min: 0, default: 0 },
  },
  { timestamps: true }
);

module.exports = mongoose.model("LeadEnquiryCoinsConfig", leadEnquiryCoinsConfigSchema);
