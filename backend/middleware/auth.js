const jwt = require("jsonwebtoken");
const SystemUser = require("../modules/systemUsers.model");
const SystemUserSession = require("../modules/admin/auth/session.model");
const Customer = require("../modules/customer/auth/model");

const protect = async (req, res, next) => {
  let token;

  // extract token — cookie first, fallback to Authorization header
  if (req.cookies?.admin_token) {
    token = req.cookies.admin_token;
  } else if (req.headers.authorization?.startsWith("Bearer")) {
    token = req.headers.authorization.split(" ")[1];
  }

  if (!token) {
    return res.status(401).json({ success: false, message: "Not authorized, no token" });
  }

  try {
    // decode without verification first to read the type
    const payload = jwt.decode(token);

    const secret = payload?.type === "admin"
      ? process.env.ADMIN_JWT_SECRET
      : process.env.CUSTOMER_JWT_SECRET;

    // verify signature and expiry
    const decoded = jwt.verify(token, secret);

    if (decoded.type === "admin") {
      // check token exists in session store
      const session = await SystemUserSession.findOne({ token });
      if (!session) {
        return res.status(401).json({ success: false, message: "Session expired or logged out" });
      }

      req.user = await SystemUser.findByIdAndUpdate(
        decoded.id,
        { lastActivity: new Date() },
        { new: true }
      ).select("-profile.password").populate("role", "name permissions isActive");
    } else if (decoded.type === "customer") {
      req.user = await Customer.findById(decoded.id).select("-password");
    }

    if (!req.user) {
      return res.status(401).json({ success: false, message: "User not found" });
    }

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
