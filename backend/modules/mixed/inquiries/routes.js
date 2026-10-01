const express                    = require("express");
const {
  createInquiry,
  runCronAssignment,
  expireOldInquiries,
  getAssignedInquiries,
  getMyInquiries,
  updateMyInquiryStatus,
  purchaseAssignedInquiry,
} = require("./controller");
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

// GET /api/mixed/inquiries/my
router.get("/my", userProtect, getMyInquiries);

// PATCH /api/mixed/inquiries/status — update an inquiry created by the logged-in user
router.patch("/status", userProtect, updateMyInquiryStatus);

// GET /api/mixed/inquiries/assigned
router.get("/assigned", userProtect, getAssignedInquiries);

// PATCH /api/mixed/inquiries/purchase
router.patch("/purchase", userProtect, purchaseAssignedInquiry);

// GET /api/mixed/inquiries/cron-assign
router.get("/cron-assign", cronProtect, runCronAssignment);

// GET /api/mixed/inquiries/cron-expire
router.get("/cron-expire", cronProtect, expireOldInquiries);

module.exports = router;
