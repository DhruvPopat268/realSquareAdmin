const AutoApprovalConfig = require("./model");

const ALLOWED_ROLE_IDS = [
  process.env.OWNER_ROLE_ID,
  process.env.BROKER_ROLE_ID,
  process.env.BUILDER_ROLE_ID,
];

// GET /auto-approval-config
const getAll = async (req, res) => {
  try {
    const configs = await AutoApprovalConfig.find({ roleId: { $in: ALLOWED_ROLE_IDS } });
    const data = ALLOWED_ROLE_IDS.reduce((acc, id) => {
      const found = configs.find((c) => c.roleId.toString() === id);
      acc[id] = found ? found.isActive : false;
      return acc;
    }, {});
    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// PATCH /auto-approval-config
const upsertConfig = async (req, res) => {
  const { roleId, isActive } = req.body;

  if (!roleId || isActive === undefined)
    return res.status(400).json({ success: false, message: "roleId and isActive are required" });

  if (!ALLOWED_ROLE_IDS.includes(roleId))
    return res.status(403).json({ success: false, message: "roleId is not allowed" });

  try {
    const config = await AutoApprovalConfig.findOneAndUpdate(
      { roleId },
      { isActive },
      { upsert: true, new: true, runValidators: true }
    );
    res.json({ success: true, data: config });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

module.exports = { getAll, upsertConfig };
