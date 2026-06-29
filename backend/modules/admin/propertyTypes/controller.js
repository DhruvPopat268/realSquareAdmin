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

    const types = await PropertyType.find(filter).populate("propertyCategory", "name").sort({ createdAt: -1 });
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

  const { name, propertyCategory, description, isActive } = req.body;

  try {
    const exists = await PropertyType.findOne({ name: new RegExp(`^${name.trim()}$`, "i"), propertyCategory });
    if (exists)
      return res.status(409).json({ success: false, message: "Property type name already exists in this category" });

    const type = await PropertyType.create({ name: name.trim(), propertyCategory, description, isActive: isActive ?? true });
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
    if (name || propertyCategory) {
      const existing = await PropertyType.findById(req.params.id);
      if (!existing)
        return res.status(404).json({ success: false, message: "Property type not found" });

      const checkName     = name             ? name.trim()        : existing.name;
      const checkCategory = propertyCategory ? propertyCategory   : existing.propertyCategory.toString();

      const duplicate = await PropertyType.findOne({
        name:             new RegExp(`^${checkName}$`, "i"),
        propertyCategory: checkCategory,
        _id:              { $ne: req.params.id },
      });
      if (duplicate)
        return res.status(409).json({ success: false, message: "Property type name already exists in this category" });
    }

    const type = await PropertyType.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true }).populate("propertyCategory", "name");
    if (!type)
      return res.status(404).json({ success: false, message: "Property type not found" });

    res.json({ success: true, data: type });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ── Delete ────────────────────────────────────────────────────────────────────
const deletePropertyType = async (req, res) => {
  try {
    const type = await PropertyType.findByIdAndDelete(req.params.id);
    if (!type)
      return res.status(404).json({ success: false, message: "Property type not found" });

    res.json({ success: true, message: "Property type deleted successfully" });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

module.exports = { getPropertyTypes, createPropertyType, updatePropertyType, deletePropertyType };
