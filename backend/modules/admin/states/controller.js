const { validationResult } = require("express-validator");
const State = require("./model");
const City  = require("../cities/model");

// ── Get All States ────────────────────────────────────────────────────────────
const getStates = async (req, res) => {
  try {
    const filter = {};
    if (req.query.isActive === "true")  filter.isActive = true;
    if (req.query.isActive === "false") filter.isActive = false;
    if (req.query.search)              filter.name = new RegExp(req.query.search.trim(), "i");
    const states = await State.find(filter).sort({ createdAt: -1 });
    res.json({ success: true, data: states });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ── Create State ──────────────────────────────────────────────────────────────
const createState = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty())
    return res.status(400).json({ success: false, errors: errors.array() });

  try {
    const exists = await State.findOne({ name: new RegExp(`^${req.body.name.trim()}$`, "i") });
    if (exists)
      return res.status(409).json({ success: false, message: "State name already exists" });

    const state = await State.create({ name: req.body.name, isActive: req.body.isActive ?? true });
    res.status(201).json({ success: true, data: state });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ── Update State ──────────────────────────────────────────────────────────────
const updateState = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty())
    return res.status(400).json({ success: false, errors: errors.array() });

  try {
    if (req.body.name) {
      const exists = await State.findOne({ name: new RegExp(`^${req.body.name.trim()}$`, "i"), _id: { $ne: req.params.id } });
      if (exists)
        return res.status(409).json({ success: false, message: "State name already exists" });
    }

    const state = await State.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!state)
      return res.status(404).json({ success: false, message: "State not found" });

    // sync cities isActive when state isActive changes
    if (typeof req.body.isActive === "boolean")
      await City.updateMany({ state: req.params.id }, { isActive: req.body.isActive });

    res.json({ success: true, data: state });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ── Delete State ──────────────────────────────────────────────────────────────
const deleteState = async (req, res) => {
  try {
    const state = await State.findByIdAndDelete(req.params.id);
    if (!state)
      return res.status(404).json({ success: false, message: "State not found" });
    res.json({ success: true, message: "State deleted successfully" });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

module.exports = { getStates, createState, updateState, deleteState };
