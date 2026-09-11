const express = require("express");
const { createPlan, getPlans, getPlanById, updatePlan, toggleActive, deletePlan } = require("./controller");
const { protect } = require("../../../middleware/auth");

const router = express.Router();

router.use(protect);

router.get("/",             getPlans);
router.get("/:id",          getPlanById);
router.post("/",            createPlan);
router.put("/:id",          updatePlan);
router.patch("/:id/toggle", toggleActive);
router.delete("/:id",       deletePlan);

module.exports = router;
