const express = require("express");
const { getRoles, getRoleById, createRole, updateRole, deleteRole } = require("./controller");
const { createRoleValidator, updateRoleValidator } = require("./validator");
const { protect } = require("../../../middleware/auth");

const router = express.Router();

router.use(protect);

router.get("/",       getRoles);
router.get("/:id",    getRoleById);
router.post("/",      createRoleValidator,  createRole);
router.put("/:id",    updateRoleValidator,  updateRole);
router.delete("/:id", deleteRole);

module.exports = router;
