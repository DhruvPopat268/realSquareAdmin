const { validationResult } = require("express-validator");
const mongoose           = require("mongoose");
const PropertyListing    = require("./model");
const AutoApprovalConfig = require("../../admin/autoApprovalConfig/model");
const PropertyCategory   = require("../../admin/propertyCategories/model");
const PropertyPurpose    = require("../../admin/propertyPurposes/model");
const PropertyType       = require("../../admin/propertyTypes/model");
const FurnishingAmenity  = require("../../admin/furnishingsAndAmenities/model");
const FreeListingConfig  = require("../../admin/freeListingManagement/model");
const ListingPurchasedPlan = require("../purchasedPlans/model");
const SystemUser         = require("../../systemUsers.model");

const toUrl = (filePath) =>
  `${process.env.BACKEND_URL}${filePath.replace("/var/www/storage", "/storage")}`;

// ── IST date helper ───────────────────────────────────────────────────────────
function nowIST() {
  // returns current time as a Date object aligned to IST offset
  const now = new Date();
  const IST_OFFSET = 5.5 * 60 * 60 * 1000; // +05:30 in ms
  return new Date(now.getTime() + IST_OFFSET);
}

function toIST(date) {
  const IST_OFFSET = 5.5 * 60 * 60 * 1000;
  return new Date(new Date(date).getTime() + IST_OFFSET);
}

// ── Find valid active plan for user ──────────────────────────────────────────
async function findValidPlan(userId) {
  const now = nowIST();
  console.log("[findValidPlan] Current IST:", now.toISOString());
  const plans = await ListingPurchasedPlan.find({ user: userId, status: "Active" });
  return plans.find((p) => {
    const isUnlimited = p.plan.numberOfPropertiesGiven === -1;
    if (!isUnlimited && p.propertiesUsed >= p.plan.numberOfPropertiesGiven) return false;
    if (p.expiryDate === null || p.expiryDate === undefined) {
      console.log(`[findValidPlan] Plan "${p.plan.name}" expiryDate: null (never expires)`);
      console.log(`[findValidPlan] expiry >= now: true`);
      return true; // null = never expires
    }
    const expiry = toIST(p.expiryDate);
    console.log(`[findValidPlan] Plan "${p.plan.name}" expiryDate IST:`, expiry.toISOString());
    console.log(`[findValidPlan] expiry >= now:`, expiry >= now);
    return expiry >= now;
  }) ?? null;
}

// ── Auto-approval resolution ──────────────────────────────────────────────────
async function resolveStatus(user) {
  if (!user.autoApprovalProperties) return "UnderReview";
  const roleConfig = await AutoApprovalConfig.findOne({ roleId: user.role });
  if (roleConfig?.isActive) return "Active";
  return "UnderReview";
}

// ── GET /property-listings/can-list ──────────────────────────────────────────
const canList = async (req, res) => {
  try {
    // 1. Check active plan credits
    const validPlan = await findValidPlan(req.user._id);
    if (validPlan) {
      const isUnlimited = validPlan.plan.numberOfPropertiesGiven === -1;
      return res.json({
        success: true,
        canList: true,
        source: "plan",
        remaining: isUnlimited ? -1 : validPlan.plan.numberOfPropertiesGiven - validPlan.propertiesUsed,
      });
    }

    // 2. Check free listing credits
    const [config, user] = await Promise.all([
      FreeListingConfig.findOne().sort({ createdAt: -1 }),
      SystemUser.findById(req.user._id).select("freeListedProperties"),
    ]);

    const noOfListings      = config?.noOfListings ?? 0;
    const freeListedSoFar   = user?.freeListedProperties ?? 0;

    if (noOfListings === -1) {
      // unlimited free listings
      return res.json({ success: true, canList: true, source: "free", remaining: -1 });
    }

    if (freeListedSoFar < noOfListings) {
      return res.json({
        success: true,
        canList: true,
        source: "free",
        remaining: noOfListings - freeListedSoFar,
      });
    }

    // 3. Not eligible
    return res.json({
      success: true,
      canList: false,
      message: "You have no listing credits remaining. Please purchase a plan to list more properties.",
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ── POST /property-listings ───────────────────────────────────────────────────
const create = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty())
    return res.status(400).json({ success: false, errors: errors.array() });

  const {
    categoryId, listingTypeId, propertyTypeId, cityName, locality,
    residentialDetails, plotDetails, pgDetails, commercialDetails,
    sellInfo, rentInfo,
  } = req.body;

  try {
    // ── Profile completion check ──────────────────────────────────────────────
    const userProfile = req.user.customerProfile || req.user.ownerProfile || req.user.brokerProfile || req.user.builderProfile;
    const displayName = req.user.name || userProfile?.fullName || userProfile?.name || "";
    const isProfileCompleted = !!(req.user.mobile && displayName && req.user.role);

    if (!isProfileCompleted) {
      return res.status(403).json({
        success: false,
        message: "Please complete your profile before listing properties. You need to fill in your name and other required details.",
      });
    }

    // ── Credit check & deduction ──────────────────────────────────────────────
    const validPlan = await findValidPlan(req.user._id);

    if (!validPlan) {
      // fall back to free listing credits
      const [config, userDoc] = await Promise.all([
        FreeListingConfig.findOne().sort({ createdAt: -1 }),
        SystemUser.findById(req.user._id).select("freeListedProperties"),
      ]);

      const noOfListings    = config?.noOfListings ?? 0;
      const freeListedSoFar = userDoc?.freeListedProperties ?? 0;

      const hasFreeCredits  = noOfListings === -1 || freeListedSoFar < noOfListings;
      if (!hasFreeCredits)
        return res.status(403).json({
          success: false,
          message: "You have no listing credits remaining. Please purchase a plan to list more properties.",
        });
    }
    const [category, listingType, propertyType] = await Promise.all([
      PropertyCategory.findById(categoryId).select("name"),
      PropertyPurpose.findById(listingTypeId).select("name"),
      propertyTypeId ? PropertyType.findById(propertyTypeId).select("name") : Promise.resolve(null),
    ]);

    if (!category)     return res.status(404).json({ success: false, message: "Category not found" });
    if (!listingType)  return res.status(404).json({ success: false, message: "Listing type not found" });
    if (propertyTypeId && !propertyType) return res.status(404).json({ success: false, message: "Property type not found" });

    // resolve furnishings & amenities from IDs
    let resolvedResidential = residentialDetails;
    if (residentialDetails) {
      const allIds = [
        ...(residentialDetails.furnishings || []).map((f) => f.furnishingId),
        ...(residentialDetails.amenities   || []).map((a) => a.amenityId),
      ];
      const items   = await FurnishingAmenity.find({ _id: { $in: allIds } }).select("name");
      const itemMap = Object.fromEntries(items.map((i) => [i._id.toString(), i.name]));

      resolvedResidential = {
        ...residentialDetails,
        furnishings: (residentialDetails.furnishings || []).map((f) => ({
          id:    f.furnishingId,
          name:  itemMap[f.furnishingId],
          count: f.count,
        })),
        amenities: (residentialDetails.amenities || []).map((a) => ({
          id:   a.amenityId,
          name: itemMap[a.amenityId],
          count: a.count,
        })),
      };
    }

    // build denormalized listedBy from req.user
    const u       = req.user;
    const profile = u.ownerProfile || u.brokerProfile || u.builderProfile || u.profile || {};
    const listedByDoc = {
      id:           u._id,
      name:         profile.fullName || profile.name,
      mobile:       profile.mobile   || u.mobile,
      email:        profile.email,
      profilePhoto: profile.profilePhoto,
      role: { id: u.role?._id, name: u.role?.name },
    };

    const status = await resolveStatus(u);

    const listing = await PropertyListing.create({
      category:    { id: category._id,      name: category.name },
      listingType: { id: listingType._id,   name: listingType.name },
      propertyType: propertyType ? { id: propertyType._id, name: propertyType.name } : undefined,
      cityName,
      locality,
      listedBy: listedByDoc,
      residentialDetails: resolvedResidential,
      plotDetails,
      pgDetails: pgDetails ? {
        ...pgDetails,
        rooms: (pgDetails.rooms || []).map((r) =>
          r.roomType === "1 Sharing" ? { ...r, bedsAvailable: 1 } : r
        ),
      } : undefined,
      commercialDetails,
      sellInfo,
      rentInfo,
      status,
    });

    // ── Deduct credit ─────────────────────────────────────────────────────────
    if (validPlan) {
      const isUnlimited = validPlan.plan.numberOfPropertiesGiven === -1;
      if (!isUnlimited) {
        validPlan.propertiesUsed += 1;
        if (validPlan.propertiesUsed >= validPlan.plan.numberOfPropertiesGiven) {
          validPlan.status = "Consumed";
        }
        await validPlan.save();
      }
    } else {
      await SystemUser.findByIdAndUpdate(req.user._id, { $inc: { freeListedProperties: 1 } });
    }

    res.status(201).json({
      success: true,
      message: status === "Active" ? "Property listed successfully" : "Property is in under review",
      data: { _id: listing._id, status: listing.status, listedBy: listing.listedBy },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ── POST /property-listings/:id/media ─────────────────────────────────────────
const uploadMedia = async (req, res) => {
  try {
    const listing = await PropertyListing.findById(req.body.propertyId);
    if (!listing) return res.status(404).json({ success: false, message: "Listing not found" });

    if (!req.files?.length)
      return res.status(400).json({ success: false, message: "No images uploaded" });

    const urls = req.files.map((f) => toUrl(f.path));
    listing.media.images.push(...urls);
    await listing.save();

    res.json({ success: true, message: listing.status === "Active" ? "Property listed successfully" : "Property is in under review", data: { images: listing.media.images } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ── GET /property-listings/active-furnishings-amenities ─────────────────────
const getActiveFurnishingsAndAmenities = async (req, res) => {
  try {
    const items = await FurnishingAmenity.find({ isActive: true })
      .select("name type hasCount icon order")
      .sort({ order: 1, name: 1 });

    const furnishings = items.filter((i) => i.type === "Furnishing");
    const amenities   = items.filter((i) => i.type === "Amenity");

    res.json({ success: true, data: { furnishings, amenities } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ── GET /property-listings/active-categories ─────────────────────────────────
const getActivePropertyCategories = async (req, res) => {
  try {
    const categories = await PropertyCategory.find({ isActive: true })
      .select("name description order")
      .sort({ order: 1, name: 1 });

    res.json({ success: true, data: categories });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ── GET /property-listings/active-purposes ───────────────────────────────────
const getActivePropertyPurposes = async (req, res) => {
  try {
    const purposes = await PropertyPurpose.find({ isActive: true })
      .select("name description order")
      .sort({ order: 1, name: 1 });

    res.json({ success: true, data: purposes });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ── GET /property-listings/active-property-types ──────────────────────────────
const getActivePropertyTypes = async (req, res) => {
  try {
    const filter = { isActive: true };
    if (req.query.categoryId) filter.propertyCategory = req.query.categoryId;

    const types = await PropertyType.find(filter)
      .select("name description order propertyCategory")
      .populate("propertyCategory", "name")
      .sort({ order: 1, name: 1 });

    res.json({ success: true, data: types });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ── Normalize title & price for display cards ─────────────────────────────────
function normalizeListingCard(listing) {
  const categoryId = listing.category?.id?.toString() ?? "";
  const listingTypeId = listing.listingType?.id?.toString() ?? "";
  const propertyTypeId = listing.propertyType?.id?.toString() ?? "";
  
  const city     = listing.cityName ?? "";
  const typeName = listing.propertyType?.name ?? "";
  const purpose  = listing.listingType?.name ?? "";

  console.log(`[DEBUG] normalizeListingCard: categoryId=${categoryId}, listingTypeId=${listingTypeId}, propertyTypeId=${propertyTypeId}, city="${city}", typeName="${typeName}", purpose="${purpose}"`);

  let title = "";
  let price = null;
  let priceLabel = "";

  // ── Title ──────────────────────────────────────────────────────────────────
  // Check listing type first (PG/Rent/Sell) then category
  if (listingTypeId === process.env.LISTING_TYPE_PG_ID) {
    const pgName = listing.pgDetails?.pgName;
    title = pgName ? `${pgName}${city ? " in " + city : ""}` : `PG / Co-living${city ? " in " + city : ""}`;
  } else if (categoryId === process.env.CATEGORY_RESIDENTIAL_ID) {
    const bhk = listing.residentialDetails?.bhk;
    const bhkStr = bhk ? `${bhk} BHK ` : "";
    title = `${bhkStr}${typeName}${city ? " in " + city : ""}`.trim();
  } else if (categoryId === process.env.CATEGORY_COMMERCIAL_ID) {
    // Check if it's a plot or regular commercial
    const plotIds = [
      process.env.COMMERCIAL_PROPERTY_TYPE_PLOT_IDS,
      process.env.RESIDENTIAL_PROPERTY_TYPE_PLOT_IDS
    ].join(',').split(',').filter(Boolean);
    
    if (plotIds.includes(propertyTypeId)) {
      const area = listing.plotDetails?.plotArea;
      const areaStr = area?.value ? `${area.value} ${area.unit ?? "sqft"} ` : "";
      title = `${areaStr}Plot${city ? " in " + city : ""}`.trim();
    } else {
      title = `${typeName || "Commercial"}${city ? " in " + city : ""}`.trim();
    }
  } else {
    // fallback
    title = `${typeName || listing.category?.name || "Property"}${city ? " in " + city : ""}`.trim();
  }

  // ── Price ──────────────────────────────────────────────────────────────────
  if (listingTypeId === process.env.LISTING_TYPE_SELL_ID) {
    price = listing.sellInfo?.price ?? null;
    priceLabel = price ? `₹${formatPrice(price)}` : "Price on request";
  } else if (listingTypeId === process.env.LISTING_TYPE_RENT_ID) {
    price = listing.rentInfo?.monthlyRent ?? null;
    priceLabel = price ? `₹${formatPrice(price)}/month` : "Price on request";
  } else if (listingTypeId === process.env.LISTING_TYPE_PG_ID) {
    // Show room options with rent ranges
    const rooms = listing.pgDetails?.rooms ?? [];
    if (rooms.length > 0) {
      const rents = rooms.map(r => r.rent).filter(Boolean);
      if (rents.length > 0) {
        const minRent = Math.min(...rents);
        const maxRent = Math.max(...rents);
        if (minRent === maxRent) {
          priceLabel = `₹${formatPrice(minRent)}/month`;
        } else {
          priceLabel = `₹${formatPrice(minRent)} - ₹${formatPrice(maxRent)}/month`;
        }
      } else {
        priceLabel = "Price on request";
      }
    } else {
      priceLabel = "Price on request";
    }
  }

  return {
    _id:         listing._id,
    title:       title || "Property",
    price:       priceLabel,
    thumbnail:   listing.media?.images?.[0] ?? null,
    media:       listing.media ?? { images: [] },
    listingType: listing.listingType?.name ?? "",
    category:    listing.category?.name ?? "",
    propertyType: listing.propertyType?.name ?? "",
    cityName:    listing.cityName ?? "",
    address:     listing.locality?.address ?? "",
    status:      listing.status,
    createdAt:   listing.createdAt,
    listedBy:    listing.listedBy ?? null,
    // Additional property-specific info
    furnishType: listing.residentialDetails?.furnishType ?? null, // Only for residential
    pgFor:       listing.pgDetails?.pgFor ?? null, // Only for PG
    builtUpArea: listing.residentialDetails?.builtUpArea || listing.commercialDetails?.builtUpArea || null,
    plotArea:    listing.plotDetails?.plotArea || listing.commercialDetails?.plotArea || null,
    societyName: listing.residentialDetails?.societyName || listing.plotDetails?.societyName || listing.commercialDetails?.societyName || null,
  };
}

function formatPrice(n) {
  if (n >= 10000000) return (n / 10000000).toFixed(2).replace(/\.?0+$/, "") + " Cr";
  if (n >= 100000)   return (n / 100000).toFixed(2).replace(/\.?0+$/, "") + " L";
  if (n >= 1000)     return (n / 1000).toFixed(1).replace(/\.?0+$/, "") + "K";
  return n.toString();
}

// ── GET /property-listings/:id (public) ──────────────────────────────────────
const getListingById = async (req, res) => {
  try {
    const listing = await PropertyListing.findById(req.params.id).lean();
    if (!listing) return res.status(404).json({ success: false, message: "Listing not found" });
    // Merge normalized title & price into the full listing doc
    const normalized = normalizeListingCard(listing);
    res.json({ success: true, data: { ...listing, title: normalized.title, price: normalized.price } });
  } catch (err) {
    // Invalid ObjectId format
    if (err.name === "CastError") return res.status(404).json({ success: false, message: "Listing not found" });
    res.status(500).json({ success: false, message: err.message });
  }
};

// ── GET /property-listings/my-listings ───────────────────────────────────────
const getMyListings = async (req, res) => {
  try {
    // ── Preview mode: ?limit=N with no page param (e.g. navbar preview) ──────
    if (req.query.limit && !req.query.page) {
      const limit = parseInt(req.query.limit);
      if (limit > 0) {
        const listings = await PropertyListing.find({ "listedBy.id": req.user._id })
          .select("category listingType propertyType cityName locality media status residentialDetails plotDetails pgDetails commercialDetails sellInfo rentInfo createdAt listedBy")
          .sort({ createdAt: -1 })
          .limit(limit)
          .lean();
        return res.json({ success: true, data: { properties: listings.map(normalizeListingCard) } });
      }
    }

    // ── Paginated mode ────────────────────────────────────────────────────────
    const PAGE_LIMIT = Math.min(parseInt(req.query.limit) || 10, 50);
    const page       = Math.max(parseInt(req.query.page)  || 1, 1);
    const skip       = (page - 1) * PAGE_LIMIT;

    const STATUS_VALUES = ["Active", "Inactive", "Sold", "Rented", "UnderReview", "Rejected"];
    const filter = { "listedBy.id": req.user._id };
    if (req.query.status && STATUS_VALUES.includes(req.query.status)) {
      filter.status = req.query.status;
    }
    if (req.query.purposeId)  filter["listingType.id"]  = new mongoose.Types.ObjectId(req.query.purposeId);
    if (req.query.categoryId) filter["category.id"]     = new mongoose.Types.ObjectId(req.query.categoryId);
    if (req.query.typeId)     filter["propertyType.id"] = new mongoose.Types.ObjectId(req.query.typeId);

    // On page 1 run status aggregation (always on base user filter, ignoring
    // active status/purpose/category/type filters so counts reflect totals).
    const baseFilter = { "listedBy.id": req.user._id };
    const parallelTasks = [
      PropertyListing.find(filter)
        .select("category listingType propertyType cityName locality media status residentialDetails plotDetails pgDetails commercialDetails sellInfo rentInfo createdAt listedBy")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(PAGE_LIMIT)
        .lean(),
      PropertyListing.countDocuments(filter),
    ];

    if (page === 1) {
      parallelTasks.push(
        PropertyListing.aggregate([
          { $match: baseFilter },
          { $group: { _id: "$status", count: { $sum: 1 } } },
        ])
      );
    }

    const results    = await Promise.all(parallelTasks);
    const listings   = results[0];
    const totalCount = results[1];

    const properties = listings.map(normalizeListingCard);
    const hasMore    = skip + listings.length < totalCount;

    const response = {
      success: true,
      data: {
        properties,
        pagination: { page, limit: PAGE_LIMIT, totalCount, hasMore },
      },
    };

    // stats only on page 1 — always reflects ALL listings regardless of filters
    if (page === 1) {
      const aggRows = results[2];
      const stats = { total: 0 };
      for (const row of aggRows) {
        stats[row._id] = row.count;
        stats.total   += row.count;
      }
      response.data.stats = stats;
    }

    res.json(response);
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

module.exports = { canList, create, uploadMedia, getActiveFurnishingsAndAmenities, getActivePropertyCategories, getActivePropertyPurposes, getActivePropertyTypes, getMyListings, getListingById };