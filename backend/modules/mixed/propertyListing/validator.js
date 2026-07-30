const { body }         = require("express-validator");
const PropertyCategory = require("../../admin/propertyCategories/model");
const PropertyPurpose  = require("../../admin/propertyPurposes/model");
const PropertyType     = require("../../admin/propertyTypes/model");
const City             = require("../../admin/cities/model");
const FurnishingAmenity = require("../../admin/furnishingsAndAmenities/model");

const existsAndActive = (Model, label) => async (id) => {
  const doc = await Model.findById(id).select("isActive");
  if (!doc)           throw new Error(`${label} not found`);
  if (!doc.isActive)  throw new Error(`${label} is inactive`);
};

const createListingValidator = [
  // ── Top-level required IDs ──────────────────────────────────────────────────
  body("categoryId").notEmpty().withMessage("categoryId is required").isMongoId().withMessage("categoryId must be a valid ID").bail().custom(existsAndActive(PropertyCategory, "Category")),
  body("listingTypeId").notEmpty().withMessage("listingTypeId is required").isMongoId().withMessage("listingTypeId must be a valid ID").bail().custom(existsAndActive(PropertyPurpose, "Listing type")),
  body("propertyTypeId").if((_, { req }) => req.body.listingTypeId !== process.env.LISTING_TYPE_PG_ID).notEmpty().withMessage("propertyTypeId is required").isMongoId().withMessage("propertyTypeId must be a valid ID").bail().custom(async (id, { req }) => {
    const doc = await PropertyType.findById(id).select("isActive propertyCategory");
    if (!doc)          throw new Error("Property type not found");
    if (!doc.isActive) throw new Error("Property type is inactive");
    if (doc.propertyCategory.toString() !== req.body.categoryId) throw new Error("Property type does not belong to the selected category");
  }),
  body("cityId").notEmpty().withMessage("cityId is required").isMongoId().withMessage("cityId must be a valid ID").bail().custom(existsAndActive(City, "City")),

  // ── category & listingType consistency ───────────────────────────────────
  body("residentialDetails").optional().custom((_, { req }) => {
    if (req.body.categoryId !== process.env.CATEGORY_RESIDENTIAL_ID)
      throw new Error("categoryId must be residential category when sending residentialDetails");
    return true;
  }),
  body("plotDetails").optional().custom((_, { req }) => {
    if (req.body.categoryId !== process.env.CATEGORY_RESIDENTIAL_ID)
      throw new Error("categoryId must be residential category when sending plotDetails");
    const plotIds = process.env.RESIDENTIAL_PROPERTY_TYPE_PLOT_IDS.split(",");
    if (!plotIds.includes(req.body.propertyTypeId))
      throw new Error("propertyTypeId must be Plot or Agricultural Land when sending plotDetails");
    return true;
  }),
  body("commercialDetails").optional().custom((_, { req }) => {
    if (req.body.categoryId !== process.env.CATEGORY_COMMERCIAL_ID)
      throw new Error("categoryId must be commercial category when sending commercialDetails");
    return true;
  }),
  body("pgDetails").optional().custom((_, { req }) => {
    if (req.body.listingTypeId !== process.env.LISTING_TYPE_PG_ID)
      throw new Error("listingTypeId must be PG when sending pgDetails");
    return true;
  }),

  // ── locality ────────────────────────────────────────────────────────────────
  body("locality").notEmpty().withMessage("locality is required"),
  body("locality.address").notEmpty().withMessage("locality.address is required").bail().custom(async (address, { req }) => {
    const parts = address.split(",").map((p) => p.trim());
    if (parts.length < 3) throw new Error("locality.address does not contain enough components to extract city");
    const cityFromAddress = parts[parts.length - 3];
    const city = await City.findById(req.body.cityId).select("name");
    if (!city) throw new Error("City not found");
    if (city.name.toLowerCase() !== cityFromAddress.toLowerCase())
      throw new Error(`locality.address city component "${cityFromAddress}" does not match selected city "${city.name}"`);
    return true;
  }),
  body("locality.latitude").notEmpty().withMessage("locality.latitude is required").isFloat({ min: -90, max: 90 }).withMessage("locality.latitude must be a valid latitude"),
  body("locality.longitude").notEmpty().withMessage("locality.longitude is required").isFloat({ min: -180, max: 180 }).withMessage("locality.longitude must be a valid longitude"),

  // ── residentialDetails furnishings & amenities IDs ─────────────────────────
  body("residentialDetails.furnishings.*.furnishingId").if(body("residentialDetails.furnishings").exists()).isMongoId().withMessage("furnishingId must be a valid ID").bail().custom(existsAndActive(FurnishingAmenity, "Furnishing")),
  body("residentialDetails.furnishings.*.count").if(body("residentialDetails.furnishings").exists()).notEmpty().withMessage("furnishings[].count is required").isInt({ min: 1 }).withMessage("furnishings[].count must be a positive integer"),
  body("residentialDetails.amenities.*.amenityId").if(body("residentialDetails.amenities").exists()).isMongoId().withMessage("amenityId must be a valid ID").bail().custom(existsAndActive(FurnishingAmenity, "Amenity")),

  // ── residentialDetails (when present) ──────────────────────────────────────
  body("residentialDetails.societyName").if(body("residentialDetails").exists()).notEmpty().withMessage("residentialDetails.societyName is required"),
  body("residentialDetails.bhk").if(body("residentialDetails").exists()).notEmpty().withMessage("residentialDetails.bhk is required").isInt({ min: 1 }).withMessage("residentialDetails.bhk must be a positive integer"),
  body("residentialDetails.builtUpArea.value").if(body("residentialDetails").exists()).notEmpty().withMessage("residentialDetails.builtUpArea.value is required").isFloat({ min: 0 }).withMessage("Must be a positive number"),
  body("residentialDetails.builtUpArea.unit").if(body("residentialDetails").exists()).notEmpty().withMessage("residentialDetails.builtUpArea.unit is required").isIn(["sqft", "sqyd", "sqmt"]).withMessage("Must be sqft, sqyd, or sqmt"),
  body("residentialDetails.furnishType").if(body("residentialDetails").exists()).notEmpty().withMessage("residentialDetails.furnishType is required").isIn(["Unfurnished", "Semi-Furnished", "Fully-Furnished"]).withMessage("Invalid furnishType"),

  // ── plotDetails (when present) ──────────────────────────────────────────────
  body("plotDetails.societyName").if(body("plotDetails").exists()).notEmpty().withMessage("plotDetails.societyName is required"),
  body("plotDetails.plotArea.value").if(body("plotDetails").exists()).notEmpty().withMessage("plotDetails.plotArea.value is required").isFloat({ min: 0 }).withMessage("Must be a positive number"),
  body("plotDetails.plotArea.unit").if(body("plotDetails").exists()).notEmpty().withMessage("plotDetails.plotArea.unit is required").isIn(["sqft", "sqyd", "sqmt"]).withMessage("Must be sqft, sqyd, or sqmt"),
  body("plotDetails.length").if(body("plotDetails").exists()).notEmpty().withMessage("plotDetails.length is required").isFloat({ min: 0 }).withMessage("plotDetails.length must be a positive number"),
  body("plotDetails.width").if(body("plotDetails").exists()).notEmpty().withMessage("plotDetails.width is required").isFloat({ min: 0 }).withMessage("plotDetails.width must be a positive number"),

  // ── pgDetails (when present) ────────────────────────────────────────────────
  body("pgDetails.pgName").if(body("pgDetails").exists()).notEmpty().withMessage("pgDetails.pgName is required"),
  body("pgDetails.pgFor").if(body("pgDetails").exists()).notEmpty().withMessage("pgDetails.pgFor is required").isIn(["Girls", "Boys", "Both"]).withMessage("pgDetails.pgFor must be Girls, Boys, or Both"),
  body("pgDetails.totalBedsAvailable").if(body("pgDetails").exists()).notEmpty().withMessage("pgDetails.totalBedsAvailable is required").isInt({ min: 1 }).withMessage("Must be a positive integer"),
  body("pgDetails.rooms").if(body("pgDetails").exists()).isArray({ min: 1 }).withMessage("pgDetails.rooms must have at least one room"),
  body("pgDetails.bestSuitedFor").if(body("pgDetails").exists()).notEmpty().withMessage("pgDetails.bestSuitedFor is required").isArray({ min: 1 }).withMessage("pgDetails.bestSuitedFor must have at least one value"),
  body("pgDetails.bestSuitedFor.*").isIn(["Students", "Professionals"]).withMessage("bestSuitedFor must be Students or Professionals"),
  body("pgDetails.mealsAvailable").if(body("pgDetails").exists()).notEmpty().withMessage("pgDetails.mealsAvailable is required").isBoolean().withMessage("pgDetails.mealsAvailable must be a boolean"),
  body("pgDetails.noticePeriod").if(body("pgDetails").exists()).notEmpty().withMessage("pgDetails.noticePeriod is required").isInt({ min: 0 }).withMessage("pgDetails.noticePeriod must be a non-negative integer"),
  body("pgDetails.lockInPeriod").if(body("pgDetails").exists()).notEmpty().withMessage("pgDetails.lockInPeriod is required").isInt({ min: 0 }).withMessage("pgDetails.lockInPeriod must be a non-negative integer"),
  body("pgDetails.commonAreas").if(body("pgDetails").exists()).notEmpty().withMessage("pgDetails.commonAreas is required").isArray({ min: 1 }).withMessage("pgDetails.commonAreas must have at least one value"),
  body("pgDetails.commonAreas.*").isIn(["Living Room", "Kitchen", "Dining Area", "Bathroom", "Balcony", "Terrace", "Laundry Room", "Study Room", "Gym", "Parking"]).withMessage("Invalid commonAreas value"),
  body("pgDetails.rooms.*.roomType").notEmpty().withMessage("Each room must have a roomType").isIn(["1 Sharing", "2 Sharing", "3 Sharing", "4 Sharing", "5 Sharing", "6 Sharing", "7 Sharing"]).withMessage("Invalid roomType"),
  body("pgDetails.rooms.*.rent").notEmpty().withMessage("Each room must have a rent").isFloat({ min: 0 }).withMessage("Rent must be a positive number"),
  body("pgDetails.rooms.*.bedsAvailable").custom((_, { req, path }) => {
    const index = path.match(/\d+/)?.[0];
    const room = req.body.pgDetails?.rooms?.[index];
    if (room?.roomType === "1 Sharing") return true;
    if (_ === undefined || _ === null || _ === "") throw new Error("Each room must have bedsAvailable");
    if (!Number.isInteger(Number(_)) || Number(_) < 1) throw new Error("bedsAvailable must be a positive integer");
    return true;
  }),
  body("pgDetails.rooms.*.securityDeposit").notEmpty().withMessage("Each room must have a securityDeposit").isFloat({ min: 0 }).withMessage("securityDeposit must be a non-negative number"),

  // ── commercialDetails (when present) ───────────────────────────────────────
  body("commercialDetails.societyName").if(body("commercialDetails").exists()).notEmpty().withMessage("commercialDetails.societyName is required"),
  body("commercialDetails.propertyType").if(body("commercialDetails").exists()).custom((_, { req }) => {
    const othersIds = process.env.COMMERCIAL_PROPERTY_TYPE_OTHERS_IDS?.split(",") || [];
    if (!othersIds.includes(req.body.propertyTypeId)) return true;
    if (!_ || !_.toString().trim()) throw new Error("commercialDetails.propertyType is required for Others property type");
    return true;
  }),
  body("commercialDetails.zoneType").if(body("commercialDetails").exists()).notEmpty().withMessage("commercialDetails.zoneType is required").isIn(["Industrial", "Commercial", "Residential", "SEZ", "OpenSpaces", "Agricultural", "Others"]).withMessage("Invalid zoneType"),
  body("commercialDetails.locationHub").if(body("commercialDetails").exists()).notEmpty().withMessage("commercialDetails.locationHub is required").isIn(["IT Park", "Business Park", "Mall", "Commercial Project", "Residential Project", "Retail Complex/Building", "Market/High Street", "Others"]).withMessage("Invalid locationHub"),

  body("commercialDetails.ownership").if(body("commercialDetails").exists()).notEmpty().withMessage("commercialDetails.ownership is required").isIn(["Freehold", "Leasehold", "CooperativeSociety", "PowerOfAttorney"]).withMessage("Invalid ownership"),

  body("commercialDetails.builtUpArea.unit").if(body("commercialDetails").exists()).custom((_, { req }) => {
    const plotIds = process.env.COMMERCIAL_PROPERTY_TYPE_PLOT_IDS.split(",");
    if (plotIds.includes(req.body.propertyTypeId)) return true;
    if (!_) throw new Error("commercialDetails.builtUpArea.unit is required");
    if (!["sqft", "sqyd", "sqmt"].includes(_)) throw new Error("Must be sqft, sqyd, or sqmt");
    return true;
  }),
  body("commercialDetails.carpetArea.value").if(body("commercialDetails").exists()).custom((_, { req }) => {
    const plotIds = process.env.COMMERCIAL_PROPERTY_TYPE_PLOT_IDS.split(",");
    if (plotIds.includes(req.body.propertyTypeId)) return true;
    if (!_.toString().trim()) throw new Error("commercialDetails.carpetArea.value is required");
    if (isNaN(_) || _ < 0) throw new Error("Must be a positive number");
    const builtUpValue = req.body.commercialDetails?.builtUpArea?.value;
    if (builtUpValue !== undefined && Number(_) > Number(builtUpValue))
      throw new Error("commercialDetails.carpetArea.value cannot be greater than builtUpArea.value");
    return true;
  }),
  body("commercialDetails.carpetArea.unit").if(body("commercialDetails").exists()).custom((_, { req }) => {
    const plotIds = process.env.COMMERCIAL_PROPERTY_TYPE_PLOT_IDS.split(",");
    if (plotIds.includes(req.body.propertyTypeId)) return true;
    if (!_) throw new Error("commercialDetails.carpetArea.unit is required");
    if (!["sqft", "sqyd", "sqmt"].includes(_)) throw new Error("Must be sqft, sqyd, or sqmt");
    return true;
  }),
  body("commercialDetails.plotArea.value").if(body("commercialDetails").exists()).custom((_, { req }) => {
    const plotIds = process.env.COMMERCIAL_PROPERTY_TYPE_PLOT_IDS.split(",");
    if (!plotIds.includes(req.body.propertyTypeId)) return true;
    if (!_.toString().trim()) throw new Error("commercialDetails.plotArea.value is required");
    if (isNaN(_) || _ < 0) throw new Error("Must be a positive number");
    return true;
  }),
  body("commercialDetails.plotArea.unit").if(body("commercialDetails").exists()).custom((_, { req }) => {
    const plotIds = process.env.COMMERCIAL_PROPERTY_TYPE_PLOT_IDS.split(",");
    if (!plotIds.includes(req.body.propertyTypeId)) return true;
    if (!_) throw new Error("commercialDetails.plotArea.unit is required");
    if (!["sqft", "sqyd", "sqmt"].includes(_)) throw new Error("Must be sqft, sqyd, or sqmt");
    return true;
  }),
  body("commercialDetails.length").if(body("commercialDetails").exists()).custom((_, { req }) => {
    const plotIds = process.env.COMMERCIAL_PROPERTY_TYPE_PLOT_IDS.split(",");
    if (!plotIds.includes(req.body.propertyTypeId)) return true;
    if (_ === undefined || _ === null || _ === "") throw new Error("commercialDetails.length is required");
    if (isNaN(_) || Number(_) < 0) throw new Error("commercialDetails.length must be a positive number");
    return true;
  }),
  body("commercialDetails.width").if(body("commercialDetails").exists()).custom((_, { req }) => {
    const plotIds = process.env.COMMERCIAL_PROPERTY_TYPE_PLOT_IDS.split(",");
    if (!plotIds.includes(req.body.propertyTypeId)) return true;
    if (_ === undefined || _ === null || _ === "") throw new Error("commercialDetails.width is required");
    if (isNaN(_) || Number(_) < 0) throw new Error("commercialDetails.width must be a positive number");
    return true;
  }),
  body("commercialDetails.totalFloors").if(body("commercialDetails").exists()).custom((_, { req }) => {
    const plotIds = process.env.COMMERCIAL_PROPERTY_TYPE_PLOT_IDS.split(",");
    if (plotIds.includes(req.body.propertyTypeId)) return true;
    if (_ === undefined || _ === null || _ === "") throw new Error("commercialDetails.totalFloors is required");
    if (!Number.isInteger(Number(_)) || Number(_) < 0) throw new Error("commercialDetails.totalFloors must be a non-negative integer");
    return true;
  }),
  body("commercialDetails.yourFloor").if(body("commercialDetails").exists()).custom((_, { req }) => {
    const plotIds = process.env.COMMERCIAL_PROPERTY_TYPE_PLOT_IDS.split(",");
    if (plotIds.includes(req.body.propertyTypeId)) return true;
    if (_ === undefined || _ === null || _ === "") throw new Error("commercialDetails.yourFloor is required");
    if (!String(_).trim()) throw new Error("commercialDetails.yourFloor must be a non-empty string");
    return true;
  }),
  body("commercialDetails.minSeats").if(body("commercialDetails").exists()).custom((_, { req }) => {
    const officeIds = process.env.COMMERCIAL_PROPERTY_TYPE_OFFICE_IDS?.split(",") || [];
    if (!officeIds.includes(req.body.propertyTypeId)) return true;
    if (_ === undefined || _ === null || _ === "") throw new Error("commercialDetails.minSeats is required for office type");
    if (!Number.isInteger(Number(_)) || Number(_) < 0) throw new Error("commercialDetails.minSeats must be a non-negative integer");
    return true;
  }),
  body("commercialDetails.minCabins").if(body("commercialDetails").exists()).custom((_, { req }) => {
    const officeIds = process.env.COMMERCIAL_PROPERTY_TYPE_OFFICE_IDS?.split(",") || [];
    if (!officeIds.includes(req.body.propertyTypeId)) return true;
    if (_ === undefined || _ === null || _ === "") throw new Error("commercialDetails.minCabins is required for office type");
    if (!Number.isInteger(Number(_)) || Number(_) < 0) throw new Error("commercialDetails.minCabins must be a non-negative integer");
    return true;
  }),
  body("commercialDetails.minMeetingRooms").if(body("commercialDetails").exists()).custom((_, { req }) => {
    const officeIds = process.env.COMMERCIAL_PROPERTY_TYPE_OFFICE_IDS?.split(",") || [];
    if (!officeIds.includes(req.body.propertyTypeId)) return true;
    if (_ === undefined || _ === null || _ === "") throw new Error("commercialDetails.minMeetingRooms is required for office type");
    if (!Number.isInteger(Number(_)) || Number(_) < 0) throw new Error("commercialDetails.minMeetingRooms must be a non-negative integer");
    return true;
  }),

  // ── sellInfo (required for Sell, not allowed otherwise) ──────────────────────
  body("sellInfo").custom((_, { req }) => {
    if (req.body.listingTypeId === process.env.LISTING_TYPE_SELL_ID && !_)
      throw new Error("sellInfo is required when listingTypeId is Sell");
    if (req.body.listingTypeId !== process.env.LISTING_TYPE_SELL_ID && _)
      throw new Error("sellInfo is only allowed when listingTypeId is Sell");
    return true;
  }),
  body("sellInfo.price").if(body("sellInfo").exists()).notEmpty().withMessage("sellInfo.price is required").isFloat({ min: 0 }).withMessage("sellInfo.price must be a positive number"),
  body("sellInfo.constructionStatus").if(body("sellInfo").exists()).notEmpty().withMessage("sellInfo.constructionStatus is required").isIn(["UnderConstruction", "ReadyToMove"]).withMessage("Invalid constructionStatus"),
  body("sellInfo.ageOfProperty").if(body("sellInfo.constructionStatus").equals("ReadyToMove")).notEmpty().withMessage("sellInfo.ageOfProperty is required when constructionStatus is ReadyToMove").isInt({ min: 0 }).withMessage("Must be a non-negative integer"),
  body("sellInfo.availableFrom").if(body("sellInfo.constructionStatus").equals("UnderConstruction")).notEmpty().withMessage("sellInfo.availableFrom is required when constructionStatus is UnderConstruction").isISO8601().withMessage("Must be a valid date"),

  // ── rentInfo (required for Rent, not allowed otherwise) ──────────────────────
  body("rentInfo").custom((_, { req }) => {
    if (req.body.listingTypeId === process.env.LISTING_TYPE_RENT_ID && !_)
      throw new Error("rentInfo is required when listingTypeId is Rent");
    if (_ && req.body.listingTypeId !== process.env.LISTING_TYPE_RENT_ID)
      throw new Error("rentInfo is only allowed when listingTypeId is Rent");
    return true;
  }),
  body("rentInfo.monthlyRent").if(body("rentInfo").exists()).notEmpty().withMessage("rentInfo.monthlyRent is required").isFloat({ min: 0 }).withMessage("rentInfo.monthlyRent must be a positive number"),
  body("rentInfo.availableFrom").if(body("rentInfo").exists()).notEmpty().withMessage("rentInfo.availableFrom is required").isISO8601().withMessage("rentInfo.availableFrom must be a valid date"),
  body("rentInfo.securityDeposit.type").if(body("rentInfo").exists()).notEmpty().withMessage("rentInfo.securityDeposit.type is required").isIn(["None", "1Month", "2Month", "Custom"]).withMessage("Invalid securityDeposit type"),
  body("rentInfo.securityDeposit.amount").if(body("rentInfo.securityDeposit.type").equals("Custom")).notEmpty().withMessage("rentInfo.securityDeposit.amount is required when type is Custom").isFloat({ min: 0 }).withMessage("Must be a positive number"),
];

module.exports = { createListingValidator };
