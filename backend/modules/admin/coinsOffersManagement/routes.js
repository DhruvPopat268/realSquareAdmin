const express = require("express");
const {
  getCoinsOffers, getCoinsOfferById,
  createCoinsOffer, updateCoinsOffer,
  toggleActive, deleteCoinsOffer,
} = require("./controller");
const { protect } = require("../../../middleware/auth");

const router = express.Router();

router.use(protect);

router.get("/",              getCoinsOffers);
router.get("/:id",           getCoinsOfferById);
router.post("/",             createCoinsOffer);
router.put("/:id",           updateCoinsOffer);
router.patch("/:id/toggle",  toggleActive);
router.delete("/:id",        deleteCoinsOffer);

module.exports = router;
