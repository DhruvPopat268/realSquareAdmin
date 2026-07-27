const { validationResult } = require("express-validator");
const PropertyPurpose = require("./model");

// ── Get All ───────────────────────────────────────────────────────────────────
const getPurposes = async (req, res) => {
  try {
    const filter = {};
    if (req.query.isActive === "true")  filter.isActive = true;
    if (req.query.isActive === "false") filter.isActive = false;
    if (req.query.search)              filter.name = new RegExp(req.query.search.trim(), "i");

    const purposes = await PropertyPurpose.find(filter).sort({ updatedAt: -1 });
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

  const { name, description, isActive, order } = req.body;

  try {
    const exists = await PropertyPurpose.findOne({ name: new RegExp(`^${name.trim()}$`, "i") });
    if (exists)
      return res.status(409).json({ success: false, message: "Property purpose name already exists" });

    const last      = await PropertyPurpose.findOne().sort({ order: -1 });
    const nextOrder = last ? last.order + 1 : 1;

    if (order !== undefined && order !== nextOrder)
      return res.status(409).json({ success: false, message: `Order must be ${nextOrder} (next available)` });

    const purpose = await PropertyPurpose.create({ name: name.trim(), description, isActive: isActive ?? true, order: nextOrder });
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

    if (req.body.order !== undefined) {
      const orderTaken = await PropertyPurpose.findOne({ order: req.body.order, _id: { $ne: req.params.id } });
      if (orderTaken)
        return res.status(409).json({ success: false, message: "Order value already taken by another purpose" });
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

// ── Reorder ───────────────────────────────────────────────────────────────────
const reorderPurpose = async (req, res) => {
  const { direction } = req.body;
  if (!["up", "down"].includes(direction))
    return res.status(400).json({ success: false, message: "direction must be 'up' or 'down'" });
  try {
    const item = await PropertyPurpose.findById(req.params.id);
    if (!item) return res.status(404).json({ success: false, message: "Property purpose not found" });

    const swapOrder = direction === "up" ? item.order - 1 : item.order + 1;
    const sibling   = await PropertyPurpose.findOne({ order: swapOrder });
    if (!sibling)
      return res.status(400).json({ success: false, message: `No item to swap ${direction}` });

    await PropertyPurpose.findByIdAndUpdate(item._id,    { order: swapOrder });
    await PropertyPurpose.findByIdAndUpdate(sibling._id, { order: item.order });

    const updated = await PropertyPurpose.find().sort({ order: 1 });
    res.json({ success: true, data: updated });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

module.exports = { getPurposes, createPurpose, updatePurpose, deletePurpose, reorderPurpose };
