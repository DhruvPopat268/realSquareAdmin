const { validationResult } = require("express-validator");
const PropertyListing    = require("./model");
const AutoApprovalConfig = require("../../admin/autoApprovalConfig/model");
const PropertyCategory   = require("../../admin/propertyCategories/model");
const PropertyPurpose    = require("../../admin/propertyPurposes/model");
const PropertyType       = require("../../admin/propertyTypes/model");
const City               = require("../../admin/cities/model");
const FurnishingAmenity  = require("../../admin/furnishingsAndAmenities/model");

const toUrl = (filePath) =>
  `${process.env.BACKEND_URL}${filePath.replace("/var/www/storage", "/storage")}`;

// ── Auto-approval resolution ──────────────────────────────────────────────────
async function resolveStatus(user) {
  if (!user.autoApprovalProperties) return "UnderReview";
  const roleConfig = await AutoApprovalConfig.findOne({ roleId: user.role });
  if (roleConfig?.isActive) return "Active";
  return "UnderReview";
}

// ── POST /property-listings ───────────────────────────────────────────────────
const create = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty())
    return res.status(400).json({ success: false, errors: errors.array() });

  const {
    categoryId, listingTypeId, propertyTypeId, cityId, locality,
    residentialDetails, plotDetails, pgDetails, commercialDetails,
    sellInfo, rentInfo,
  } = req.body;

  try {
    const [category, listingType, propertyType, city] = await Promise.all([
      PropertyCategory.findById(categoryId).select("name"),
      PropertyPurpose.findById(listingTypeId).select("name"),
      propertyTypeId ? PropertyType.findById(propertyTypeId).select("name") : Promise.resolve(null),
      City.findById(cityId).select("name"),
    ]);

    if (!category)     return res.status(404).json({ success: false, message: "Category not found" });
    if (!listingType)  return res.status(404).json({ success: false, message: "Listing type not found" });
    if (propertyTypeId && !propertyType) return res.status(404).json({ success: false, message: "Property type not found" });
    if (!city)         return res.status(404).json({ success: false, message: "City not found" });

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
      city:        { id: city._id,          name: city.name },
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
    const listing = await PropertyListing.findById(req.params.id);
    if (!listing) return res.status(404).json({ success: false, message: "Listing not found" });

    if (!req.files?.length)
      return res.status(400).json({ success: false, message: "No images uploaded" });

    const urls = req.files.map((f) => toUrl(f.path));
    listing.media.images.push(...urls);
    await listing.save();

    res.json({ success: true, data: { images: listing.media.images } });
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

// ── GET /property-listings/active-cities ─────────────────────────────────────
const getActiveCities = async (req, res) => {
  try {
    const cities = await City.find({ isActive: true })
      .select("name")
      .sort({ name: 1 });

    res.json({ success: true, data: cities });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

module.exports = { create, uploadMedia, getActiveFurnishingsAndAmenities, getActivePropertyCategories, getActivePropertyPurposes, getActivePropertyTypes, getActiveCities };