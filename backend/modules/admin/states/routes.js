const express = require("express");
const { getStates, createState, updateState, deleteState } = require("./controller");
const { createStateValidator, updateStateValidator } = require("./validator");
const { protect } = require("../../../middleware/auth");

const router = express.Router();

router.use(protect);

router.get("/",        getStates);
router.post("/",       createStateValidator, createState);
router.put("/:id",     updateStateValidator, updateState);
router.delete("/:id",  deleteState);

module.exports = router;
