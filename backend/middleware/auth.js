const jwt           = require("jsonwebtoken");
const SystemUser    = require("../modules/systemUsers.model");
const SystemUserSession = require("../modules/admin/auth/session.model");

// ── Panel / admin users ───────────────────────────────────────────────────────
const protect = async (req, res, next) => {
  const token = req.cookies?.admin_token || req.headers.authorization?.split(" ")[1];

  if (!token)
    return res.status(401).json({ success: false, message: "Not authorized, no token" });

  try {
    const decoded = jwt.verify(token, process.env.ADMIN_JWT_SECRET);

    const session = await SystemUserSession.findOne({ token });
    if (!session)
      return res.status(401).json({ success: false, message: "Session expired or logged out" });

    req.user = await SystemUser.findByIdAndUpdate(
      decoded.id,
      { lastActivity: new Date() },
      { new: true }
    ).select("-profile.password").populate("role", "name permissions isActive");

    if (!req.user)
      return res.status(401).json({ success: false, message: "User not found" });

    next();
  } catch (err) {
    return res.status(401).json({ success: false, message: "Not authorized, token failed" });
  }
};

const adminOnly = (req, res, next) => {
  if (req.user && req.user.isSuperAdmin) {
    next();
  } else {
    res.status(403).json({ success: false, message: "Admin access only" });
  }
};

module.exports = { protect, adminOnly };
