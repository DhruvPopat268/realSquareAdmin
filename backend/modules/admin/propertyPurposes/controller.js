const { validationResult } = require("express-validator");
const PropertyPurpose = require("./model");

// ── Get All ───────────────────────────────────────────────────────────────────
const getPurposes = async (req, res) => {
  try {
    const filter = {};
    if (req.query.isActive === "true")  filter.isActive = true;
    if (req.query.isActive === "false") filter.isActive = false;
    if (req.query.search)              filter.name = new RegExp(req.query.search.trim(), "i");

    const purposes = await PropertyPurpose.find(filter).sort({ createdAt: -1 });
    res.json({ success: true, data: purposes });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ── Create ────────────────────────────────────────────────────────────────────
const createPurpose = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty())
    return res.status(400).json({ success: false, errors: errors.array() });

  const { name, description, isActive } = req.body;

  try {
    const exists = await PropertyPurpose.findOne({ name: new RegExp(`^${name.trim()}$`, "i") });
    if (exists)
      return res.status(409).json({ success: false, message: "Property purpose name already exists" });

    const purpose = await PropertyPurpose.create({ name: name.trim(), description, isActive: isActive ?? true });
    res.status(201).json({ success: true, data: purpose });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ── Update ────────────────────────────────────────────────────────────────────
const updatePurpose = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty())
    return res.status(400).json({ success: false, errors: errors.array() });

  const { name } = req.body;

  try {
    if (name) {
      const exists = await PropertyPurpose.findOne({ name: new RegExp(`^${name.trim()}$`, "i"), _id: { $ne: req.params.id } });
      if (exists)
        return res.status(409).json({ success: false, message: "Property purpose name already exists" });
    }

    const purpose = await PropertyPurpose.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!purpose)
      return res.status(404).json({ success: false, message: "Property purpose not found" });

    res.json({ success: true, data: purpose });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ── Delete ────────────────────────────────────────────────────────────────────
const deletePurpose = async (req, res) => {
  try {
    const purpose = await PropertyPurpose.findByIdAndDelete(req.params.id);
    if (!purpose)
      return res.status(404).json({ success: false, message: "Property purpose not found" });

    res.json({ success: true, message: "Property purpose deleted successfully" });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

module.exports = { getPurposes, createPurpose, updatePurpose, deletePurpose };
