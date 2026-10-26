const { validationResult } = require("express-validator");
const IdealFor = require("./model");

const toUrl = (filePath) =>
  `${process.env.BACKEND_URL}${filePath.replace("/var/www/storage", "/storage")}`;
const escapeRegExp = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const parseBoolean = (value, fallback) => value === undefined ? fallback : value === true || value === "true";

const getAll = async (req, res) => {
  try {
    const filter = {};
    if (req.query.isActive === "true") filter.isActive = true;
    if (req.query.isActive === "false") filter.isActive = false;
    if (req.query.search?.trim()) filter.name = new RegExp(escapeRegExp(req.query.search.trim()), "i");
    const records = await IdealFor.find(filter).sort({ order: 1, _id: 1 });
    return res.json({ success: true, data: records });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

const create = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ success: false, errors: errors.array() });
  try {
    const name = req.body.name.trim();
    const duplicate = await IdealFor.findOne({ name: new RegExp(`^${escapeRegExp(name)}$`, "i") });
    if (duplicate) return res.status(409).json({ success: false, message: "Ideal For name already exists" });
    const last = await IdealFor.findOne().sort({ order: -1 });
    const record = await IdealFor.create({
      name,
      image: req.file ? toUrl(req.file.path) : req.body.image,
      isActive: parseBoolean(req.body.isActive, true),
      order: (last?.order ?? 0) + 1,
    });
    return res.status(201).json({ success: true, data: record });
  } catch (error) {
    if (error.code === 11000) return res.status(409).json({ success: false, message: "Ideal For name already exists" });
    return res.status(500).json({ success: false, message: error.message });
  }
};

const update = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ success: false, errors: errors.array() });
  try {
    const record = await IdealFor.findById(req.params.id);
    if (!record) return res.status(404).json({ success: false, message: "Ideal For option not found" });
    const name = req.body.name?.trim() ?? record.name;
    const duplicate = await IdealFor.findOne({ name: new RegExp(`^${escapeRegExp(name)}$`, "i"), _id: { $ne: record._id } });
    if (duplicate) return res.status(409).json({ success: false, message: "Ideal For name already exists" });
    record.name = name;
    if (req.file) record.image = toUrl(req.file.path);
    else if (req.body.image) record.image = req.body.image;
    if (req.body.isActive !== undefined) record.isActive = parseBoolean(req.body.isActive);
    await record.save();
    return res.json({ success: true, data: record });
  } catch (error) {
    if (error.code === 11000) return res.status(409).json({ success: false, message: "Ideal For name already exists" });
    return res.status(500).json({ success: false, message: error.message });
  }
};

const reorder = async (req, res) => {
  const { direction } = req.body;
  if (!["up", "down"].includes(direction)) {
    return res.status(400).json({ success: false, message: "direction must be 'up' or 'down'" });
  }
  try {
    const records = await IdealFor.find().sort({ order: 1, _id: 1 });
    const index = records.findIndex((record) => String(record._id) === req.params.id);
    if (index < 0) return res.status(404).json({ success: false, message: "Ideal For option not found" });
    const siblingIndex = direction === "up" ? index - 1 : index + 1;
    if (siblingIndex < 0 || siblingIndex >= records.length) {
      return res.status(400).json({ success: false, message: `No option to move ${direction}` });
    }
    const current = records[index];
    const sibling = records[siblingIndex];
    [current.order, sibling.order] = [sibling.order, current.order];
    await Promise.all([current.save(), sibling.save()]);
    const updated = await IdealFor.find().sort({ order: 1, _id: 1 });
    return res.json({ success: true, data: updated });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

const remove = async (req, res) => {
  try {
    const record = await IdealFor.findByIdAndDelete(req.params.id);
    if (!record) return res.status(404).json({ success: false, message: "Ideal For option not found" });
    const remaining = await IdealFor.find().sort({ order: 1, _id: 1 });
    await Promise.all(remaining.map((item, index) => {
      if (item.order === index + 1) return undefined;
      item.order = index + 1;
      return item.save();
    }));
    return res.json({ success: true, message: "Deleted successfully" });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

const getActiveIdealFor = async (_req, res) => {
  try {
    const records = await IdealFor.find({ isActive: true }).select("name image order").sort({ order: 1, _id: 1 });
    return res.json({ success: true, data: records });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = { getAll, create, update, reorder, remove, getActiveIdealFor };
