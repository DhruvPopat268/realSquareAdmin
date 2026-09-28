const express                    = require("express");
const { createInquiry, runCronAssignment } = require("./controller");
const { userProtect }            = require("../../../middleware/userAuth");
const { createInquiryValidator } = require("./validator");

const router = express.Router();

// ── Cron secret middleware ────────────────────────────────────────────────────
const cronProtect = (req, res, next) => {
  const secret = req.headers["x-cron-secret"];
  if (!secret || secret !== process.env.CRONJOB_SECRET) {
    return res.status(401).json({ success: false, message: "Unauthorized" });
  }
  next();
};

// POST /api/mixed/inquiries/create
router.post("/create", userProtect, createInquiryValidator, createInquiry);

// GET /api/mixed/inquiries/cron-assign
router.get("/cron-assign", cronProtect, runCronAssignment);

module.exports = router;
