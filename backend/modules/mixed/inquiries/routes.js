const express                    = require("express");
const { createInquiry }          = require("./controller");
const { userProtect }                = require("../../../middleware/userAuth");
const { createInquiryValidator } = require("./validator");

const router = express.Router();

// POST /api/mixed/inquiries/create
router.post("/create", userProtect, createInquiryValidator, createInquiry);

module.exports = router;
