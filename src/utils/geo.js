const EARTH_RADIUS_METERS = 6371e3;

/**
 * 2点間の距離（メートル）を計算
 */
export const calculateDistance = (lat1, lon1, lat2, lon2) => {
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return EARTH_RADIUS_METERS * c;
};

/**
 * 現在地がスポットの20m以内（15〜30mの推奨範囲）にいるか判定
 */
export const isWithinRadius = (userLocation, spotLngLat, radiusMeters = 20) => {
  if (!userLocation || !spotLngLat) return { isNear: false, distance: null };

  const distance = calculateDistance(
    userLocation[1],
    userLocation[0],
    spotLngLat[1],
    spotLngLat[0]
  );

  return {
    isNear: distance <= radiusMeters,
    distance: Math.round(distance)
  };
};