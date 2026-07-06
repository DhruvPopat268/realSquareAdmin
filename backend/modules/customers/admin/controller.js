const SystemUser = require("../../systemUsers.model");

const CUSTOMER_ROLE_ID = process.env.CUSTOMER_ROLE_ID;

const getCustomers = async (req, res) => {
  try {
    const customers = await SystemUser.find({ role: CUSTOMER_ROLE_ID })
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
    const { fullName, email, bio, location, mobile } = req.body;

    const updateData = {};
    if (fullName !== undefined) updateData["customerProfile.fullName"] = fullName;
    if (email     !== undefined) updateData["customerProfile.email"]    = email;
    if (bio       !== undefined) updateData["customerProfile.bio"]      = bio;
    if (location  !== undefined) updateData["customerProfile.location"] = location;
    if (mobile    !== undefined) {
      updateData["mobile"]                  = mobile;
      updateData["customerProfile.mobile"]  = mobile;
    }
    const customer = await SystemUser.findByIdAndUpdate(
      id,
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

    const customer = await SystemUser.findByIdAndUpdate(
      id,
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

    const customer = await SystemUser.findByIdAndDelete(id);
    if (!customer)
      return res.status(404).json({ success: false, message: "Customer not found" });

    res.json({ success: true, message: "Customer deleted successfully" });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

module.exports = { getCustomers, updateCustomer, updateCustomerStatus, deleteCustomer };
