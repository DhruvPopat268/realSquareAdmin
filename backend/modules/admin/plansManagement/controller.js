const Plan = require("./model");

// ── Create Plan ───────────────────────────────────────────────────────────────
const createPlan = async (req, res) => {
  try {
    const {
      name, description, planType,
      numberOfPropertiesGiven, expiryType,
      leadsPerDay, roles, coins, amount, isActive,
    } = req.body;

    if (!name || !planType || numberOfPropertiesGiven == null || leadsPerDay == null)
      return res.status(400).json({ success: false, message: "name, planType, numberOfPropertiesGiven and leadsPerDay are required" });

    if (!["Free", "Paid"].includes(planType))
      return res.status(400).json({ success: false, message: "planType must be Free or Paid" });

    if (planType === "Paid") {
      if (!expiryType || coins == null || amount == null)
        return res.status(400).json({ success: false, message: "expiryType, coins and amount are required for Paid plans" });

      if (!["Weekly", "Monthly", "Yearly"].includes(expiryType))
        return res.status(400).json({ success: false, message: "expiryType must be Weekly, Monthly or Yearly" });
    }

    const exists = await Plan.findOne({ name: new RegExp(`^${name.trim()}$`, "i") });
    if (exists)
      return res.status(409).json({ success: false, message: "Plan name already exists" });

    const planData = {
      name: name.trim(),
      description,
      planType,
      numberOfPropertiesGiven,
      leadsPerDay,
      roles: roles ?? [],
      isActive: isActive ?? true,
    };

    if (planType === "Paid") {
      planData.expiryType = expiryType;
      planData.coins      = coins;
      planData.amount     = amount;
    }

    const plan = await Plan.create(planData);
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
    if (req.query.planType)            filter.planType  = req.query.planType;
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
      name, description, planType,
      numberOfPropertiesGiven, expiryType,
      leadsPerDay, roles, coins, amount, isActive,
    } = req.body;

    if (!name || !planType || numberOfPropertiesGiven == null || leadsPerDay == null)
      return res.status(400).json({ success: false, message: "name, planType, numberOfPropertiesGiven and leadsPerDay are required" });

    if (!["Free", "Paid"].includes(planType))
      return res.status(400).json({ success: false, message: "planType must be Free or Paid" });

    if (planType === "Paid") {
      if (!expiryType || coins == null || amount == null)
        return res.status(400).json({ success: false, message: "expiryType, coins and amount are required for Paid plans" });

      if (!["Weekly", "Monthly", "Yearly"].includes(expiryType))
        return res.status(400).json({ success: false, message: "expiryType must be Weekly, Monthly or Yearly" });
    }

    const duplicate = await Plan.findOne({
      name: new RegExp(`^${name.trim()}$`, "i"),
      _id:  { $ne: req.params.id },
    });
    if (duplicate)
      return res.status(409).json({ success: false, message: "Plan name already exists" });

    const planData = {
      name: name.trim(), description, planType,
      numberOfPropertiesGiven, leadsPerDay,
      roles: roles ?? [],
      isActive: isActive ?? true,
      expiryType: planType === "Paid" ? expiryType : undefined,
      coins:      planType === "Paid" ? coins      : undefined,
      amount:     planType === "Paid" ? amount     : undefined,
    };

    const plan = await Plan.findByIdAndUpdate(req.params.id, planData, { new: true, runValidators: true });
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

module.exports = { createPlan, getPlans, getPlanById, updatePlan, toggleActive };
