// App map coordinates use Mapbox order [lng, lat]; Firestore stores named fields.
export const normalizeLocation = value => {
  if (Array.isArray(value) && value.length >= 2) {
    const lng = Number(value[0]);
    const lat = Number(value[1]);
    return Number.isFinite(lat) && Number.isFinite(lng) ? { lat, lng } : null;
  }
  if (value && typeof value === 'object' && Number.isFinite(Number(value.lat)) && Number.isFinite(Number(value.lng))) {
    return { lat: Number(value.lat), lng: Number(value.lng) };
  }
  return null;
};

export const normalizeLocations = list => {
  const points = [];
  const visit = value => {
    if (!Array.isArray(value)) return;
    // A coordinate pair, including one wrapped by accidental extra arrays.
    if (value.length >= 2 && !Array.isArray(value[0]) && !Array.isArray(value[1])
      && Number.isFinite(Number(value[0])) && Number.isFinite(Number(value[1]))) {
      const point = normalizeLocation(value);
      if (point) points.push(point);
      return;
    }
    value.forEach(visit);
  };
  visit(list);
  return points;
};

export const locationForMap = value => {
  const point = normalizeLocation(value);
  return point ? [point.lng, point.lat] : null;
};

// Removes undefined recursively and guarantees that nested arrays cannot reach Firestore.
export const sanitizeBuddyData = (value, fieldName = '') => {
  if (value === undefined) return undefined;
  if (fieldName === 'location') return normalizeLocation(value);
  if (['visitedLocations', 'trail', 'exploredPaths', 'exploredLocations'].includes(fieldName)) return normalizeLocations(value);
  if (Array.isArray(value)) {
    // Convert coordinate pairs and collections of coordinate pairs to Firestore-safe objects.
    if (value.length >= 2 && !Array.isArray(value[0]) && !Array.isArray(value[1])
      && Number.isFinite(Number(value[0])) && Number.isFinite(Number(value[1]))) {
      return normalizeLocation(value);
    }
    return value.map(item => sanitizeBuddyData(item)).filter(item => item !== undefined && !Array.isArray(item));
  }
  if (value && typeof value === 'object' && !(value instanceof Date)) {
    return Object.fromEntries(Object.entries(value)
      .map(([key, item]) => [key, sanitizeBuddyData(item, key.split('.').at(-1))])
      .filter(([, item]) => item !== undefined));
  }
  return value;
};
