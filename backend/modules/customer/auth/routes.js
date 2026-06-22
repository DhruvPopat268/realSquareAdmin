const express = require("express");
const { register, login, getMe } = require("./controller");
const { registerValidator, loginValidator } = require("./validator");
const { protect } = require("../../../middleware/auth");

const router = express.Router();

router.post("/register", registerValidator, register);
router.post("/login", loginValidator, login);
router.get("/me", protect, getMe);

module.exports = router;
