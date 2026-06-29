const { validationResult } = require("express-validator");
const PropertyCategory = require("./model");

// ── Get All ───────────────────────────────────────────────────────────────────
const getCategories = async (req, res) => {
  try {
    const filter = {};
    if (req.query.isActive === "true")  filter.isActive = true;
    if (req.query.isActive === "false") filter.isActive = false;
    if (req.query.search)              filter.name = new RegExp(req.query.search.trim(), "i");

    const categories = await PropertyCategory.find(filter).sort({ createdAt: -1 });
    res.json({ success: true, data: categories });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ── Create ────────────────────────────────────────────────────────────────────
const createCategory = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty())
    return res.status(400).json({ success: false, errors: errors.array() });

  const { name, description, isActive } = req.body;

  try {
    const exists = await PropertyCategory.findOne({ name: new RegExp(`^${name.trim()}$`, "i") });
    if (exists)
      return res.status(409).json({ success: false, message: "Property category name already exists" });

    const category = await PropertyCategory.create({ name: name.trim(), description, isActive: isActive ?? true });
    res.status(201).json({ success: true, data: category });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ── Update ────────────────────────────────────────────────────────────────────
const updateCategory = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty())
    return res.status(400).json({ success: false, errors: errors.array() });

  const { name } = req.body;

  try {
    if (name) {
      const exists = await PropertyCategory.findOne({ name: new RegExp(`^${name.trim()}$`, "i"), _id: { $ne: req.params.id } });
      if (exists)
        return res.status(409).json({ success: false, message: "Property category name already exists" });
    }

    const category = await PropertyCategory.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!category)
      return res.status(404).json({ success: false, message: "Property category not found" });

    res.json({ success: true, data: category });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ── Delete ────────────────────────────────────────────────────────────────────
const deleteCategory = async (req, res) => {
  try {
    const category = await PropertyCategory.findByIdAndDelete(req.params.id);
    if (!category)
      return res.status(404).json({ success: false, message: "Property category not found" });

    res.json({ success: true, message: "Property category deleted successfully" });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

module.exports = { getCategories, createCategory, updateCategory, deleteCategory };
