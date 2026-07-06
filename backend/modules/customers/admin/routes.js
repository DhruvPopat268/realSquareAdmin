const express = require("express");
const { getCustomers, updateCustomer, updateCustomerStatus, deleteCustomer } = require("./controller");
const { protect } = require("../../../middleware/auth");

const router = express.Router();

router.get("/",                  protect, getCustomers);
router.put("/:id",               protect, updateCustomer);
router.patch("/:id/status",      protect, updateCustomerStatus);
router.delete("/:id",            protect, deleteCustomer);

module.exports = router;
