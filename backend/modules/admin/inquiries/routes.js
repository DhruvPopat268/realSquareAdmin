const express = require("express");
const { protect } = require("../../../middleware/auth");
const {
  getInquiries,
  updateInquiryStatus,
  getAssignedInquiries,
  getAssignedInquiriesByInquiryId,
  getInquiryRoles,
} = require("./controller");

const router = express.Router();

router.use(protect);

// GET /api/admin/inquiries/roles — customer-facing creator roles for inquiry filters
router.get("/roles", getInquiryRoles);

// GET /api/admin/inquiries — source inquiries, one record per inquiry
router.get("/", getInquiries);

// PATCH /api/admin/inquiries/status — close an active inquiry as inactive or completed
router.patch("/status", updateInquiryStatus);

// GET /api/admin/inquiries/assigned — one record per user assignment
router.get("/assigned", getAssignedInquiries);

// GET /api/admin/inquiries/assigned/:inquiryId — assignments for one source inquiry
router.get("/assigned/:inquiryId", getAssignedInquiriesByInquiryId);

module.exports = router;
