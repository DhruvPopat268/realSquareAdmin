const SystemUser = require("./systemUsers.model");

// ── Allowed roles for self-registration (role ID → profile field) ─────────────
const ALLOWED_ROLES = {
  [process.env.CUSTOMER_ROLE_ID]: "customerProfile",
  [process.env.OWNER_ROLE_ID]:    "ownerProfile",
  [process.env.BROKER_ROLE_ID]:   "brokerProfile",
  [process.env.BUILDER_ROLE_ID]:  "builderProfile",
};

// ── Create Profile (public) ───────────────────────────────────────────────────
// POST /api/system-users/create-profile
// Customer, owner, broker, builder can self-register via this endpoint
const createProfile = async (req, res) => {
  try {
    const { role, profile } = req.body;

    if (!role)
      return res.status(400).json({ success: false, message: "role is required" });

    if (!profile || typeof profile !== "object")
      return res.status(400).json({ success: false, message: "profile object is required" });

    // block panel users / unknown roles
    const profileField = ALLOWED_ROLES[role];
    if (!profileField)
      return res.status(403).json({ success: false, message: "This role is not allowed to self-register" });

    // email uniqueness check
    if (profile.email) {
      const exists = await SystemUser.findOne({ [`${profileField}.email`]: profile.email });
      if (exists)
        return res.status(409).json({ success: false, message: "Email already registered" });
    }

    const user = await SystemUser.create({
      role,
      isActive:     true,
      isSuperAdmin: false,
      [profileField]: profile,
    });

    await user.populate("role", "name permissions isActive");

    res.status(201).json({ success: true, data: user });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

module.exports = { createProfile };
