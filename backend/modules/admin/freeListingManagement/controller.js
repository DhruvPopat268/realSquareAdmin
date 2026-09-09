const FreeListingConfig = require("./model");

// ── GET /free-listing-config ──────────────────────────────────────────────────
const getConfig = async (req, res) => {
  try {
    const config = await FreeListingConfig.findOne().sort({ createdAt: -1 });
    res.json({ success: true, data: config ?? null });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ── PUT /free-listing-config ──────────────────────────────────────────────────
const upsertConfig = async (req, res) => {
  try {
    const { noOfListings } = req.body;

    if (noOfListings == null || isNaN(noOfListings) || (Number(noOfListings) < 0 && Number(noOfListings) !== -1))
      return res.status(400).json({ success: false, message: "noOfListings is required and must be 0 or greater, or -1 for unlimited" });

    const config = await FreeListingConfig.findOneAndUpdate(
      {},
      { noOfListings: Number(noOfListings) },
      { new: true, upsert: true, runValidators: true, sort: { createdAt: -1 } }
    );

    res.json({ success: true, data: config });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

module.exports = { getConfig, upsertConfig };
