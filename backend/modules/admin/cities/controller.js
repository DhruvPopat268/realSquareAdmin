const { validationResult } = require("express-validator");
const City = require("./model");

// ── Get All Cities ────────────────────────────────────────────────────────────
const getCities = async (req, res) => {
  try {
    const filter = {};
    if (req.query.isActive === "true")  filter.isActive = true;
    if (req.query.isActive === "false") filter.isActive = false;
    if (req.query.state)               filter.state = req.query.state;
    if (req.query.search)              filter.name  = new RegExp(req.query.search.trim(), "i");

    const cities = await City.find(filter).populate("state", "name").sort({ createdAt: -1 });
    res.json({ success: true, data: cities });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ── Create City ───────────────────────────────────────────────────────────────
const createCity = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty())
    return res.status(400).json({ success: false, errors: errors.array() });

  const { name, state, isActive } = req.body;

  try {
    const exists = await City.findOne({ name: new RegExp(`^${name.trim()}$`, "i"), state });
    if (exists)
      return res.status(409).json({ success: false, message: "City name already exists in this state" });

    const city = await City.create({ name: name.trim(), state, isActive: isActive ?? true });
    await city.populate("state", "name");
    res.status(201).json({ success: true, data: city });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ── Update City ───────────────────────────────────────────────────────────────
const updateCity = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty())
    return res.status(400).json({ success: false, errors: errors.array() });

  const { name, state, isActive } = req.body;

  try {
    if (name || state) {
      const existing = await City.findById(req.params.id);
      if (!existing)
        return res.status(404).json({ success: false, message: "City not found" });

      const checkName  = name  ? name.trim() : existing.name;
      const checkState = state ? state       : existing.state.toString();

      const duplicate = await City.findOne({
        name:  new RegExp(`^${checkName}$`, "i"),
        state: checkState,
        _id:   { $ne: req.params.id },
      });
      if (duplicate)
        return res.status(409).json({ success: false, message: "City name already exists in this state" });
    }

    const city = await City.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true }).populate("state", "name");
    if (!city)
      return res.status(404).json({ success: false, message: "City not found" });

    res.json({ success: true, data: city });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ── Delete City ───────────────────────────────────────────────────────────────
const deleteCity = async (req, res) => {
  try {
    const city = await City.findByIdAndDelete(req.params.id);
    if (!city)
      return res.status(404).json({ success: false, message: "City not found" });
    res.json({ success: true, message: "City deleted successfully" });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

module.exports = { getCities, createCity, updateCity, deleteCity };
