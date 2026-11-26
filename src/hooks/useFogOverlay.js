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
  ownVisitedLocations = [],
  buddyVisitedLocations = [],
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

    if (buddyActive) {
      const mask = document.createElement('canvas');
      mask.width = canvas.width; mask.height = canvas.height;
      const mctx = mask.getContext('2d');
      mctx.scale(dpr, dpr);
      const paintFootprints = points => {
        mctx.clearRect(0, 0, width, height);
        mctx.fillStyle = '#fff';
        for (const point of points || []) {
          const pixel = map.project(point);
          const radius = getPixelRadiusFromMeters(map, point, 50);
          if (!pixel || radius < 0.5) continue;
          mctx.beginPath(); mctx.arc(pixel.x, pixel.y, radius, 0, Math.PI * 2); mctx.fill();
        }
      };
      const drawMasked = (points, color) => {
        paintFootprints(points);
        const layer = document.createElement('canvas'); layer.width = canvas.width; layer.height = canvas.height;
        const layerCtx = layer.getContext('2d'); layerCtx.fillStyle = color; layerCtx.fillRect(0, 0, width * dpr, height * dpr);
        layerCtx.globalCompositeOperation = 'destination-in'; layerCtx.drawImage(mask, 0, 0);
        ctx.save(); ctx.globalCompositeOperation = 'source-over'; ctx.drawImage(layer, 0, 0, width, height); ctx.restore();
      };
      // Own and partner territory receive separate translucent color washes.
      drawMasked(ownVisitedLocations, 'rgba(56,189,248,0.30)');
      drawMasked(buddyVisitedLocations, 'rgba(251,113,133,0.30)');
      // Intersect both footprint masks, then paint their shared area with a soft pastel spectrum.
      paintFootprints(ownVisitedLocations);
      const ownMask = document.createElement('canvas'); ownMask.width = canvas.width; ownMask.height = canvas.height;
      ownMask.getContext('2d').drawImage(mask, 0, 0);
      paintFootprints(buddyVisitedLocations);
      mctx.globalCompositeOperation = 'destination-in'; mctx.drawImage(ownMask, 0, 0);
      const rainbow = ctx.createLinearGradient(0, 0, width, height);
      rainbow.addColorStop(0, 'rgba(249,168,212,0.42)'); rainbow.addColorStop(.25, 'rgba(253,230,138,0.42)'); rainbow.addColorStop(.5, 'rgba(167,243,208,0.42)'); rainbow.addColorStop(.75, 'rgba(147,197,253,0.42)'); rainbow.addColorStop(1, 'rgba(196,181,253,0.42)');
      const rainbowLayer = document.createElement('canvas'); rainbowLayer.width = canvas.width; rainbowLayer.height = canvas.height;
      const rainbowCtx = rainbowLayer.getContext('2d'); rainbowCtx.scale(dpr, dpr); rainbowCtx.fillStyle = rainbow; rainbowCtx.fillRect(0, 0, width, height); rainbowCtx.globalCompositeOperation = 'destination-in'; rainbowCtx.drawImage(mask, 0, 0);
      ctx.save(); ctx.globalCompositeOperation = 'source-over'; ctx.drawImage(rainbowLayer, 0, 0, width, height); ctx.restore();
    }

    ctx.restore();
  }, [clearedSpots, visitedLocations, ownVisitedLocations, buddyVisitedLocations, cruisedLocations, userLocation, fogRadiiRef, buddyActive, mapRef, fogOverlayRef]);

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
