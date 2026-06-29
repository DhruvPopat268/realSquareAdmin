const express = require("express");
const { getCities, createCity, updateCity, deleteCity } = require("./controller");
const { createCityValidator, updateCityValidator } = require("./validator");
const { protect } = require("../../../middleware/auth");

const router = express.Router();

router.use(protect);

router.get("/",       getCities);
router.post("/",      createCityValidator, createCity);
router.put("/:id",    updateCityValidator, updateCity);
router.delete("/:id", deleteCity);

module.exports = router;
