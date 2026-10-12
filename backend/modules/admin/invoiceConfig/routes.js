const express                              = require("express");
const { getInvoiceConfig, upsertInvoiceConfig } = require("./controller");
const { protect }                          = require("../../../middleware/auth");
const { uploadImage }                      = require("../../../utils/upload");

const router = express.Router();

router.use(protect);

router.get("/",   getInvoiceConfig);
router.patch("/", uploadImage.single("companyLogo"), upsertInvoiceConfig);

module.exports = router;
