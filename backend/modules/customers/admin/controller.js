const SystemUser = require("../../systemUsers.model");
const SystemUserSession = require("../../systemUsers.session.model");

const CUSTOMER_ROLE_ID = process.env.CUSTOMER_ROLE_ID;

const getCustomers = async (req, res) => {
  try {
    const isDeleted = req.query.isDeleted;
    if (isDeleted && !["true", "false", "all"].includes(isDeleted))
      return res.status(400).json({ success: false, message: "isDeleted must be true, false, or all" });
    const filter = { role: CUSTOMER_ROLE_ID };
    if (isDeleted !== "all") filter.isDeleted = isDeleted === "true" ? true : { $ne: true };
    const customers = await SystemUser.find(filter)
      .populate("role", "name permissions isActive")
      .sort({ createdAt: -1 });

    res.json({ success: true, data: customers });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

const updateCustomer = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, email, bio, location, mobile } = req.body;

    const updateData = {};
    if (name     !== undefined) updateData["name"]                    = name;
    if (email    !== undefined) updateData["email"]                   = email;
    if (mobile   !== undefined) updateData["mobile"]                  = mobile;
    if (bio      !== undefined) updateData["customerProfile.bio"]     = bio;
    if (location !== undefined) updateData["customerProfile.location"] = location;
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

module.exports = { getCustomers, updateCustomer, updateCustomerStatus, deleteCustomer };
