const fs           = require("fs");
const path         = require("path");
const InvoiceConfig = require("./model");
const { IMAGES_DIR } = require("../../../utils/upload");

// GET /admin/invoice-config
const getInvoiceConfig = async (req, res) => {
  try {
    const config = await InvoiceConfig.findOne().select("-__v").lean();
    res.json({ success: true, data: config || {} });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// PATCH /admin/invoice-config
const upsertInvoiceConfig = async (req, res) => {
  try {
    const existing = await InvoiceConfig.findOne().lean();

    const fields = {};
    const textFields = ["companyName", "companyMobile", "companyEmail"];
    textFields.forEach((f) => {
      if (req.body[f] !== undefined) fields[f] = req.body[f];
    });

    if (req.body.companyAddress !== undefined) {
      let address = req.body.companyAddress;
      if (typeof address === "string") {
        if (!address.trim()) {
          address = "";
        } else {
          try { address = JSON.parse(address); } catch { address = { name: address }; }
        }
      }

      if (address === "" || address === null) {
        fields.companyAddress = null;
        fields.companyState = null;
      } else {
        if (!address || typeof address !== "object" || Array.isArray(address) ||
            typeof address.name !== "string" || !address.name.trim()) {
          return res.status(400).json({ success: false, message: "Select a valid company address." });
        }

        const hasLatitude = address.latitude !== undefined && address.latitude !== null && address.latitude !== "";
        const hasLongitude = address.longitude !== undefined && address.longitude !== null && address.longitude !== "";
        if (hasLatitude !== hasLongitude) {
          return res.status(400).json({ success: false, message: "Company address must include both coordinates." });
        }

        const normalizedAddress = { name: address.name.trim() };
        if (hasLatitude && hasLongitude) {
          const latitude = Number(address.latitude);
          const longitude = Number(address.longitude);
          if (!Number.isFinite(latitude) || latitude < -90 || latitude > 90 ||
              !Number.isFinite(longitude) || longitude < -180 || longitude > 180) {
            return res.status(400).json({ success: false, message: "Company address coordinates are invalid." });
          }
          normalizedAddress.latitude = latitude;
          normalizedAddress.longitude = longitude;

          const state = String(req.body.companyState ?? address.state ?? "").trim();
          if (!state) return res.status(400).json({ success: false, message: "Select an address that includes a state." });
          fields.companyState = state;
        }
        fields.companyAddress = normalizedAddress;
      }
    } else if (req.body.companyState !== undefined) {
      const state = String(req.body.companyState ?? "").trim();
      fields.companyState = state || null;
    }

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
    ).lean();

    res.json({ success: true, data: config });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

module.exports = { getInvoiceConfig, upsertInvoiceConfig };
