// src/utils/waterRoute.js

// 大川〜中之島周辺の川エリア（ポリゴン近似座標）
export const WATER_ZONE_POLYGON = [
  [135.5000, 34.6950],
  [135.5300, 34.6980],
  [135.5350, 34.6900],
  [135.5050, 34.6880]
];

/**
 * 2点間の距離(メートル)を計算 (Haversine Formula)
 */
export function getDistanceMeters(lat1, lon1, lat2, lon2) {
  const R = 6371e3; // 地球の半径 (m)
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}

/**
 * 2地点間の移動速度 (km/h) を計算
 */
export function calculateSpeedKmH(prevPos, currentPos, timeIntervalSec) {
  if (!prevPos || !currentPos || timeIntervalSec <= 0) return 0;
  const distMeters = getDistanceMeters(
    prevPos[1], prevPos[0],
    currentPos[1], currentPos[0]
  );
  const speedMPS = distMeters / timeIntervalSec; // m/s
  return speedMPS * 3.6; // km/h に変換
}

/**
 * 水上バスの速度域か判定 (時速 6km/h 〜 30km/h)
 */
export function isValidWaterBusSpeed(speedKmH) {
  return speedKmH >= 6 && speedKmH <= 30;
}