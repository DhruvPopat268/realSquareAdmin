const express = require("express");
const { getCategories, createCategory, updateCategory, deleteCategory } = require("./controller");
const { createCategoryValidator, updateCategoryValidator } = require("./validator");
const { protect } = require("../../../middleware/auth");

const router = express.Router();

router.use(protect);

router.get("/",       getCategories);
router.post("/",      createCategoryValidator, createCategory);
router.put("/:id",    updateCategoryValidator, updateCategory);
router.delete("/:id", deleteCategory);

module.exports = router;
