import { useEffect } from 'react';
import { SPOTS_DATA } from '../constants/spots';

/**
 * 緯度経度と指定メートル数から、現在の地図ズームに応じた画面上のピクセル半径を算出
 */
const getPixelRadiusFromMeters = (map, lngLat, meters) => {
  const centerPixel = map.project(lngLat);
  const lat = lngLat[1];
  // 該当緯度における経度1度あたりの距離(m)から、指定m分移動したピクセル位置を計算
  const deltaLng = meters / (111320 * Math.cos((lat * Math.PI) / 180));
  const edgePixel = map.project([lngLat[0] + deltaLng, lat]);

  const dx = edgePixel.x - centerPixel.x;
  const dy = edgePixel.y - centerPixel.y;
  return Math.sqrt(dx * dx + dy * dy);
};

export function useFogOverlay({
  mapRef,
  fogOverlayRef,
  clearedSpots,
  visitedLocations,
  userLocation,
  fogRadiiRef
}) {
  const updateFogPosition = () => {
    if (!mapRef.current || !fogOverlayRef.current) return;
    const map = mapRef.current;

    // 1. クリア済みスポット（メートル単位：既定80m）
    const clearedSpotsData = SPOTS_DATA
      .filter(spot => clearedSpots.includes(spot.id))
      .map(spot => ({
        lngLat: spot.lngLat,
        radiusMeters: fogRadiiRef.current[spot.id] ?? 80
      }));

    // 2. 歩いた軌跡 ＆ 3. 現在地（メートル単位：25m）
    const pathPoints = [
      ...visitedLocations,
      ...(userLocation ? [userLocation] : [])
    ].map(lngLat => ({
      lngLat,
      radiusMeters: 25 // 🚶 歩行で晴れる実際の半径（25メートル）
    }));

    const allRevealPoints = [...clearedSpotsData, ...pathPoints];
    if (allRevealPoints.length === 0) return;

    const gradients = allRevealPoints.map(item => {
      const pixelPos = map.project(item.lngLat);
      if (pixelPos && typeof pixelPos.x === 'number' && typeof pixelPos.y === 'number') {
        // メートル単位から画面上のピクセル半径に動的変換
        const radiusPx = getPixelRadiusFromMeters(map, item.lngLat, item.radiusMeters);
        
        // 画面外や極小サイズ時のケア
        if (radiusPx < 0.5) return null;

        return `radial-gradient(circle ${radiusPx}px at ${pixelPos.x}px ${pixelPos.y}px, transparent 20%, black 85%)`;
      }
      return null;
    }).filter(Boolean);

    if (gradients.length === 0) return;
    const maskStyle = gradients.join(', ');

    requestAnimationFrame(() => {
      if (!fogOverlayRef.current) return;
      fogOverlayRef.current.style.webkitMaskImage = maskStyle;
      fogOverlayRef.current.style.maskImage = maskStyle;
      fogOverlayRef.current.style.webkitMaskComposite = 'source-over';
      fogOverlayRef.current.style.maskComposite = 'intersect';
    });
  };

  useEffect(() => {
    if (!mapRef.current) return;
    const map = mapRef.current;

    map.off('move', updateFogPosition);
    map.on('move', updateFogPosition);
    updateFogPosition();

    return () => {
      map.off('move', updateFogPosition);
    };
  }, [clearedSpots, visitedLocations, userLocation]);

  return { updateFogPosition };
}