import { useState, useEffect } from 'react';
import { isWithinRadius } from '../utils/geo';

/**
 * GPS現在地を監視し、10m移動するごとに歩行軌跡（visitedLocations）を記録・保存するフック
 */
export function useVisitedLocations(userLocation) {
  const [visitedLocations, setVisitedLocations] = useState(() => {
    return JSON.parse(localStorage.getItem('tw_visited_locations') || '[]');
  });

  // LocalStorageに自動保存
  useEffect(() => {
    localStorage.setItem('tw_visited_locations', JSON.stringify(visitedLocations));
  }, [visitedLocations]);

  // 10m移動するごとに軌跡を追加
  useEffect(() => {
    if (!userLocation) return;

    setVisitedLocations(prev => {
      if (prev.length === 0) return [userLocation];
      const lastLoc = prev[prev.length - 1];
      const { isNear } = isWithinRadius(userLocation, lastLoc, 10);
      if (!isNear) {
        return [...prev, userLocation];
      }
      return prev;
    });
  }, [userLocation]);

  return { visitedLocations };
}