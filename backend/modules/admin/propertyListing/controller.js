const mongoose = require("mongoose");
const PropertyListing = require("../../mixed/propertyListing/model");
const SystemUserRole = require("../systemUsersRoles/model");

const LISTING_TYPE_SELL_ID = process.env.LISTING_TYPE_SELL_ID;
const LISTING_TYPE_RENT_ID = process.env.LISTING_TYPE_RENT_ID;
const LISTING_TYPE_PG_ID = process.env.LISTING_TYPE_PG_ID;

// ─── Helpers ──────────────────────────────────────────────────────────────────

const escapeRegex = (str) => str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const buildQuery = (reqQuery, listingTypeId = null) => {
  const { search, status, categoryId, typeId, purposeId, roleId, userId, city, fromDate, toDate } = reqQuery;
  const query = {};

  // Filter by listing type — prefer explicit listingTypeId arg, fallback to purposeId query param
  const resolvedListingTypeId = listingTypeId || (purposeId && mongoose.isValidObjectId(purposeId) ? purposeId : null);
  if (resolvedListingTypeId) {
    query["listingType.id"] = new mongoose.Types.ObjectId(resolvedListingTypeId);
  }

  // Search by city, locality address, listedBy name, listedBy mobile
  if (typeof search === "string") {
    const s = search.trim().slice(0, 100);
    if (s) {
      const escaped = escapeRegex(s);
      query.$or = [
        { cityName: { $regex: escaped, $options: "i" } },
        { "locality.address": { $regex: escaped, $options: "i" } },
        { "listedBy.name": { $regex: escaped, $options: "i" } },
        { "listedBy.mobile": { $regex: escaped, $options: "i" } },
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

  // Filter by lister's role
  if (roleId && mongoose.isValidObjectId(roleId)) {
    query["listedBy.role.id"] = new mongoose.Types.ObjectId(roleId);
  }

  // Filter by lister (user)
  if (userId && mongoose.isValidObjectId(userId)) {
    query["listedBy.id"] = new mongoose.Types.ObjectId(userId);
  }

  // Filter by city
  if (typeof city === "string") {
    const c = city.trim().slice(0, 100);
    if (c) query.cityName = { $regex: escapeRegex(c), $options: "i" };
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

    const pageNum = Math.max(1, parseInt(page));
    const limitNum = Math.min(100, Math.max(1, parseInt(limit)));
    const skip = (pageNum - 1) * limitNum;

    const query = buildQuery(req.query, listingTypeId);

    // Stats query — same filters as main query but WITHOUT status
    // so counts reflect all statuses under the current filter set
    const { status: _omit, ...reqQueryWithoutStatus } = req.query;
    const statsQuery = buildQuery(reqQueryWithoutStatus, listingTypeId);

    const [listings, total, stats] = await Promise.all([
      PropertyListing.find(query)
        .select("category listingType propertyType cityName locality listedBy media.images sellInfo rentInfo pgDetails.rooms status approvedAt rejectedAt rejectedReasons createdAt updatedAt")
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

    // Process listings to add computed price fields
    const processedListings = listings.map((listing) => {
      let sellPrice = null;
      let rentPrice = null;
      let pgPrice = null;

      // Sell listings
      if (listing.listingType?.id?.toString() === LISTING_TYPE_SELL_ID) {
        sellPrice = listing.sellInfo?.price ?? null;
      }

      // Rent listings
      else if (listing.listingType?.id?.toString() === LISTING_TYPE_RENT_ID) {
        rentPrice = listing.rentInfo?.monthlyRent ?? null;
      }

      // PG listings — compute range from rooms
      else if (listing.listingType?.id?.toString() === LISTING_TYPE_PG_ID && listing.pgDetails?.rooms?.length) {
        const rooms = listing.pgDetails.rooms;
        const rents = rooms.map(r => r.rent).filter(r => r != null);
        if (rents.length > 0) {
          const minRent = Math.min(...rents);
          const maxRent = Math.max(...rents);
          pgPrice = minRent === maxRent ? minRent : `${minRent} - ${maxRent}`;
        }
      }

      // Remove pgDetails from response
      const { pgDetails, ...listingWithoutPgDetails } = listing;

      return {
        ...listingWithoutPgDetails,
        sellPrice,
        rentPrice,
        pgPrice,
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

// GET /admin/property-listings/:id — Single listing detail
const getById = async (req, res) => {
  try {
    const listing = await PropertyListing.findById(req.params.id).lean();
    if (!listing) return res.status(404).json({ success: false, message: "Listing not found" });
    res.json({ success: true, data: listing });
  } catch (err) {
    if (err.name === "CastError") return res.status(404).json({ success: false, message: "Listing not found" });
    res.status(500).json({ success: false, message: err.message });
  }
};

// GET /admin/property-listings/listing-user-roles — Owner, Broker, Builder, Customer roles only
const getListingUserRoles = async (req, res) => {
  try {
    const ids = [
      process.env.OWNER_ROLE_ID,
      process.env.BROKER_ROLE_ID,
      process.env.BUILDER_ROLE_ID,
    ].filter(Boolean).filter(id => mongoose.isValidObjectId(id));

    const roles = await SystemUserRole.find({ _id: { $in: ids } })
      .select("name")
      .lean();

    res.json({ success: true, data: roles });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// PATCH /admin/property-listings/:id/approve
const approve = async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ success: false, message: "Invalid listing ID" });
    }

    const listing = await PropertyListing.findOneAndUpdate(
      { _id: req.params.id, status: "UnderReview" },
      {
        $set: {
          status:          "Active",
          approvedAt:      new Date(),
          rejectedAt:      null,
          rejectedReasons: [],
        },
      },
      { new: true }
    );

    if (!listing) {
      const exists = await PropertyListing.findById(req.params.id).select("status");
      if (!exists) return res.status(404).json({ success: false, message: "Listing not found" });
      return res.status(400).json({
        success: false,
        message: `Listing cannot be approved. Current status is '${exists.status}', expected 'UnderReview'`,
      });
    }

    res.json({ success: true, message: "Listing approved successfully", data: { status: listing.status, approvedAt: listing.approvedAt } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// PATCH /admin/property-listings/:id/reject
const reject = async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ success: false, message: "Invalid listing ID" });
    }

    const { reasons } = req.body;

    if (!Array.isArray(reasons) || reasons.length === 0) {
      return res.status(400).json({ success: false, message: "At least one rejection reason is required" });
    }

    const cleanedReasons = reasons.map((r) => (typeof r === "string" ? r.trim() : "")).filter(Boolean);

    if (cleanedReasons.length === 0) {
      return res.status(400).json({ success: false, message: "At least one non-empty rejection reason is required" });
    }

    const listing = await PropertyListing.findOneAndUpdate(
      { _id: req.params.id, status: "UnderReview" },
      {
        $set: {
          status:          "Rejected",
          rejectedAt:      new Date(),
          rejectedReasons: cleanedReasons,
          approvedAt:      null,
        },
      },
      { new: true }
    );

    if (!listing) {
      const exists = await PropertyListing.findById(req.params.id).select("status");
      if (!exists) return res.status(404).json({ success: false, message: "Listing not found" });
      return res.status(400).json({
        success: false,
        message: `Listing cannot be rejected. Current status is '${exists.status}', expected 'UnderReview'`,
      });
    }

    res.json({ success: true, message: "Listing rejected successfully", data: { status: listing.status, rejectedAt: listing.rejectedAt, rejectedReasons: listing.rejectedReasons } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

module.exports = { getAll, getById, getListingUserRoles, approve, reject };
