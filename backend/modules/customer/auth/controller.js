const jwt = require("jsonwebtoken");
const { validationResult } = require("express-validator");
const Customer = require("./model");

const generateToken = (id) =>
  jwt.sign({ id, type: "customer" }, process.env.CUSTOMER_JWT_SECRET, {
    expiresIn: process.env.CUSTOMER_JWT_EXPIRES_IN,
  });

const register = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty())
    return res.status(400).json({ success: false, errors: errors.array() });

  const { name, email, phone, password, address, city } = req.body;

  try {
    const exists = await Customer.findOne({ email });
    if (exists)
      return res.status(409).json({ success: false, message: "Email already registered" });

    const customer = await Customer.create({ name, email, phone, password, address, city });
    res.status(201).json({
      success: true,
      token: generateToken(customer._id),
      data: {
        id: customer._id,
        name: customer.name,
        email: customer.email,
        phone: customer.phone,
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

const login = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty())
    return res.status(400).json({ success: false, errors: errors.array() });

  const { email, password } = req.body;

  try {
    const customer = await Customer.findOne({ email });
    if (!customer || !(await customer.matchPassword(password)))
      return res.status(401).json({ success: false, message: "Invalid email or password" });

    if (!customer.isActive)
      return res.status(403).json({ success: false, message: "Account is deactivated" });

    res.json({
      success: true,
      token: generateToken(customer._id),
      data: {
        id: customer._id,
        name: customer.name,
        email: customer.email,
        phone: customer.phone,
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

const getMe = async (req, res) => {
  res.json({ success: true, data: req.user });
};

module.exports = { register, login, getMe };
