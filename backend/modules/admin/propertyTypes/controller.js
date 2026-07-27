const { validationResult } = require("express-validator");
const PropertyType = require("./model");

// ── Get All ───────────────────────────────────────────────────────────────────
const getPropertyTypes = async (req, res) => {
  try {
    const filter = {};
    if (req.query.isActive === "true")       filter.isActive         = true;
    if (req.query.isActive === "false")      filter.isActive         = false;
    if (req.query.propertyCategory)          filter.propertyCategory = req.query.propertyCategory;
    if (req.query.search)                    filter.name             = new RegExp(req.query.search.trim(), "i");

    const types = await PropertyType.find(filter).populate("propertyCategory", "name").sort({ propertyCategory: 1, order: 1 });
    res.json({ success: true, data: types });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ── Create ────────────────────────────────────────────────────────────────────
const createPropertyType = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty())
    return res.status(400).json({ success: false, errors: errors.array() });

  const { name, propertyCategory, description, isActive, order } = req.body;

  try {
    const exists = await PropertyType.findOne({ name: new RegExp(`^${name.trim()}$`, "i"), propertyCategory });
    if (exists)
      return res.status(409).json({ success: false, message: "Property type name already exists in this category" });

    const last      = await PropertyType.findOne({ propertyCategory }).sort({ order: -1 });
    const nextOrder = last ? last.order + 1 : 1;

    if (order !== undefined && order !== nextOrder)
      return res.status(409).json({ success: false, message: `Order must be ${nextOrder} (next available in this category)` });

    const type = await PropertyType.create({ name: name.trim(), propertyCategory, description, isActive: isActive ?? true, order: nextOrder });
    await type.populate("propertyCategory", "name");
    res.status(201).json({ success: true, data: type });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ── Update ────────────────────────────────────────────────────────────────────
const updatePropertyType = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty())
    return res.status(400).json({ success: false, errors: errors.array() });

  const { name, propertyCategory } = req.body;

  try {
    const existing = await PropertyType.findById(req.params.id);
    if (!existing)
      return res.status(404).json({ success: false, message: "Property type not found" });

    if (name || propertyCategory) {
      const checkName     = name             ? name.trim()                          : existing.name;
      const checkCategory = propertyCategory ? propertyCategory                     : existing.propertyCategory.toString();

      const duplicate = await PropertyType.findOne({
        name:             new RegExp(`^${checkName}$`, "i"),
        propertyCategory: checkCategory,
        _id:              { $ne: req.params.id },
      });
      if (duplicate)
        return res.status(409).json({ success: false, message: "Property type name already exists in this category" });
    }

    if (req.body.order !== undefined) {
      const checkCategory = propertyCategory ? propertyCategory : existing.propertyCategory.toString();
      const orderTaken    = await PropertyType.findOne({ order: req.body.order, propertyCategory: checkCategory, _id: { $ne: req.params.id } });
      if (orderTaken)
        return res.status(409).json({ success: false, message: "Order value already taken by another type in this category" });
    }

    const type = await PropertyType.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true }).populate("propertyCategory", "name");
    if (!type)
      return res.status(404).json({ success: false, message: "Property type not found" });

    res.json({ success: true, data: type });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ── Reorder (within same category) ──────────────────────────────────────────
const reorderPropertyType = async (req, res) => {
  const { direction } = req.body;
  if (!["up", "down"].includes(direction))
    return res.status(400).json({ success: false, message: "direction must be 'up' or 'down'" });
  try {
    const item = await PropertyType.findById(req.params.id);
    if (!item) return res.status(404).json({ success: false, message: "Property type not found" });

    const swapOrder = direction === "up" ? item.order - 1 : item.order + 1;
    const sibling   = await PropertyType.findOne({ propertyCategory: item.propertyCategory, order: swapOrder });
    if (!sibling)
      return res.status(400).json({ success: false, message: `No item to swap ${direction}` });

    await PropertyType.findByIdAndUpdate(item._id,    { order: swapOrder });
    await PropertyType.findByIdAndUpdate(sibling._id, { order: item.order });

    const updated = await PropertyType.find({ propertyCategory: item.propertyCategory }).populate("propertyCategory", "name").sort({ order: 1 });
    res.json({ success: true, data: updated });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

module.exports = { getPropertyTypes, createPropertyType, updatePropertyType, reorderPropertyType };
