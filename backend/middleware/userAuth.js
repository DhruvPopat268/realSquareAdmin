const jwt         = require("jsonwebtoken");
const SystemUser  = require("../modules/systemUsers.model");
const UserSession = require("../modules/systemUsers.session.model");

const userProtect = async (req, res, next) => {
  const token = req.cookies?.user_token || req.headers.authorization?.split(" ")[1];

  if (!token)
    return res.status(401).json({ success: false, message: "Not authorized, no token" });

  try {
    const decoded = jwt.verify(token, process.env.USER_JWT_SECRET);

    const session = await UserSession.findOne({ token });
    if (!session)
      return res.status(401).json({ success: false, message: "Session expired or logged out" });

    const user = await SystemUser.findByIdAndUpdate(
      decoded.id,
      { lastActivity: new Date() },
      { new: true }
    ).populate("role", "name permissions isActive");

    if (!user)
      return res.status(401).json({ success: false, message: "User not found" });

    req.user = user;
    req.userRole = user.role?._id?.toString() ?? null;
    console.log(req.user, req.userRole);

    next();
  } catch (err) {
    return res.status(401).json({ success: false, message: "Not authorized, token failed" });
  }
};

module.exports = { userProtect };
