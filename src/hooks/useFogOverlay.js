import { useEffect, useCallback } from 'react';
import { SPOTS_DATA } from '../constants/spots';

const getPixelRadiusFromMeters = (map, lngLat, meters) => {
  if (!map || !lngLat) return 0;
  const centerPixel = map.project(lngLat);
  const lat = lngLat[1];
  const deltaLng = meters / (111320 * Math.cos((lat * Math.PI) / 180));
  const edgePixel = map.project([lngLat[0] + deltaLng, lat]);

  const dx = edgePixel.x - centerPixel.x;
  const dy = edgePixel.y - centerPixel.y;
  const radius = Math.sqrt(dx * dx + dy * dy);
  
  return isNaN(radius) ? 0 : radius;
};

export function useFogOverlay({
  mapRef,
  fogOverlayRef,
  clearedSpots,
  visitedLocations,
  cruisedLocations,
  userLocation,
  fogRadiiRef,
  buddyActive = false
}) {
  const updateFogPosition = useCallback(() => {
    if (!mapRef.current || !fogOverlayRef.current) return;
    const map = mapRef.current;
    
    // マップの現在の表示領域（バウンディングボックス）を取得
    const bounds = map.getBounds();
    // 少し広めのマージンを取る（画面端で霧が切れるのを防ぐため）
    const latMargin = (bounds.getNorth() - bounds.getSouth()) * 0.2;
    const lngMargin = (bounds.getEast() - bounds.getWest()) * 0.2;
    const paddedBounds = {
      north: bounds.getNorth() + latMargin,
      south: bounds.getSouth() - latMargin,
      east: bounds.getEast() + lngMargin,
      west: bounds.getWest() - lngMargin,
    };

    // 画面内にあるか判定する軽量関数
    const isVisible = (lngLat) => {
      const [lng, lat] = lngLat;
      return (
        lat <= paddedBounds.north &&
        lat >= paddedBounds.south &&
        lng <= paddedBounds.east &&
        lng >= paddedBounds.west
      );
    };

    const clearedSpotsData = SPOTS_DATA
      .filter(spot => clearedSpots.includes(spot.id))
      .map(spot => ({
        lngLat: spot.lngLat,
        radiusMeters: fogRadiiRef.current[spot.id] ?? 80
      }));

    const walkingPoints = (visitedLocations || []).map(lngLat => ({
      lngLat,
      radiusMeters: buddyActive ? 50 : 25
    }));

    const cruisingPoints = (cruisedLocations || []).map(lngLat => ({
      lngLat,
      radiusMeters: 50 
    }));

    const currentLocPoint = userLocation ? [{ lngLat: userLocation, radiusMeters: buddyActive ? 50 : 25 }] : [];

    // 全ポイントから画面内のものだけを抽出（処理を劇的に軽くする）
    const allRevealPoints = [...clearedSpotsData, ...walkingPoints, ...cruisingPoints, ...currentLocPoint]
      .filter(item => isVisible(item.lngLat));
    
    const overlay = fogOverlayRef.current;
    
    // 操作妨害を防ぐための必須設定
    overlay.style.pointerEvents = 'none';
    overlay.style.willChange = 'mask-image, -webkit-mask-image';
    overlay.style.transition = 'none';

    if (allRevealPoints.length === 0) {
      overlay.style.webkitMaskImage = 'none';
      overlay.style.maskImage = 'none';
      return;
    }

    const gradients = allRevealPoints.map(item => {
      const pixelPos = map.project(item.lngLat);
      if (pixelPos && !isNaN(pixelPos.x) && !isNaN(pixelPos.y)) {
        const radiusPx = getPixelRadiusFromMeters(map, item.lngLat, item.radiusMeters);
        if (radiusPx < 0.5) return null;
        
        // 少数第一位で丸めてCSS文字列のパース負荷を軽減
        const px = pixelPos.x.toFixed(1);
        const py = pixelPos.y.toFixed(1);
        const r = radiusPx.toFixed(1);
        return `radial-gradient(circle ${r}px at ${px}px ${py}px, transparent 20%, black 85%)`;
      }
      return null;
    }).filter(Boolean);

    if (gradients.length === 0) {
      overlay.style.webkitMaskImage = 'none';
      overlay.style.maskImage = 'none';
      return;
    }

    const maskStyle = gradients.join(', ');

    overlay.style.webkitMaskImage = maskStyle;
    overlay.style.maskImage = maskStyle;
    overlay.style.webkitMaskRepeat = 'no-repeat';
    overlay.style.maskRepeat = 'no-repeat';
    overlay.style.webkitMaskComposite = 'source-over';
    overlay.style.maskComposite = 'intersect';
    
  }, [clearedSpots, visitedLocations, cruisedLocations, userLocation, fogRadiiRef, buddyActive]);

  useEffect(() => {
    if (!mapRef.current) return;
    const map = mapRef.current;

    // renderイベントのみで完全にマップ描画と同期させる
    map.on('render', updateFogPosition);
    updateFogPosition();

    return () => {
      map.off('render', updateFogPosition);
    };
  }, [updateFogPosition]);

  return { updateFogPosition };
}
