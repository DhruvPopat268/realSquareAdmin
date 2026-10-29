const DETAIL_SECTIONS = [
  "residentialDetails",
  "plotDetails",
  "pgDetails",
  "commercialDetails",
];

function hasValue(value) {
  if (value === undefined || value === null) return false;
  if (typeof value === "string") return value.trim().length > 0;
  if (Array.isArray(value)) return value.length > 0;
  return true;
}

function getListingTypeId(listing) {
  return String(listing.listingType?.id ?? listing.listingType?._id ?? "");
}

function isPgListing(listing) {
  return getListingTypeId(listing) === process.env.LISTING_TYPE_PG_ID ||
    listing.listingType?.name?.toLowerCase() === "pg";
}

function isCommercialPlot(listing, details) {
  const typeName = listing.propertyType?.name?.toLowerCase() ?? "";
  return details.plotArea?.value != null || typeName.includes("plot") || typeName.includes("land");
}

function isCoworking(listing) {
  const typeName = listing.propertyType?.name?.toLowerCase() ?? "";
  return String(listing.propertyType?.id ?? listing.propertyType?._id ?? "") ===
      String(process.env.COMMERCIAL_PROPERTY_TYPE_co_working_space_ID ?? "") ||
    typeName.includes("co working") || typeName.includes("coworking");
}

function isOffice(listing, details) {
  const typeName = listing.propertyType?.name?.toLowerCase() ?? "";
  return typeName.includes("office") || details.minSeats != null ||
    details.minCabins != null || details.minMeetingRooms != null;
}

function addPathChecks(checks, object, paths) {
  for (const path of paths) {
    const value = path.split(".").reduce((current, key) => current?.[key], object);
    checks.push(hasValue(value));
  }
}

function addAreaCheck(checks, area) {
  // The edit form exposes a value input and a separate unit selector.
  checks.push(hasValue(area?.value));
  checks.push(hasValue(area?.unit ?? "sqft"));
}

function addCoworkingChecks(checks, details) {
  checks.push(hasValue(details.workSpaceFloor));
  const workspaces = details.workspaces ?? [];
  checks.push(workspaces.length > 0);

  for (const workspace of workspaces) {
    checks.push(hasValue(workspace.type));
    if (workspace.type === "cabin") {
      const cabins = workspace.config ?? [];
      checks.push(cabins.length > 0);
      for (const cabin of cabins) {
        checks.push(hasValue(cabin.availableSeats));
        checks.push(hasValue(cabin.rentPerSeat));
      }
    } else if (workspace.type === "hall") {
      checks.push(hasValue(workspace.availableSeats));
      checks.push(hasValue(workspace.rentPerSeat));
    } else if (workspace.type === "virtualSpace") {
      const plans = workspace.benefits ?? [];
      checks.push(plans.length > 0);
      for (const plan of plans) {
        checks.push(hasValue(plan._id));
        checks.push(hasValue(plan.benefits));
        checks.push(hasValue(plan.monthlyRent));
      }
    }
  }
}

function getDetailChecks(listing, section, details) {
  const checks = [];

  if (section === "residentialDetails") {
    addPathChecks(checks, details, ["societyName", "bhk", "constructionStatus", "propertyStatus", "ageOfProperty", "furnishType", "furnishings", "amenities"]);
    addAreaCheck(checks, details.builtUpArea);
    addAreaCheck(checks, details.carpetArea);
    if (details.constructionStatus === "UnderConstruction") checks.push(hasValue(details.availableFrom));
  } else if (section === "plotDetails") {
    addPathChecks(checks, details, ["societyName", "length", "width"]);
    addAreaCheck(checks, details.plotArea);
  } else if (section === "pgDetails") {
    addPathChecks(checks, details, ["pgName", "totalBedsAvailable", "pgFor", "bestSuitedFor", "mealsAvailable", "noticePeriod", "lockInPeriod", "commonAreas", "constructionStatus", "ageOfProperty", "furnishType", "furnishings", "amenities"]);
    if (details.mealsAvailable === true) checks.push(hasValue(details.meals));
    if (details.constructionStatus === "UnderConstruction") checks.push(hasValue(details.availableFrom));
    const rooms = details.rooms ?? [];
    checks.push(rooms.length > 0);
    for (const room of rooms) addPathChecks(checks, room, ["roomType", "bedsAvailable", "rent", "securityDeposit"]);
  } else if (section === "commercialDetails") {
    const coworking = isCoworking(listing);
    const plot = isCommercialPlot(listing, details);
    addPathChecks(checks, details, ["societyName", "ownership", "zoneType", "locationHub"]);

    if (coworking) {
      addCoworkingChecks(checks, details);
    } else if (plot) {
      addPathChecks(checks, details, ["length", "width"]);
      addAreaCheck(checks, details.plotArea);
    } else {
      addPathChecks(checks, details, ["constructionStatus", "propertyStatus", "ageOfProperty", "totalFloors", "yourFloor"]);
      addAreaCheck(checks, details.builtUpArea);
      addAreaCheck(checks, details.carpetArea);
      if (details.constructionStatus === "UnderConstruction") checks.push(hasValue(details.availableFrom));
      if (isOffice(listing, details)) addPathChecks(checks, details, ["minSeats", "minCabins", "minMeetingRooms"]);
      if (listing.propertyType?.name?.toLowerCase().includes("other")) checks.push(hasValue(details.propertyType));
      if (!listing.propertyType?.name?.toLowerCase().includes("plot")) {
        addPathChecks(checks, details, ["furnishType", "furnishings", "amenities"]);
      }
    }
  }

  return checks;
}

function getPricingPath(listing) {
  const typeId = getListingTypeId(listing);
  const typeName = listing.listingType?.name?.toLowerCase() ?? "";
  if (typeId === process.env.LISTING_TYPE_SELL_ID || /sell|sale|buy/.test(typeName)) return "sellInfo.price";
  if (typeId === process.env.LISTING_TYPE_RENT_ID || typeName.includes("rent")) return "rentInfo.monthlyRent";
  if (isPgListing(listing)) return null;
  if (listing.sellInfo) return "sellInfo.price";
  if (listing.rentInfo) return "rentInfo.monthlyRent";
  return null;
}

function calculatePropertyCompletionPercentage(listing) {
  if (!listing || typeof listing !== "object") return 0;

  const section = DETAIL_SECTIONS.find((key) => hasValue(listing[key]));
  if (!section) return 0;

  const checks = [
    hasValue(listing.category?.id ?? listing.category?._id),
    hasValue(listing.listingType?.id ?? listing.listingType?._id),
    hasValue(listing.cityName),
    hasValue(listing.locality?.address) && hasValue(listing.locality?.latitude) && hasValue(listing.locality?.longitude),
    hasValue(listing.listedBy?.id ?? listing.listedBy?._id),
    hasValue(listing.media?.images),
    hasValue(listing.rera?.reraId),
  ];

  if (!isPgListing(listing)) checks.push(hasValue(listing.propertyType?.id ?? listing.propertyType?._id));
  const roleId = String(listing.listedBy?.role?.id ?? listing.listedBy?.role?._id ?? "");
  if (roleId && roleId === String(process.env.BROKER_ROLE_ID ?? "")) {
    checks.push(typeof listing.zeroBrokerage === "boolean");
  }

  const pricingPath = getPricingPath(listing);
  if (pricingPath) {
    const value = pricingPath.split(".").reduce((current, key) => current?.[key], listing);
    checks.push(hasValue(value));
  }

  if (listing.rentInfo) {
    checks.push(hasValue(listing.rentInfo.availableFrom));
    checks.push(hasValue(listing.rentInfo.securityDeposit));
  }

  const videos = listing.media?.videos ?? {};
  const reel = listing.media?.reelVideo ?? {};
  // Both optional media sections are always available in the edit form.
  checks.push(hasValue(videos.videoUrl) || hasValue(videos.ytVideoUrl));
  checks.push(hasValue(reel.reelUrl) || hasValue(reel.ytReelUrl));

  checks.push(...getDetailChecks(listing, section, listing[section]));
  return Math.round((checks.filter(Boolean).length / checks.length) * 100);
}

module.exports = { calculatePropertyCompletionPercentage };
