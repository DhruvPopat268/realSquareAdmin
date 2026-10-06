const express = require("express");
const { getCustomers, createCustomer, updateCustomer, updateCustomerStatus, deleteCustomer } = require("./controller");
const { protect } = require("../../../middleware/auth");
const { uploadImage } = require("../../../utils/upload");

const router = express.Router();

router.get("/",                  protect, getCustomers);
router.post("/",                 protect, uploadImage.single("profilePhoto"), createCustomer);
router.put("/:id",               protect, uploadImage.single("profilePhoto"), updateCustomer);
router.patch("/:id/status",      protect, updateCustomerStatus);
router.delete("/:id",            protect, deleteCustomer);

module.exports = router;
