import { useEffect, useCallback, useRef } from 'react';
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
  const canvasRef = useRef(null);

  const updateFogPosition = useCallback(() => {
    if (!mapRef.current || !fogOverlayRef.current) return;
    const map = mapRef.current;
    const overlay = fogOverlayRef.current;

    // オーバーレイ要素のCSS干渉を無効化し、クリック透過・全面配置を保証
    overlay.style.pointerEvents = 'none';
    overlay.style.background = 'none';
    overlay.style.webkitMaskImage = 'none';
    overlay.style.maskImage = 'none';
    overlay.style.position = 'absolute';
    overlay.style.inset = '0';
    overlay.style.zIndex = '5';

    // 内部に描画用Canvasを1度だけ生成
    if (!canvasRef.current) {
      const canvas = document.createElement('canvas');
      canvas.style.position = 'absolute';
      canvas.style.inset = '0';
      canvas.style.width = '100%';
      canvas.style.height = '100%';
      canvas.style.pointerEvents = 'none';
      overlay.innerHTML = '';
      overlay.appendChild(canvas);
      canvasRef.current = canvas;
    }

    const canvas = canvasRef.current;
    const rect = overlay.getBoundingClientRect();
    const width = Math.floor(rect.width || map.getCanvas().clientWidth);
    const height = Math.floor(rect.height || map.getCanvas().clientHeight);

    if (width === 0 || height === 0) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    if (canvas.width !== Math.floor(width * dpr) || canvas.height !== Math.floor(height * dpr)) {
      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
    }

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.save();
    ctx.scale(dpr, dpr);

    // 1. 画面全体を水都らしい淡い白霧で塗りつぶす
    ctx.globalCompositeOperation = 'source-over';
    ctx.clearRect(0, 0, width, height);
    ctx.fillStyle = 'rgba(173, 194, 218, 0.65)';
    //241, 248, 255, 0.80
    ctx.fillRect(0, 0, width, height);

    // 表示領域の簡易カリング
    const bounds = map.getBounds();
    const latMargin = (bounds.getNorth() - bounds.getSouth()) * 0.25;
    const lngMargin = (bounds.getEast() - bounds.getWest()) * 0.25;
    const north = bounds.getNorth() + latMargin;
    const south = bounds.getSouth() - latMargin;
    const east = bounds.getEast() + lngMargin;
    const west = bounds.getWest() - lngMargin;

    const isVisible = (lngLat) => {
      if (!Array.isArray(lngLat) || lngLat.length < 2) return false;
      const [lng, lat] = lngLat;
      return lat <= north && lat >= south && lng <= east && lng >= west;
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

    const currentLocPoint = userLocation
      ? [{ lngLat: userLocation, radiusMeters: buddyActive ? 50 : 25 }]
      : [];

    const allRevealPoints = [
      ...clearedSpotsData,
      ...walkingPoints,
      ...cruisingPoints,
      ...currentLocPoint
    ].filter(item => isVisible(item.lngLat));

    // 2. クリア済み・歩行軌跡・現在地の霧を円形グラデーションでくり抜く
    ctx.globalCompositeOperation = 'destination-out';

    for (const item of allRevealPoints) {
      const pixelPos = map.project(item.lngLat);
      if (!pixelPos || isNaN(pixelPos.x) || isNaN(pixelPos.y)) continue;

      const radiusPx = getPixelRadiusFromMeters(map, item.lngLat, item.radiusMeters);
      if (radiusPx < 0.5) continue;

      const grad = ctx.createRadialGradient(
        pixelPos.x,
        pixelPos.y,
        radiusPx * 0.45,
        pixelPos.x,
        pixelPos.y,
        radiusPx
      );
      grad.addColorStop(0, 'rgba(0, 0, 0, 1)');
      grad.addColorStop(0.55, 'rgba(0, 0, 0, 1)');
      grad.addColorStop(1, 'rgba(0, 0, 0, 0)');

      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(pixelPos.x, pixelPos.y, radiusPx, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
  }, [clearedSpots, visitedLocations, cruisedLocations, userLocation, fogRadiiRef, buddyActive, mapRef, fogOverlayRef]);

  useEffect(() => {
    if (!mapRef.current) return;
    const map = mapRef.current;

    map.on('render', updateFogPosition);
    map.on('resize', updateFogPosition);
    updateFogPosition();

    return () => {
      map.off('render', updateFogPosition);
      map.off('resize', updateFogPosition);
    };
  }, [updateFogPosition, mapRef]);

  return { updateFogPosition };
}