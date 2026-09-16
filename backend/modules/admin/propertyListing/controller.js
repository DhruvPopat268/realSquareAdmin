const mongoose = require("mongoose");
const PropertyListing = require("../../mixed/propertyListing/model");

const LISTING_TYPE_SELL_ID = process.env.LISTING_TYPE_SELL_ID;
const LISTING_TYPE_RENT_ID = process.env.LISTING_TYPE_RENT_ID;
const LISTING_TYPE_PG_ID   = process.env.LISTING_TYPE_PG_ID;

// ─── Helpers ──────────────────────────────────────────────────────────────────

const escapeRegex = (str) => str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const buildQuery = (reqQuery, listingTypeId = null) => {
  const { search, status, categoryId, fromDate, toDate } = reqQuery;
  const query = {};

  // Filter by listing type if provided
  if (listingTypeId) {
    query["listingType.id"] = new mongoose.Types.ObjectId(listingTypeId);
  }

  // Search by city, locality address, listedBy name, listedBy mobile
  if (typeof search === "string") {
    const s = search.trim().slice(0, 100);
    if (s) {
      const escaped = escapeRegex(s);
      query.$or = [
        { cityName:              { $regex: escaped, $options: "i" } },
        { "locality.address":    { $regex: escaped, $options: "i" } },
        { "listedBy.name":       { $regex: escaped, $options: "i" } },
        { "listedBy.mobile":     { $regex: escaped, $options: "i" } },
      ];
    }
  }

  // Filter by status
  const validStatuses = ["Active", "Inactive", "Sold", "Rented", "UnderReview", "Rejected"];
  if (status && validStatuses.includes(status)) {
    query.status = status;
  }

  // Filter by category
  if (categoryId && mongoose.isValidObjectId(categoryId)) {
    query["category.id"] = new mongoose.Types.ObjectId(categoryId);
  }

  // Date range filter on createdAt
  if (fromDate || toDate) {
    query.createdAt = {};
    if (fromDate) {
      const from = new Date(fromDate);
      if (!isNaN(from.getTime())) query.createdAt.$gte = from;
    }
    if (toDate) {
      const to = new Date(toDate);
      if (!isNaN(to.getTime())) {
        to.setHours(23, 59, 59, 999);
        query.createdAt.$lte = to;
      }
    }
  }

  return query;
};

const getPaginatedListings = async (req, res, listingTypeId = null) => {
  try {
    const { page = 1, limit = 10 } = req.query;

    const pageNum  = Math.max(1, parseInt(page));
    const limitNum = Math.min(100, Math.max(1, parseInt(limit)));
    const skip     = (pageNum - 1) * limitNum;

    const query = buildQuery(req.query, listingTypeId);

    const [listings, total] = await Promise.all([
      PropertyListing.find(query)
        .select("category listingType cityName locality listedBy media.images status createdAt updatedAt")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum)
        .lean(),
      PropertyListing.countDocuments(query),
    ]);

    return res.status(200).json({
      success: true,
      data: listings,
      pagination: {
        total,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(total / limitNum),
      },
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

// ─── Controllers ──────────────────────────────────────────────────────────────

// GET /admin/property-listings — All listings
const getAll = (req, res) => getPaginatedListings(req, res, null);

// GET /admin/property-listings/for-sell — Sell listings only
const getForSell = (req, res) => getPaginatedListings(req, res, LISTING_TYPE_SELL_ID);

// GET /admin/property-listings/for-rent — Rent listings only
const getForRent = (req, res) => getPaginatedListings(req, res, LISTING_TYPE_RENT_ID);

// GET /admin/property-listings/for-pg — PG/Co-living listings only
const getForPG = (req, res) => getPaginatedListings(req, res, LISTING_TYPE_PG_ID);

module.exports = { getAll, getForSell, getForRent, getForPG };
