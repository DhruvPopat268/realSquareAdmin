const CoinsOffer = require("./model");

// ── Get All ───────────────────────────────────────────────────────────────────
const getCoinsOffers = async (req, res) => {
  try {
    const filter = {};
    if (req.query.isActive === "true")  filter.isActive = true;
    if (req.query.isActive === "false") filter.isActive = false;
    if (req.query.search)              filter.name      = new RegExp(req.query.search.trim(), "i");

    const offers = await CoinsOffer.find(filter).sort({ createdAt: -1 });
    res.json({ success: true, data: offers });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ── Get Single ────────────────────────────────────────────────────────────────
const getCoinsOfferById = async (req, res) => {
  try {
    const offer = await CoinsOffer.findById(req.params.id);
    if (!offer)
      return res.status(404).json({ success: false, message: "Coins offer not found" });

    res.json({ success: true, data: offer });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ── Create ────────────────────────────────────────────────────────────────────
const createCoinsOffer = async (req, res) => {
  try {
    const { name, description, coins, amount, isActive } = req.body;

    if (!name || coins == null || amount == null)
      return res.status(400).json({ success: false, message: "name, coins and amount are required" });

    const exists = await CoinsOffer.findOne({ name: new RegExp(`^${name.trim()}$`, "i") });
    if (exists)
      return res.status(409).json({ success: false, message: "Coins offer name already exists" });

    const offer = await CoinsOffer.create({
      name: name.trim(), description, coins, amount,
      isActive: isActive ?? true,
    });

    res.status(201).json({ success: true, data: offer });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ── Update ────────────────────────────────────────────────────────────────────
const updateCoinsOffer = async (req, res) => {
  try {
    const { name, description, coins, amount, isActive } = req.body;

    if (!name || coins == null || amount == null)
      return res.status(400).json({ success: false, message: "name, coins and amount are required" });

    const duplicate = await CoinsOffer.findOne({
      name: new RegExp(`^${name.trim()}$`, "i"),
      _id:  { $ne: req.params.id },
    });
    if (duplicate)
      return res.status(409).json({ success: false, message: "Coins offer name already exists" });

    const offer = await CoinsOffer.findByIdAndUpdate(
      req.params.id,
      { name: name.trim(), description, coins, amount, isActive },
      { new: true, runValidators: true }
    );
    if (!offer)
      return res.status(404).json({ success: false, message: "Coins offer not found" });

    res.json({ success: true, data: offer });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ── Toggle isActive ───────────────────────────────────────────────────────────
const toggleActive = async (req, res) => {
  try {
    const offer = await CoinsOffer.findById(req.params.id);
    if (!offer)
      return res.status(404).json({ success: false, message: "Coins offer not found" });

    offer.isActive = !offer.isActive;
    await offer.save();
    res.json({ success: true, data: offer });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ── Delete ────────────────────────────────────────────────────────────────────
const deleteCoinsOffer = async (req, res) => {
  try {
    const offer = await CoinsOffer.findByIdAndDelete(req.params.id);
    if (!offer)
      return res.status(404).json({ success: false, message: "Coins offer not found" });

    res.json({ success: true, message: "Coins offer deleted successfully" });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

module.exports = { getCoinsOffers, getCoinsOfferById, createCoinsOffer, updateCoinsOffer, toggleActive, deleteCoinsOffer };
