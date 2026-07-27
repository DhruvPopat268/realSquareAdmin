const { validationResult } = require("express-validator");
const FurnishingAmenity = require("./model");

const toUrl = (filePath) =>
  `${process.env.BACKEND_URL}${filePath.replace("/var/www/storage", "/storage")}`;

// ── Get All ───────────────────────────────────────────────────────────────────
const getAll = async (req, res) => {
  try {
    const filter = {};
    if (req.query.isActive === "true")  filter.isActive = true;
    if (req.query.isActive === "false") filter.isActive = false;
    if (req.query.type)                 filter.type = req.query.type;
    if (req.query.search)               filter.name = new RegExp(req.query.search.trim(), "i");

    const items = await FurnishingAmenity.find(filter).sort({ type: 1, order: 1 });
    res.json({ success: true, data: items });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ── Create (auto-increment order per type) ────────────────────────────────────
const create = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty())
    return res.status(400).json({ success: false, errors: errors.array() });

  const { name, type, hasCount, isActive } = req.body;
  const icon = req.file ? toUrl(req.file.path) : req.body.icon;

  try {
    const exists = await FurnishingAmenity.findOne({ name: new RegExp(`^${name.trim()}$`, "i"), type });
    if (exists)
      return res.status(409).json({ success: false, message: "Name already exists for this type" });

    const last      = await FurnishingAmenity.findOne({ type }).sort({ order: -1 });
    const nextOrder = last ? last.order + 1 : 1;

    const item = await FurnishingAmenity.create({ name: name.trim(), type, hasCount: hasCount ?? false, icon, order: nextOrder, isActive: isActive ?? true });
    res.status(201).json({ success: true, data: item });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ── Update (no order change here) ─────────────────────────────────────────────
const update = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty())
    return res.status(400).json({ success: false, errors: errors.array() });

  const { name, type } = req.body;

  try {
    const item = await FurnishingAmenity.findById(req.params.id);
    if (!item) return res.status(404).json({ success: false, message: "Item not found" });

    const checkType = type || item.type;
    const checkName = name || item.name;

    const nameExists = await FurnishingAmenity.findOne({ name: new RegExp(`^${checkName.trim()}$`, "i"), type: checkType, _id: { $ne: req.params.id } });
    if (nameExists)
      return res.status(409).json({ success: false, message: "Name already exists for this type" });

    // strip order and icon from body so they can't be changed via plain body
    const { order: _order, icon: _icon, ...safeBody } = req.body;
    if (req.file) safeBody.icon = toUrl(req.file.path);
    const updated = await FurnishingAmenity.findByIdAndUpdate(req.params.id, safeBody, { new: true, runValidators: true });

    res.json({ success: true, data: updated });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ── Reorder (swap with adjacent item) ────────────────────────────────────────
// direction: "up" | "down"
const reorder = async (req, res) => {
  const { direction } = req.body;
  if (!["up", "down"].includes(direction))
    return res.status(400).json({ success: false, message: "direction must be 'up' or 'down'" });

  try {
    const item = await FurnishingAmenity.findById(req.params.id);
    if (!item) return res.status(404).json({ success: false, message: "Item not found" });

    const swapOrder = direction === "up" ? item.order - 1 : item.order + 1;

    const sibling = await FurnishingAmenity.findOne({ type: item.type, order: swapOrder });
    if (!sibling)
      return res.status(400).json({ success: false, message: `No item to swap ${direction}` });

    // swap orders
    await FurnishingAmenity.findByIdAndUpdate(item._id,    { order: swapOrder });
    await FurnishingAmenity.findByIdAndUpdate(sibling._id, { order: item.order });

    const updated = await FurnishingAmenity.find({ type: item.type }).sort({ order: 1 });
    res.json({ success: true, data: updated });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ── Delete ────────────────────────────────────────────────────────────────────
const remove = async (req, res) => {
  try {
    const item = await FurnishingAmenity.findByIdAndDelete(req.params.id);
    if (!item) return res.status(404).json({ success: false, message: "Item not found" });

    res.json({ success: true, message: "Deleted successfully" });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

module.exports = { getAll, create, update, remove, reorder };
