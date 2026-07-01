const { validationResult } = require("express-validator");
const SystemUserRole = require("./model");

// ── Protected role IDs (from env) ─────────────────────────────────────────────
const ADMIN_ROLE_ID    = process.env.ADMIN_ROLE_ID;
const PROTECTED_ROLE_IDS = [
  process.env.ADMIN_ROLE_ID,
  process.env.OWNER_ROLE_ID,
  process.env.BROKER_ROLE_ID,
  process.env.BUILDER_ROLE_ID,
  process.env.CUSTOMER_ROLE_ID,
].filter(Boolean);

// ── Get All Roles ─────────────────────────────────────────────────────────────
const getRoles = async (req, res) => {
  try {
    const filter = {};
    if (req.query.isActive === "true")  filter.isActive = true;
    if (req.query.isActive === "false") filter.isActive = false;
    if (req.query.search)              filter.name = new RegExp(req.query.search.trim(), "i");

    const roles = await SystemUserRole.find(filter).sort({ createdAt: -1 });
    res.json({ success: true, data: roles });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ── Get Single Role ───────────────────────────────────────────────────────────
const getRoleById = async (req, res) => {
  try {
    const role = await SystemUserRole.findById(req.params.id);
    if (!role)
      return res.status(404).json({ success: false, message: "Role not found" });

    res.json({ success: true, data: role });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ── Create Role ───────────────────────────────────────────────────────────────
const createRole = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty())
    return res.status(400).json({ success: false, errors: errors.array() });

  const { name, permissions, isActive } = req.body;

  try {
    const exists = await SystemUserRole.findOne({ name: new RegExp(`^${name.trim()}$`, "i") });
    if (exists)
      return res.status(409).json({ success: false, message: "Role name already exists" });

    const role = await SystemUserRole.create({
      name:        name.trim(),
      permissions: permissions ?? [],
      isActive:    isActive ?? true,
    });

    res.status(201).json({ success: true, data: role });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ── Update Role ───────────────────────────────────────────────────────────────
const updateRole = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty())
    return res.status(400).json({ success: false, errors: errors.array() });

  const { name } = req.body;
  const id = req.params.id;

  // All protected roles: fully locked
  if (PROTECTED_ROLE_IDS.includes(id))
    return res.status(403).json({ success: false, message: "Cannot modify a protected role" });

  try {
    if (name) {
      const exists = await SystemUserRole.findOne({
        name: new RegExp(`^${name.trim()}$`, "i"),
        _id:  { $ne: id },
      });
      if (exists)
        return res.status(409).json({ success: false, message: "Role name already exists" });
    }

    const role = await SystemUserRole.findByIdAndUpdate(
      id,
      req.body,
      { new: true, runValidators: true }
    );

    if (!role)
      return res.status(404).json({ success: false, message: "Role not found" });

    res.json({ success: true, data: role });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ── Delete Role ───────────────────────────────────────────────────────────────
const deleteRole = async (req, res) => {
  try {
    if (PROTECTED_ROLE_IDS.includes(req.params.id))
      return res.status(403).json({ success: false, message: "Cannot delete a protected role" });

    const role = await SystemUserRole.findByIdAndDelete(req.params.id);
    if (!role)
      return res.status(404).json({ success: false, message: "Role not found" });

    res.json({ success: true, message: "Role deleted successfully" });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

module.exports = { getRoles, getRoleById, createRole, updateRole, deleteRole };
