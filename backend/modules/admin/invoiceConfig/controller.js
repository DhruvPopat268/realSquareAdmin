const fs           = require("fs");
const path         = require("path");
const InvoiceConfig = require("./model");
const { IMAGES_DIR } = require("../../../utils/upload");

// GET /admin/invoice-config
const getInvoiceConfig = async (req, res) => {
  try {
    const config = await InvoiceConfig.findOne().select("-__v");
    res.json({ success: true, data: config || {} });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// PATCH /admin/invoice-config
const upsertInvoiceConfig = async (req, res) => {
  try {
    const existing = await InvoiceConfig.findOne();

    const fields = {};
    const textFields = ["companyName", "companyMobile", "companyEmail", "companyAddress"];
    textFields.forEach((f) => {
      if (req.body[f] !== undefined) fields[f] = req.body[f];
    });

    // Handle logo upload
    if (req.file) {
      // Delete old logo if it exists
      if (existing?.companyLogo) {
        const oldFile = path.join(IMAGES_DIR, path.basename(existing.companyLogo));
        fs.unlink(oldFile, () => {}); // ignore errors if file missing
      }
      const baseUrl = `${req.protocol}://${req.get("host")}`;
      fields.companyLogo = `${baseUrl}/storage/images/${req.file.filename}`;
    }

    const config = await InvoiceConfig.findOneAndUpdate(
      {},
      { $set: fields },
      { upsert: true, new: true, runValidators: true, setDefaultsOnInsert: true }
    );

    res.json({ success: true, data: config });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

module.exports = { getInvoiceConfig, upsertInvoiceConfig };
