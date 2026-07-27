const express = require("express");
const { getAll, create, update, remove, reorder } = require("./controller");
const { protect } = require("../../../middleware/auth");
const { uploadImage } = require("../../../utils/upload");

const router = express.Router();

router.use(protect);

router.get("/",              getAll);
router.post("/",             uploadImage.single("icon"), create);
router.put("/:id",           uploadImage.single("icon"), update);
router.patch("/:id/reorder", reorder);
router.delete("/:id",        remove);

module.exports = router;
