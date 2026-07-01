const express         = require("express");
const { createProfile } = require("./systemUsers.controller");

const router = express.Router();

// POST /api/system-users/create-profile  (public)
router.post("/create-profile", createProfile);

module.exports = router;
