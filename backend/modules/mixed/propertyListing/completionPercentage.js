const DETAIL_SECTIONS = [
  "residentialDetails",
  "plotDetails",
  "pgDetails",
  "commercialDetails",
];

const DETAIL_FIELDS = {
  residentialDetails: [
    "societyName",
    "bhk",
    "builtUpArea.value",
    "carpetArea.value",
    "constructionStatus",
    "propertyStatus",
    "ageOfProperty",
    "furnishType",
    "furnishings",
    "amenities",
  ],
  plotDetails: ["societyName", "plotArea.value", "length", "width"],
  pgDetails: [
    "pgName",
    "totalBedsAvailable",
    "pgFor",
    "bestSuitedFor",
    "mealsAvailable",
    "noticePeriod",
    "lockInPeriod",
    "commonAreas",
    "rooms",
    "constructionStatus",
    "ageOfProperty",
    "furnishType",
    "furnishings",
    "amenities",
  ],
  commercialDetails: [
    "societyName",
    "zoneType",
    "locationHub",
    "builtUpArea.value",
    "carpetArea.value",
    "constructionStatus",
    "propertyStatus",
    "ageOfProperty",
    "ownership",
    "totalFloors",
    "yourFloor",
    "furnishType",
    "furnishings",
    "amenities",
  ],
};

function getNestedValue(object, path) {
  return path.split(".").reduce((value, key) => value?.[key], object);
}

function hasValue(value) {
  if (value === undefined || value === null) return false;
  if (typeof value === "string") return value.trim().length > 0;
  if (Array.isArray(value)) return value.length > 0;
  return true;
}

function getApplicableFields(listing, section) {
  const details = listing[section];
  const fields = [...DETAIL_FIELDS[section]];

  if (section === "residentialDetails" || section === "commercialDetails" || section === "pgDetails") {
    if (details.constructionStatus === "UnderConstruction") fields.push("availableFrom");
  }

  if (section === "pgDetails" && details.mealsAvailable === true) {
    fields.push("meals");
  }

  if (section === "commercialDetails") {
    const propertyTypeName = listing.propertyType?.name?.toLowerCase() ?? "";
    const isCommercialPlot = details.plotArea?.value != null || propertyTypeName.includes("plot");
    const isOffice = propertyTypeName.includes("office") ||
      details.minSeats != null || details.minCabins != null || details.minMeetingRooms != null;

    if (details.propertyType?.toLowerCase() === "others" || propertyTypeName.includes("other")) {
      fields.push("propertyType");
    }
    if (isCommercialPlot) fields.push("plotArea.value", "length", "width");
    if (isOffice) fields.push("minSeats", "minCabins", "minMeetingRooms");
  }

  return fields;
}

function getListingTypeId(listing) {
  return String(listing.listingType?.id ?? listing.listingType?._id ?? "");
}

function isPgListing(listing) {
  return getListingTypeId(listing) === process.env.LISTING_TYPE_PG_ID ||
    listing.listingType?.name?.toLowerCase() === "pg";
}

function getPricingPath(listing) {
  const listingTypeId = getListingTypeId(listing);
  const listingTypeName = listing.listingType?.name?.toLowerCase() ?? "";

  if (listingTypeId === process.env.LISTING_TYPE_SELL_ID || /sell|sale|buy/.test(listingTypeName)) {
    return "sellInfo.price";
  }
  if (listingTypeId === process.env.LISTING_TYPE_RENT_ID || listingTypeName.includes("rent")) {
    return "rentInfo.monthlyRent";
  }
  if (isPgListing(listing)) return null;

  if (listing.sellInfo) return "sellInfo.price";
  if (listing.rentInfo) return "rentInfo.monthlyRent";
  return null;
}

function getCommonFieldChecks(listing) {
  const checks = [
    () => hasValue(listing.category?.id ?? listing.category?._id),
    () => hasValue(listing.listingType?.id ?? listing.listingType?._id),
    () => hasValue(listing.cityName),
    () => hasValue(listing.locality?.address) &&
      hasValue(listing.locality?.latitude) &&
      hasValue(listing.locality?.longitude),
    () => hasValue(listing.listedBy?.id ?? listing.listedBy?._id),
    () => hasValue(listing.media?.images),
    () => hasValue(listing.rera?.reraId),
  ];

  if (!isPgListing(listing)) {
    checks.splice(2, 0, () => hasValue(listing.propertyType?.id ?? listing.propertyType?._id));
  }

  const pricingPath = getPricingPath(listing);
  if (pricingPath) checks.push(() => hasValue(getNestedValue(listing, pricingPath)));

  return checks;
}

function calculatePropertyCompletionPercentage(listing) {
  if (!listing || typeof listing !== "object") return 0;

  const section = DETAIL_SECTIONS.find((key) => hasValue(listing[key]));
  if (!section) return 0;

  const details = listing[section];
  const fields = getApplicableFields(listing, section);
  const commonFieldChecks = getCommonFieldChecks(listing);
  const totalFields = commonFieldChecks.length + fields.length;
  if (totalFields === 0) return 0;

  const completedCommonFields = commonFieldChecks.reduce(
    (count, check) => count + (check() ? 1 : 0),
    0
  );
  const completedDetailFields = fields.reduce(
    (count, field) => count + (hasValue(getNestedValue(details, field)) ? 1 : 0),
    0
  );

  return Math.round(((completedCommonFields + completedDetailFields) / totalFields) * 100);
}

module.exports = { calculatePropertyCompletionPercentage };
