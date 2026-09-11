const Config = require("./model");

const SINGLETON_KEY = "singleton";

// ── GET config ────────────────────────────────────────────────────────────────
const getConfig = async (req, res) => {
  try {
    let config = await Config.findOne({ _configKey: SINGLETON_KEY });

    // Return defaults if never saved yet
    if (!config) {
      return res.json({
        success: true,
        data: { coinsPerLead: 0, coinsPerEnquiry: 0 },
      });
    }

    res.json({ success: true, data: config });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ── PUT config (upsert) ───────────────────────────────────────────────────────
const updateConfig = async (req, res) => {
  try {
    const { coinsPerLead, coinsPerEnquiry } = req.body;

    if (coinsPerLead == null || coinsPerEnquiry == null)
      return res.status(400).json({ success: false, message: "coinsPerLead and coinsPerEnquiry are required" });

    const lead     = Number(coinsPerLead);
    const enquiry  = Number(coinsPerEnquiry);

    if (isNaN(lead) || lead < 0)
      return res.status(400).json({ success: false, message: "coinsPerLead must be a non-negative number" });
    if (isNaN(enquiry) || enquiry < 0)
      return res.status(400).json({ success: false, message: "coinsPerEnquiry must be a non-negative number" });

    const config = await Config.findOneAndUpdate(
      { _configKey: SINGLETON_KEY },
      { $set: { coinsPerLead: lead, coinsPerEnquiry: enquiry } },
      { new: true, upsert: true, runValidators: true }
    );

    res.json({ success: true, data: config });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

module.exports = { getConfig, updateConfig };
