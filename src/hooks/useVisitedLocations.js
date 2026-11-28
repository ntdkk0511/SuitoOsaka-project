import { useState, useEffect } from 'react';
import { isWithinRadius } from '../utils/geo';
import { normalizeLocations } from '../utils/buddyData';

/**
 * GPS現在地を監視し、移動に応じて徒歩/水上バスの軌跡を記録・保存するフック
 */
export function useVisitedLocations(userLocation, isCruising) {
  // 🚶 徒歩の軌跡
  const [visitedLocations, setVisitedLocations] = useState(() => {
    const localTrail = normalizeLocations(JSON.parse(localStorage.getItem('tw_visited_locations') || '[]')).map(point => [point.lng, point.lat]);
    const cloudTrail = normalizeLocations(JSON.parse(localStorage.getItem('tw_cloud_visited_locations') || '[]')).map(point => [point.lng, point.lat]);
    return [...new Map([...cloudTrail, ...localTrail].map(point => [`${point[0]}:${point[1]}`, point])).values()];
  });

  // 🚢 水上バスの軌跡 (新たに追加)
  const [cruisedLocations, setCruisedLocations] = useState(() => {
    return JSON.parse(localStorage.getItem('tw_cruised_locations') || '[]');
  });

  // LocalStorageに自動保存
  useEffect(() => {
    localStorage.setItem('tw_visited_locations', JSON.stringify(visitedLocations));
  }, [visitedLocations]);

  useEffect(() => {
    localStorage.setItem('tw_cruised_locations', JSON.stringify(cruisedLocations));
  }, [cruisedLocations]);

  // 移動するごとに軌跡を追加
  useEffect(() => {
    if (!userLocation) return;

    if (isCruising) {
      // ✨ 水上バス乗船中: cruisedLocations に記録 (20m移動ごと)
      setCruisedLocations(prev => {
        if (prev.length === 0) return [userLocation];
        const lastLoc = prev[prev.length - 1];
        const { isNear } = isWithinRadius(userLocation, lastLoc, 20);
        if (!isNear) {
          return [...prev, userLocation];
        }
        return prev;
      });
    } else {
      // 🚶 徒歩中: visitedLocations に記録 (10m移動ごと)
      setVisitedLocations(prev => {
        if (prev.length === 0) return [userLocation];
        const lastLoc = prev[prev.length - 1];
        const { isNear } = isWithinRadius(userLocation, lastLoc, 10);
        if (!isNear) {
          return [...prev, userLocation];
        }
        return prev;
      });
    }
  }, [userLocation, isCruising]);

  return { visitedLocations, setVisitedLocations, cruisedLocations };
}
