const mongoose = require("mongoose");
const PropertyListing = require("../../mixed/propertyListing/model");

const LISTING_TYPE_SELL_ID = process.env.LISTING_TYPE_SELL_ID;
const LISTING_TYPE_RENT_ID = process.env.LISTING_TYPE_RENT_ID;
const LISTING_TYPE_PG_ID   = process.env.LISTING_TYPE_PG_ID;

// ─── Helpers ──────────────────────────────────────────────────────────────────

const escapeRegex = (str) => str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const buildQuery = (reqQuery, listingTypeId = null) => {
  const { search, status, categoryId, typeId, fromDate, toDate } = reqQuery;
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

  // Filter by property type
  if (typeId && mongoose.isValidObjectId(typeId)) {
    query["propertyType.id"] = new mongoose.Types.ObjectId(typeId);
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

    // Base query for stats (without pagination filters from buildQuery)
    const statsQuery = {};
    if (listingTypeId) {
      statsQuery["listingType.id"] = new mongoose.Types.ObjectId(listingTypeId);
    }

    const [listings, total, stats] = await Promise.all([
      PropertyListing.find(query)
        .select("category listingType propertyType cityName locality listedBy media.images sellInfo rentInfo pgDetails.rooms status createdAt updatedAt")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum)
        .lean(),
      PropertyListing.countDocuments(query),
      // Calculate status-wise counts
      PropertyListing.aggregate([
        { $match: statsQuery },
        {
          $group: {
            _id: "$status",
            count: { $sum: 1 }
          }
        }
      ])
    ]);

    // Process stats into object
    const statusCounts = {
      total: 0,
      Active: 0,
      Inactive: 0,
      Sold: 0,
      Rented: 0,
      UnderReview: 0,
      Rejected: 0
    };

    stats.forEach(stat => {
      if (stat._id && statusCounts.hasOwnProperty(stat._id)) {
        statusCounts[stat._id] = stat.count;
      }
      statusCounts.total += stat.count;
    });

    // Process listings to add computed price field
    const processedListings = listings.map((listing) => {
      let price = null;
      
      // For Sell listings
      if (listing.listingType?.id?.toString() === LISTING_TYPE_SELL_ID) {
        price = listing.sellInfo?.price ?? null;
      }
      
      // For Rent listings
      else if (listing.listingType?.id?.toString() === LISTING_TYPE_RENT_ID) {
        price = listing.rentInfo?.monthlyRent ?? null;
      }
      
      // For PG listings - handle multiple room configs
      else if (listing.listingType?.id?.toString() === LISTING_TYPE_PG_ID && listing.pgDetails?.rooms?.length) {
        const rooms = listing.pgDetails.rooms;
        if (rooms.length === 1) {
          // Single room config - return direct price
          price = rooms[0].rent ?? null;
        } else {
          // Multiple room configs - return range
          const rents = rooms.map(r => r.rent).filter(r => r != null);
          if (rents.length > 0) {
            const minRent = Math.min(...rents);
            const maxRent = Math.max(...rents);
            price = minRent === maxRent ? minRent : `${minRent} - ${maxRent}`;
          }
        }
      }
      
      // Remove pgDetails from response
      const { pgDetails, ...listingWithoutPgDetails } = listing;
      
      return {
        ...listingWithoutPgDetails,
        price,
      };
    });

    return res.status(200).json({
      success: true,
      data: {
        properties: processedListings,
        stats: statusCounts
      },
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
