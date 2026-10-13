const GstConfig = require("./model");

// GET /admin/gst-config
const getGstConfig = async (req, res) => {
  try {
    const config = await GstConfig.findOne().lean();
    if (!config) return res.status(200).json({ success: true, data: null });
    const inStateTotalGst = (config.cgst || 0) + (config.sgst || 0);
    res.json({
      success: true,
      data: {
        ...config,
        totalGst: inStateTotalGst,
        inStateTotalGst,
        outOfStateTotalGst: config.igst || 0,
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// PATCH /admin/gst-config
const updateGstConfig = async (req, res) => {
  try {
    const { cgst, sgst, igst } = req.body;

    const hasCgst = cgst !== undefined && cgst !== null;
    const hasSgst = sgst !== undefined && sgst !== null;
    const hasIgst = igst !== undefined && igst !== null;

    // At least one field required
    if (!hasCgst && !hasSgst && !hasIgst)
      return res.status(400).json({ success: false, message: "Provide at least one of cgst, sgst, or igst." });

    // Validate number ranges
    for (const [key, val] of Object.entries({ cgst, sgst, igst })) {
      if (val === undefined || val === null) continue;
      if (typeof val !== "number" || isNaN(val))
        return res.status(400).json({ success: false, message: `${key.toUpperCase()} must be a number.` });
      if (val < 0 || val > 100)
        return res.status(400).json({ success: false, message: `${key.toUpperCase()} must be between 0 and 100.` });
    }

    // Merge with existing to check combined conflict
    const existing = await GstConfig.findOne().lean();
    const merged = {
      cgst: hasCgst ? cgst : (existing?.cgst ?? 0),
      sgst: hasSgst ? sgst : (existing?.sgst ?? 0),
      igst: hasIgst ? igst : (existing?.igst ?? 0),
    };

    const config = await GstConfig.findOneAndUpdate(
      {},
      { $set: merged },
      { new: true, upsert: true, runValidators: true }
    );

    res.json({ success: true, data: config });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

module.exports = { getGstConfig, updateGstConfig };
