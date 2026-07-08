const express      = require("express");
const { createCoinsOrder } = require("./controller");
const { userProtect }      = require("../../../middleware/userAuth");

const router = express.Router();

router.use(userProtect);

router.post("/order", createCoinsOrder);

module.exports = router;
