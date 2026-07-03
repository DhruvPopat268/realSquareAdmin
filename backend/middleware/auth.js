const jwt = require("jsonwebtoken");
const SystemUser        = require("../modules/systemUsers.model");
const SystemUserSession = require("../modules/admin/auth/session.model");
const UserSession       = require("../modules/systemUsers.session.model");

const protect = async (req, res, next) => {
  let token;

  if (req.cookies?.admin_token) {
    token = req.cookies.admin_token;
  } else if (req.cookies?.user_token) {
    token = req.cookies.user_token;
  } else if (req.headers.authorization?.startsWith("Bearer")) {
    token = req.headers.authorization.split(" ")[1];
  }

  if (!token)
    return res.status(401).json({ success: false, message: "Not authorized, no token" });

  try {
    const payload = jwt.decode(token);

    let secret;
    if (payload?.type === "admin")  secret = process.env.ADMIN_JWT_SECRET;
    else if (payload?.type === "user") secret = process.env.USER_JWT_SECRET;
    else secret = process.env.CUSTOMER_JWT_SECRET;

    const decoded = jwt.verify(token, secret);

    if (decoded.type === "admin") {
      const session = await SystemUserSession.findOne({ token });
      if (!session)
        return res.status(401).json({ success: false, message: "Session expired or logged out" });

      req.user = await SystemUser.findByIdAndUpdate(
        decoded.id,
        { lastActivity: new Date() },
        { new: true }
      ).select("-profile.password").populate("role", "name permissions isActive");

    } else if (decoded.type === "user") {
      const session = await UserSession.findOne({ token });
      if (!session)
        return res.status(401).json({ success: false, message: "Session expired or logged out" });

      req.user = await SystemUser.findByIdAndUpdate(
        decoded.id,
        { lastActivity: new Date() },
        { new: true }
      ).populate("role", "name permissions isActive");
    }

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
