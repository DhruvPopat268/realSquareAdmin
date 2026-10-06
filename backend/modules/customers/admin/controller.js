const SystemUser = require("../../systemUsers.model");
const SystemUserSession = require("../../systemUsers.session.model");
const getAdminUserStats = require("../../../utils/adminUserStats");

const CUSTOMER_ROLE_ID = process.env.CUSTOMER_ROLE_ID;
const toUrl = (filePath) =>
  `${process.env.BACKEND_URL}${filePath.replace("/var/www/storage", "/storage")}`;

const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const getCustomers = async (req, res) => {
  try {
    const isDeleted = req.query.isDeleted;
    if (isDeleted && !["true", "false", "all"].includes(isDeleted))
      return res.status(400).json({ success: false, message: "isDeleted must be true, false, or all" });

    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 10));
    const skip = (page - 1) * limit;
    const statsFilter = { role: CUSTOMER_ROLE_ID };
    const filter = { ...statsFilter };
    if (isDeleted !== "all") filter.isDeleted = isDeleted === "true" ? true : { $ne: true };
    if (typeof req.query.search === "string" && req.query.search.trim()) {
      const search = new RegExp(escapeRegex(req.query.search.trim()), "i");
      filter.$or = [{ name: search }, { email: search }, { mobile: search }];
    }

    const [customers, total, stats] = await Promise.all([
      SystemUser.find(filter)
        .populate("role", "name permissions isActive")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      SystemUser.countDocuments(filter),
      getAdminUserStats(statsFilter),
    ]);

    res.json({
      success: true,
      data: customers,
      stats,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

const createCustomer = async (req, res) => {
  try {
    const name = typeof req.body.name === "string" ? req.body.name.trim() : "";
    const mobile = typeof req.body.mobile === "string" ? req.body.mobile.trim() : "";
    const email = typeof req.body.email === "string" ? req.body.email.trim().toLowerCase() : "";
    const bio = typeof req.body.bio === "string" ? req.body.bio.trim() : "";
    let location = req.body.location;
    const profilePhoto = req.file ? toUrl(req.file.path) : undefined;

    if (!name || !mobile) {
      return res.status(400).json({ success: false, message: "Name and mobile are required" });
    }
    if (!/^\d{10}$/.test(mobile)) {
      return res.status(400).json({ success: false, message: "Mobile must be exactly 10 digits" });
    }
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ success: false, message: "Please provide a valid email address" });
    }
    if (typeof location === "string") {
      try {
        location = JSON.parse(location);
      } catch {
        return res.status(400).json({ success: false, message: "Location must be valid JSON" });
      }
    }
    if (location !== undefined && location !== null) {
      const latitude = Number(location.latitude);
      const longitude = Number(location.longitude);
      if (
        typeof location.name !== "string" || !location.name.trim() ||
        !Number.isFinite(latitude) || !Number.isFinite(longitude)
      ) {
        return res.status(400).json({ success: false, message: "Location must include a name, latitude, and longitude" });
      }
    }
    if (!CUSTOMER_ROLE_ID) {
      return res.status(500).json({ success: false, message: "Customer role is not configured" });
    }

    const existingCustomer = await SystemUser.findOne({ mobile });
    if (existingCustomer) {
      return res.status(409).json({ success: false, message: "Mobile already registered" });
    }
    if (email) {
      const existingEmail = await SystemUser.findOne({ email });
      if (existingEmail) {
        return res.status(409).json({ success: false, message: "Email already registered" });
      }
    }

    const customerProfile = {
      ...(bio ? { bio } : {}),
      ...(location ? {
        location: {
          name: location.name.trim(),
          latitude: Number(location.latitude),
          longitude: Number(location.longitude),
        },
      } : {}),
    };
    const customer = await SystemUser.create({
      name,
      mobile,
      ...(email ? { email } : {}),
      ...(profilePhoto ? { profilePhoto } : {}),
      ...(Object.keys(customerProfile).length ? { customerProfile } : {}),
      role: CUSTOMER_ROLE_ID,
    });
    await customer.populate("role", "name permissions isActive");

    return res.status(201).json({ success: true, data: customer });
  } catch (err) {
    if (err.code === 11000) {
      const duplicateField = Object.keys(err.keyPattern || {})[0];
      return res.status(409).json({
        success: false,
        message: duplicateField === "email" ? "Email already registered" : "Mobile already registered",
      });
    }
    return res.status(500).json({ success: false, message: err.message });
  }
};

const updateCustomer = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, email, bio, mobile } = req.body;
    let { location } = req.body;

    if (mobile !== undefined && (typeof mobile !== "string" || !/^\d{10}$/.test(mobile.trim()))) {
      return res.status(400).json({ success: false, message: "Mobile must be exactly 10 digits" });
    }

    const updateData = {};
    if (name     !== undefined) updateData["name"]                    = name;
    if (email    !== undefined) updateData["email"]                   = email;
    if (mobile   !== undefined) updateData["mobile"]                  = mobile.trim();
    if (bio      !== undefined) updateData["customerProfile.bio"]     = bio;
    if (typeof location === "string") {
      try {
        location = JSON.parse(location);
      } catch {
        return res.status(400).json({ success: false, message: "Location must be valid JSON" });
      }
    }
    if (location !== undefined) updateData["customerProfile.location"] = location;
    if (req.file) updateData.profilePhoto = toUrl(req.file.path);
    const customer = await SystemUser.findOneAndUpdate(
      { _id: id, isDeleted: { $ne: true } },
      { $set: updateData },
      { new: true, runValidators: true }
    ).populate("role", "name permissions isActive");

    if (!customer)
      return res.status(404).json({ success: false, message: "Customer not found" });

    res.json({ success: true, data: customer });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

const updateCustomerStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { isActive } = req.body;

    if (isActive === undefined)
      return res.status(400).json({ success: false, message: "isActive is required" });

    const customer = await SystemUser.findOneAndUpdate(
      { _id: id, isDeleted: { $ne: true } },
      { $set: { isActive } },
      { new: true }
    ).populate("role", "name permissions isActive");

    if (!customer)
      return res.status(404).json({ success: false, message: "Customer not found" });

    res.json({ success: true, data: customer });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

const deleteCustomer = async (req, res) => {
  try {
    const { id } = req.params;

    const customer = await SystemUser.findOneAndUpdate(
      { _id: id, role: CUSTOMER_ROLE_ID, isDeleted: { $ne: true } },
      { $set: { isDeleted: true } },
      { new: true }
    );
    if (!customer)
      return res.status(404).json({ success: false, message: "Customer not found" });

    await SystemUserSession.deleteMany({ userId: customer._id });

    res.json({ success: true, message: "Customer deleted successfully" });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

module.exports = { getCustomers, createCustomer, updateCustomer, updateCustomerStatus, deleteCustomer };
