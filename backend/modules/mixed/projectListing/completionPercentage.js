function hasValue(value) {
  if (value === undefined || value === null) return false;
  if (typeof value === "string") return value.trim().length > 0;
  if (Array.isArray(value)) return value.length > 0;
  return true;
}

function calculateProjectCompletionPercentage(project) {
  if (!project || typeof project !== "object") return 0;

  const category = project.category?.name?.toLowerCase() ?? "";
  const residential = category === "residential";
  const commercial = category === "commercial";
  const configurations = residential
    ? project.residentialDetails?.configurations ?? []
    : project.commercialDetails?.configurations ?? [];
  const videos = project.media?.videos ?? {};
  const reel = project.media?.reelVideo ?? {};

  const checks = [
    hasValue(project.category?.id ?? project.category?._id ?? project.category?.name),
    hasValue(project.projectName),
    hasValue(project.developerName),
    hasValue(project.projectDescription),
    hasValue(project.projectStatus),
    project.projectStatus === "Ready to Move" || hasValue(project.possessionDate),
    hasValue(project.rera?.reraId),
    hasValue(project.launchDate),
    hasValue(project.totalUnits),
    hasValue(project.availableUnits),
    hasValue(project.towerCount),
    hasValue(project.minPrice),
    hasValue(project.maxPrice),
    hasValue(project.cityName),
    hasValue(project.locality?.address) && hasValue(project.locality?.latitude) && hasValue(project.locality?.longitude),
    hasValue(project.media?.images),
    hasValue(videos.videoUrl) || hasValue(videos.ytVideoUrl),
    hasValue(reel.reelUrl) || hasValue(reel.ytReelUrl),
    hasValue(project.brochureUrl),
    hasValue(project.furnishings),
    hasValue(project.amenities),
  ];

  if (commercial) checks.push(hasValue(project.idealFor));

  if (residential) {
    checks.push(hasValue(project.residentialDetails?.areaUnit));
  } else if (commercial) {
    const details = project.commercialDetails ?? {};
    checks.push(hasValue(details.zoneType));
    checks.push(hasValue(details.locationHub));
    checks.push(hasValue(details.areaUnit));
  }

  // The configurations array is a form section. Each row is then assessed by
  // its own editable fields so one missing row cannot be hidden by another.
  checks.push(configurations.length > 0);

  for (const configuration of configurations) {
    if (residential) checks.push(hasValue(configuration.bhk));
    checks.push(hasValue(configuration.carpetArea));
    checks.push(Number.isFinite(Number(configuration.price)) && Number(configuration.price) > 0);
    checks.push(hasValue(configuration.image2DUrl));
    checks.push(hasValue(configuration.model3DUrl));
    // Furnishing options are one multi-select field, not a separate field per
    // selected option (which made the percentage depend on selection count).
    checks.push(hasValue(configuration.furnishingOptions));
  }

  const completed = checks.filter(Boolean).length;
  return Math.round((completed / checks.length) * 100);
}

module.exports = { calculateProjectCompletionPercentage };
