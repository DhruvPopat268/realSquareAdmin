const { body }         = require("express-validator");
const PropertyCategory = require("../../admin/propertyCategories/model");
const PropertyPurpose  = require("../../admin/propertyPurposes/model");
const PropertyType     = require("../../admin/propertyTypes/model");
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

  // ── cityName ────────────────────────────────────────────────────────────────
  body("cityName").notEmpty().withMessage("cityName is required").isString().withMessage("cityName must be a string"),

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
  body("locality.address").notEmpty().withMessage("locality.address is required"),
  body("locality.latitude").notEmpty().withMessage("locality.latitude is required").isFloat({ min: -90, max: 90 }).withMessage("locality.latitude must be a valid latitude"),
  body("locality.longitude").notEmpty().withMessage("locality.longitude is required").isFloat({ min: -180, max: 180 }).withMessage("locality.longitude must be a valid longitude"),

  // ── residentialDetails furnishings & amenities IDs ─────────────────────────
  body("residentialDetails.furnishings.*.furnishingId").if(body("residentialDetails.furnishings").exists()).isMongoId().withMessage("furnishingId must be a valid ID").bail().custom(existsAndActive(FurnishingAmenity, "Furnishing")),
  body("residentialDetails.furnishings.*.count").if(body("residentialDetails.furnishings").exists()).notEmpty().withMessage("furnishings[].count is required").isInt({ min: 1 }).withMessage("furnishings[].count must be a positive integer"),
  body("residentialDetails.amenities.*.amenityId").if(body("residentialDetails.amenities").exists()).isMongoId().withMessage("amenityId must be a valid ID").bail().custom(existsAndActive(FurnishingAmenity, "Amenity")),

  // ── residentialDetails (when present) ──────────────────────────────────────
  // societyName — optional (can be filled in later via edit)
  body("residentialDetails.societyName").if(body("residentialDetails").exists()).optional(),
  // bhk — required when residentialDetails is sent
  body("residentialDetails.bhk").if(body("residentialDetails").exists()).notEmpty().withMessage("residentialDetails.bhk is required").isInt({ min: 0 }).withMessage("residentialDetails.bhk must be a non-negative integer"),
  // builtUpArea — optional (can be filled in later via edit)
  body("residentialDetails.builtUpArea.value").if(body("residentialDetails.builtUpArea").exists()).isFloat({ min: 0 }).withMessage("Must be a positive number"),
  body("residentialDetails.builtUpArea.unit").if(body("residentialDetails.builtUpArea").exists()).isIn(["sqft", "sqyd", "sqmt"]).withMessage("Must be sqft, sqyd, or sqmt"),
  // furnishType — optional (can be filled in later via edit)
  body("residentialDetails.furnishType").if(body("residentialDetails.furnishType").exists()).isIn(["Unfurnished", "Semi-Furnished", "Fully-Furnished"]).withMessage("Invalid furnishType"),

  // ── plotDetails (when present) ──────────────────────────────────────────────
  // societyName — optional (can be filled in later via edit)
  body("plotDetails.societyName").if(body("plotDetails").exists()).optional(),
  // plotArea, length, width — required when plotDetails is sent
  body("plotDetails.plotArea.value").if(body("plotDetails").exists()).notEmpty().withMessage("plotDetails.plotArea.value is required").isFloat({ min: 0 }).withMessage("Must be a positive number"),
  body("plotDetails.plotArea.unit").if(body("plotDetails").exists()).notEmpty().withMessage("plotDetails.plotArea.unit is required").isIn(["sqft", "sqyd", "sqmt"]).withMessage("Must be sqft, sqyd, or sqmt"),
  body("plotDetails.length").if(body("plotDetails").exists()).notEmpty().withMessage("plotDetails.length is required").isFloat({ min: 0 }).withMessage("plotDetails.length must be a positive number"),
  body("plotDetails.width").if(body("plotDetails").exists()).notEmpty().withMessage("plotDetails.width is required").isFloat({ min: 0 }).withMessage("plotDetails.width must be a positive number"),

  // ── pgDetails (when present) ────────────────────────────────────────────────
  body("pgDetails.pgName").if(body("pgDetails").exists()).notEmpty().withMessage("pgDetails.pgName is required"),
  body("pgDetails.totalBedsAvailable").if(body("pgDetails").exists()).notEmpty().withMessage("pgDetails.totalBedsAvailable is required").isInt({ min: 1 }).withMessage("Must be a positive integer"),
  body("pgDetails.rooms").if(body("pgDetails").exists()).isArray({ min: 1 }).withMessage("pgDetails.rooms must have at least one room"),
  // pgFor — optional (can be filled in later via edit)
  body("pgDetails.pgFor").if(body("pgDetails.pgFor").exists()).isIn(["Girls", "Boys", "Both"]).withMessage("pgDetails.pgFor must be Girls, Boys, or Both"),
  // bestSuitedFor — optional (can be filled in later via edit)
  body("pgDetails.bestSuitedFor.*").if(body("pgDetails.bestSuitedFor").exists()).isIn(["Students", "Professionals"]).withMessage("bestSuitedFor must be Students or Professionals"),
  // mealsAvailable — optional (can be filled in later via edit)
  body("pgDetails.mealsAvailable").if(body("pgDetails.mealsAvailable").exists()).isBoolean().withMessage("pgDetails.mealsAvailable must be a boolean"),
  // noticePeriod — optional (can be filled in later via edit)
  body("pgDetails.noticePeriod").if(body("pgDetails.noticePeriod").exists()).isInt({ min: 0 }).withMessage("pgDetails.noticePeriod must be a non-negative integer"),
  // lockInPeriod — optional (can be filled in later via edit)
  body("pgDetails.lockInPeriod").if(body("pgDetails.lockInPeriod").exists()).isInt({ min: 0 }).withMessage("pgDetails.lockInPeriod must be a non-negative integer"),
  // commonAreas — optional (can be filled in later via edit)
  body("pgDetails.commonAreas.*").if(body("pgDetails.commonAreas").exists()).isIn(["Living Room", "Kitchen", "Dining Area", "Bathroom", "Balcony", "Terrace", "Laundry Room", "Study Room", "Gym", "Parking"]).withMessage("Invalid commonAreas value"),
  // room fields — still required within each room entry
  body("pgDetails.rooms.*.roomType").notEmpty().withMessage("Each room must have a roomType").isIn(["1 Sharing", "2 Sharing", "3 Sharing", "4 Sharing", "5 Sharing", "6 Sharing", "7 Sharing"]).withMessage("Invalid roomType"),
  body("pgDetails.rooms.*.rent").notEmpty().withMessage("Each room must have a rent").isFloat({ min: 0 }).withMessage("Rent must be a positive number"),
  body("pgDetails.rooms.*.bedsAvailable").custom((_, { req, path }) => {
    const index = path.match(/\d+/)?.[0];
    const room = req.body.pgDetails?.rooms?.[index];
    if (room?.roomType === "1 Sharing") return true;
    if (_ === undefined || _ === null || _ === "") throw new Error("Each room must have bedsAvailable");
    if (!Number.isInteger(Number(_)) || Number(_) < 1) throw new Error("bedsAvailable must be a positive integer");
    const sharingMax = parseInt(room?.roomType?.split(" ")?.[0], 10);
    if (!isNaN(sharingMax) && Number(_) > sharingMax)
      throw new Error(`bedsAvailable cannot exceed ${sharingMax} for a "${room.roomType}" room`);
    return true;
  }),
  body("pgDetails.rooms.*.securityDeposit").notEmpty().withMessage("Each room must have a securityDeposit").isFloat({ min: 0 }).withMessage("securityDeposit must be a non-negative number"),

  // ── commercialDetails (when present) ───────────────────────────────────────
  // societyName — optional (can be filled in later via edit)
  body("commercialDetails.societyName").if(body("commercialDetails").exists()).optional(),
  body("commercialDetails.propertyType").if(body("commercialDetails").exists()).custom((_, { req }) => {
    const othersIds = process.env.COMMERCIAL_PROPERTY_TYPE_OTHERS_IDS?.split(",") || [];
    if (!othersIds.includes(req.body.propertyTypeId)) return true;
    if (!_ || !_.toString().trim()) throw new Error("commercialDetails.propertyType is required for Others property type");
    return true;
  }),
  // zoneType — optional (can be filled in later via edit)
  body("commercialDetails.zoneType").if(body("commercialDetails.zoneType").exists()).isIn(["Industrial", "Commercial", "Residential", "SEZ", "OpenSpaces", "Agricultural", "Others"]).withMessage("Invalid zoneType"),
  // locationHub — optional (can be filled in later via edit)
  body("commercialDetails.locationHub").if(body("commercialDetails.locationHub").exists()).isIn(["IT Park", "Business Park", "Mall", "Commercial Project", "Residential Project", "Retail Complex/Building", "Market/High Street", "Others"]).withMessage("Invalid locationHub"),
  // ownership — optional (can be filled in later via edit)
  body("commercialDetails.ownership").if(body("commercialDetails.ownership").exists()).isIn(["Freehold", "Leasehold", "CooperativeSociety", "PowerOfAttorney"]).withMessage("Invalid ownership"),

  // builtUpArea — required for non-plot commercial when commercialDetails is sent
  body("commercialDetails.builtUpArea.unit").if(body("commercialDetails").exists()).custom((_, { req }) => {
    const plotIds = process.env.COMMERCIAL_PROPERTY_TYPE_PLOT_IDS.split(",");
    if (plotIds.includes(req.body.propertyTypeId)) return true;     // plot → skip
    if (!_) return true;                                              // optional — skip if absent
    if (!["sqft", "sqyd", "sqmt"].includes(_)) throw new Error("Must be sqft, sqyd, or sqmt");
    return true;
  }),
  body("commercialDetails.builtUpArea.value").if(body("commercialDetails").exists()).custom((_, { req }) => {
    const plotIds = process.env.COMMERCIAL_PROPERTY_TYPE_PLOT_IDS.split(",");
    if (plotIds.includes(req.body.propertyTypeId)) return true;
    if (_ === undefined || _ === null || _ === "") throw new Error("commercialDetails.builtUpArea.value is required");
    if (isNaN(_) || _ < 0) throw new Error("Must be a positive number");
    return true;
  }),
  body("commercialDetails.carpetArea.value").if(body("commercialDetails").exists()).custom((_, { req }) => {
    const plotIds = process.env.COMMERCIAL_PROPERTY_TYPE_PLOT_IDS.split(",");
    if (plotIds.includes(req.body.propertyTypeId)) return true;
    if (_ === undefined || _ === null || _ === "") throw new Error("commercialDetails.carpetArea.value is required");
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

  // plotArea, length, width — required for commercial plot when commercialDetails is sent
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

  // totalFloors, yourFloor — optional (can be filled in later via edit)
  body("commercialDetails.totalFloors").if(body("commercialDetails.totalFloors").exists()).custom((_, { req }) => {
    if (!Number.isInteger(Number(_)) || Number(_) < 0) throw new Error("commercialDetails.totalFloors must be a non-negative integer");
    return true;
  }),
  body("commercialDetails.yourFloor").if(body("commercialDetails.yourFloor").exists()).custom((_, { req }) => {
    if (!String(_).trim()) throw new Error("commercialDetails.yourFloor must be a non-empty string");
    return true;
  }),

  // minSeats, minCabins, minMeetingRooms — optional (can be filled in later via edit)
  body("commercialDetails.minSeats").if(body("commercialDetails.minSeats").exists()).custom((_, { req }) => {
    if (!Number.isInteger(Number(_)) || Number(_) < 0) throw new Error("commercialDetails.minSeats must be a non-negative integer");
    return true;
  }),
  body("commercialDetails.minCabins").if(body("commercialDetails.minCabins").exists()).custom((_, { req }) => {
    if (!Number.isInteger(Number(_)) || Number(_) < 0) throw new Error("commercialDetails.minCabins must be a non-negative integer");
    return true;
  }),
  body("commercialDetails.minMeetingRooms").if(body("commercialDetails.minMeetingRooms").exists()).custom((_, { req }) => {
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
  // constructionStatus — optional (can be filled in later via edit)
  body("sellInfo.constructionStatus").if(body("sellInfo.constructionStatus").exists()).isIn(["UnderConstruction", "ReadyToMove"]).withMessage("Invalid constructionStatus"),
  // ageOfProperty — optional (can be filled in later via edit)
  body("sellInfo.ageOfProperty").if(body("sellInfo.ageOfProperty").exists()).isInt({ min: 0 }).withMessage("Must be a non-negative integer"),
  // availableFrom — optional (can be filled in later via edit)
  body("sellInfo.availableFrom").if(body("sellInfo.availableFrom").exists()).isISO8601().withMessage("Must be a valid date"),

  // ── rentInfo (required for Rent, not allowed otherwise) ──────────────────────
  body("rentInfo").custom((_, { req }) => {
    if (req.body.listingTypeId === process.env.LISTING_TYPE_RENT_ID && !_)
      throw new Error("rentInfo is required when listingTypeId is Rent");
    if (_ && req.body.listingTypeId !== process.env.LISTING_TYPE_RENT_ID)
      throw new Error("rentInfo is only allowed when listingTypeId is Rent");
    return true;
  }),
  body("rentInfo.monthlyRent").if(body("rentInfo").exists()).notEmpty().withMessage("rentInfo.monthlyRent is required").isFloat({ min: 0 }).withMessage("rentInfo.monthlyRent must be a positive number"),
  // availableFrom — optional (can be filled in later via edit)
  body("rentInfo.availableFrom").if(body("rentInfo.availableFrom").exists()).isISO8601().withMessage("rentInfo.availableFrom must be a valid date"),
  // securityDeposit — optional (can be filled in later via edit)
  body("rentInfo.securityDeposit.type").if(body("rentInfo.securityDeposit.type").exists()).isIn(["None", "1Month", "2Month", "Custom"]).withMessage("Invalid securityDeposit type"),
  body("rentInfo.securityDeposit.amount").if(body("rentInfo.securityDeposit.type").equals("Custom")).notEmpty().withMessage("rentInfo.securityDeposit.amount is required when type is Custom").isFloat({ min: 0 }).withMessage("Must be a positive number"),
];

module.exports = { createListingValidator };
