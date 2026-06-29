const express = require("express");
const { getPropertyTypes, createPropertyType, updatePropertyType, deletePropertyType } = require("./controller");
const { createPropertyTypeValidator, updatePropertyTypeValidator } = require("./validator");
const { protect } = require("../../../middleware/auth");

const router = express.Router();

router.use(protect);

router.get("/",       getPropertyTypes);
router.post("/",      createPropertyTypeValidator, createPropertyType);
router.put("/:id",    updatePropertyTypeValidator, updatePropertyType);
router.delete("/:id", deletePropertyType);

module.exports = router;
