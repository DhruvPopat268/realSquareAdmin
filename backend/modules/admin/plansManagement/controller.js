const Plan = require("./model");

// ── Create Plan ───────────────────────────────────────────────────────────────
const createPlan = async (req, res) => {
  try {
    const {
      name, description,
      numberOfPropertiesGiven, expiryInDays,
      roles, coins, amount, isActive,
    } = req.body;

    // Required fields
    if (!name || numberOfPropertiesGiven == null)
      return res.status(400).json({ success: false, message: "name and numberOfPropertiesGiven are required" });

    // expiryInDays: only -1 (never expires) or > 0 (N days) are valid; 0 is not allowed
    if (expiryInDays == null || isNaN(expiryInDays))
      return res.status(400).json({ success: false, message: "expiryInDays is required" });
    const expiry = Number(expiryInDays);
    if (expiry === 0 || (expiry < -1))
      return res.status(400).json({ success: false, message: "expiryInDays must be -1 (no expiry) or a positive number of days" });

    // coins and amount: both must be provided; both 0 (free) or both > 0 (paid)
    if (coins == null || amount == null)
      return res.status(400).json({ success: false, message: "Both coins and amount are required" });
    const coinsVal  = Number(coins);
    const amountVal = Number(amount);
    if (coinsVal < 0 || amountVal < 0)
      return res.status(400).json({ success: false, message: "coins and amount cannot be negative" });
    if ((coinsVal === 0) !== (amountVal === 0))
      return res.status(400).json({ success: false, message: "coins and amount must both be 0 (free plan) or both greater than 0 (paid plan)" });

    const exists = await Plan.findOne({ name: new RegExp(`^${name.trim()}$`, "i") });
    if (exists)
      return res.status(409).json({ success: false, message: "Plan name already exists" });

    const plan = await Plan.create({
      name: name.trim(),
      description,
      numberOfPropertiesGiven,
      expiryInDays: expiry,
      coins:  coinsVal,
      amount: amountVal,
      roles:    roles ?? [],
      isActive: isActive ?? true,
    });
    res.status(201).json({ success: true, data: plan });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ── Get All Plans ─────────────────────────────────────────────────────────────
const getPlans = async (req, res) => {
  try {
    const filter = {};
    if (req.query.isActive === "true")  filter.isActive = true;
    if (req.query.isActive === "false") filter.isActive = false;
    if (req.query.search)              filter.name      = new RegExp(req.query.search.trim(), "i");

    const plans = await Plan.find(filter).sort({ createdAt: -1 });
    res.json({ success: true, data: plans });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ── Get Single Plan ───────────────────────────────────────────────────────────
const getPlanById = async (req, res) => {
  try {
    const plan = await Plan.findById(req.params.id);
    if (!plan)
      return res.status(404).json({ success: false, message: "Plan not found" });

    res.json({ success: true, data: plan });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ── Update Plan ─────────────────────────────────────────────────────────────
const updatePlan = async (req, res) => {
  try {
    const {
      name, description,
      numberOfPropertiesGiven, expiryInDays,
      roles, coins, amount, isActive,
    } = req.body;

    // Required fields
    if (!name || numberOfPropertiesGiven == null)
      return res.status(400).json({ success: false, message: "name and numberOfPropertiesGiven are required" });

    // expiryInDays: only -1 (never expires) or > 0 (N days) are valid; 0 is not allowed
    if (expiryInDays == null || isNaN(expiryInDays))
      return res.status(400).json({ success: false, message: "expiryInDays is required" });
    const expiry = Number(expiryInDays);
    if (expiry === 0 || (expiry < -1))
      return res.status(400).json({ success: false, message: "expiryInDays must be -1 (no expiry) or a positive number of days" });

    // coins and amount: both must be provided; both 0 (free) or both > 0 (paid)
    if (coins == null || amount == null)
      return res.status(400).json({ success: false, message: "Both coins and amount are required" });
    const coinsVal  = Number(coins);
    const amountVal = Number(amount);
    if (coinsVal < 0 || amountVal < 0)
      return res.status(400).json({ success: false, message: "coins and amount cannot be negative" });
    if ((coinsVal === 0) !== (amountVal === 0))
      return res.status(400).json({ success: false, message: "coins and amount must both be 0 (free plan) or both greater than 0 (paid plan)" });

    const duplicate = await Plan.findOne({
      name: new RegExp(`^${name.trim()}$`, "i"),
      _id:  { $ne: req.params.id },
    });
    if (duplicate)
      return res.status(409).json({ success: false, message: "Plan name already exists" });

    const plan = await Plan.findByIdAndUpdate(
      req.params.id,
      {
        $set: {
          name: name.trim(),
          description,
          numberOfPropertiesGiven,
          expiryInDays: expiry,
          coins:  coinsVal,
          amount: amountVal,
          roles:    roles ?? [],
          isActive: isActive ?? true,
        },
      },
      { new: true, runValidators: true }
    );
    if (!plan)
      return res.status(404).json({ success: false, message: "Plan not found" });

    res.json({ success: true, data: plan });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ── Toggle isActive ───────────────────────────────────────────────────────────
const toggleActive = async (req, res) => {
  try {
    const plan = await Plan.findById(req.params.id);
    if (!plan)
      return res.status(404).json({ success: false, message: "Plan not found" });

    plan.isActive = !plan.isActive;
    await plan.save();
    res.json({ success: true, data: plan });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ── Delete Plan ───────────────────────────────────────────────────────────────
const deletePlan = async (req, res) => {
  try {
    const plan = await Plan.findByIdAndDelete(req.params.id);
    if (!plan)
      return res.status(404).json({ success: false, message: "Plan not found" });

    res.json({ success: true, message: "Plan deleted successfully" });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

module.exports = { createPlan, getPlans, getPlanById, updatePlan, toggleActive, deletePlan };
