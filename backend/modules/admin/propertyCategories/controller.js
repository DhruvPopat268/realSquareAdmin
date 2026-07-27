const { validationResult } = require("express-validator");
const PropertyCategory = require("./model");

// ── Get All ───────────────────────────────────────────────────────────────────
const getCategories = async (req, res) => {
  try {
    const filter = {};
    if (req.query.isActive === "true")  filter.isActive = true;
    if (req.query.isActive === "false") filter.isActive = false;
    if (req.query.search)              filter.name = new RegExp(req.query.search.trim(), "i");

    const categories = await PropertyCategory.find(filter).sort({ updatedAt: -1 });
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

  const { name, description, isActive, order } = req.body;

  try {
    const exists = await PropertyCategory.findOne({ name: new RegExp(`^${name.trim()}$`, "i") });
    if (exists)
      return res.status(409).json({ success: false, message: "Property category name already exists" });

    const last      = await PropertyCategory.findOne().sort({ order: -1 });
    const nextOrder = last ? last.order + 1 : 1;

    if (order !== undefined && order !== nextOrder)
      return res.status(409).json({ success: false, message: `Order must be ${nextOrder} (next available)` });

    const category = await PropertyCategory.create({ name: name.trim(), description, isActive: isActive ?? true, order: nextOrder });
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

    if (req.body.order !== undefined) {
      const orderTaken = await PropertyCategory.findOne({ order: req.body.order, _id: { $ne: req.params.id } });
      if (orderTaken)
        return res.status(409).json({ success: false, message: "Order value already taken by another category" });
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

// ── Reorder ───────────────────────────────────────────────────────────────────
const reorderCategory = async (req, res) => {
  const { direction } = req.body;
  if (!["up", "down"].includes(direction))
    return res.status(400).json({ success: false, message: "direction must be 'up' or 'down'" });
  try {
    const item = await PropertyCategory.findById(req.params.id);
    if (!item) return res.status(404).json({ success: false, message: "Property category not found" });

    const swapOrder = direction === "up" ? item.order - 1 : item.order + 1;
    const sibling   = await PropertyCategory.findOne({ order: swapOrder });
    if (!sibling)
      return res.status(400).json({ success: false, message: `No item to swap ${direction}` });

    await PropertyCategory.findByIdAndUpdate(item._id,    { order: swapOrder });
    await PropertyCategory.findByIdAndUpdate(sibling._id, { order: item.order });

    const updated = await PropertyCategory.find().sort({ order: 1 });
    res.json({ success: true, data: updated });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

module.exports = { getCategories, createCategory, updateCategory, deleteCategory, reorderCategory };
