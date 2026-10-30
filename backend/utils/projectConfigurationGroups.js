const normalizeBhk = (value) => {
  const text = value == null ? "" : String(value).trim().replace(/\s+/g, " ");
  if (!text) return "Unspecified";
  const match = text.match(/^(\d+(?:\.\d+)?)\s*(?:BHK)?$/i);
  if (match) return Number(match[1]) === 0 ? "1RK" : `${Number(match[1])}BHK`;
  const rk = text.match(/^(\d*)\s*RK$/i);
  if (rk) return `${Number(rk[1] || 1)}RK`;
  return text.toLocaleUpperCase();
};

const areaKey = (value) => value == null || value === "" ? "__unspecified__" : String(Number(value));

function groupConfigurations({ residential = [], commercial = [] } = {}) {
  const residentialByBhk = new Map();
  const commercialByArea = new Map();

  residential.forEach((configuration) => {
    const bhk = normalizeBhk(configuration.bhk);
    if (!residentialByBhk.has(bhk)) residentialByBhk.set(bhk, new Map());
    const areas = residentialByBhk.get(bhk);
    const key = areaKey(configuration.carpetArea);
    if (!areas.has(key)) areas.set(key, { carpetArea: configuration.carpetArea ?? null, configurations: [] });
    areas.get(key).configurations.push(configuration);

  });

  commercial.forEach((configuration) => {
    const key = areaKey(configuration.carpetArea);
    if (!commercialByArea.has(key)) commercialByArea.set(key, { carpetArea: configuration.carpetArea ?? null, configurations: [] });
    commercialByArea.get(key).configurations.push(configuration);
  });

  return {
    residential: Array.from(residentialByBhk, ([bhk, areas]) => ({ bhk, carpetAreas: Array.from(areas.values()) })),
    commercial: Array.from(commercialByArea.values()),
  };
}

module.exports = { groupConfigurations };
