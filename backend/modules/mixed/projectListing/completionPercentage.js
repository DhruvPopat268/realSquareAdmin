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
    hasValue(project.minPrice) && hasValue(project.maxPrice),
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
    checks.push(configurations.length > 0 && configurations.every((item) => hasValue(item.bhk)));
  } else if (commercial) {
    const details = project.commercialDetails ?? {};
    checks.push(hasValue(details.zoneType));
    checks.push(hasValue(details.locationHub));
    checks.push(hasValue(details.areaUnit));
    checks.push(configurations.length > 0 && configurations.every((item) => hasValue(item.carpetArea)));
  }

  for (const configuration of configurations) {
    checks.push(hasValue(configuration.carpetArea));
    checks.push(hasValue(configuration.furnishType));
  }

  const completed = checks.filter(Boolean).length;
  return Math.round((completed / checks.length) * 100);
}

module.exports = { calculateProjectCompletionPercentage };
