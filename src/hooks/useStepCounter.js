import { useState, useEffect, useRef } from 'react';

export function useStepCounter(userLocation) {
  const [steps, setSteps] = useState(() => {
    const savedDate = localStorage.getItem('tw_step_date');
    const today = new Date().toDateString();
    if (savedDate !== today) {
      localStorage.setItem('tw_step_date', today);
      localStorage.setItem('tw_today_steps', '0');
      return 0;
    }
    return parseInt(localStorage.getItem('tw_today_steps') || '0', 10);
  });

  const lastLocationRef = useRef(null);
  const lastAccelRef = useRef({ x: 0, y: 0, z: 0 });

  // 歩数の保存
  useEffect(() => {
    localStorage.setItem('tw_today_steps', steps.toString());
  }, [steps]);

  // 1. 加速度センサー（DeviceMotion）による歩数カウント
  useEffect(() => {
    let lastStepTime = 0;

    const handleMotion = (event) => {
      const acc = event.accelerationIncludingGravity;
      if (!acc) return;

      const deltaX = acc.x - lastAccelRef.current.x;
      const deltaY = acc.y - lastAccelRef.current.y;
      const deltaZ = acc.z - lastAccelRef.current.z;
      const acceleration = Math.sqrt(deltaX * deltaX + deltaY * deltaY + deltaZ * deltaZ);

      lastAccelRef.current = { x: acc.x, y: acc.y, z: acc.z };

      // 閾値を超えた運動を歩行として認識 (1秒間に最大2〜3歩程度に抑える)
      const now = Date.now();
      if (acceleration > 11 && now - lastStepTime > 350) {
        lastStepTime = now;
        setSteps((prev) => Math.min(prev + 1, 10000)); // 上限10,000歩
      }
    };

    if (window.DeviceMotionEvent) {
      window.addEventListener('devicemotion', handleMotion);
    }

    return () => {
      if (window.DeviceMotionEvent) {
        window.removeEventListener('devicemotion', handleMotion);
      }
    };
  }, []);

  // 2. 位置情報（GPS移動距離）からの歩数推計（センサー非対応時のバックアップ）
  useEffect(() => {
    if (!userLocation) return;

    if (lastLocationRef.current) {
      const [lng1, lat1] = lastLocationRef.current;
      const [lng2, lat2] = userLocation;

      // ハーバーサイン公式による2点間距離(m)算出
      const R = 6371000;
      const dLat = ((lat2 - lat1) * Math.PI) / 180;
      const dLng = ((lng2 - lng1) * Math.PI) / 180;
      const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos((lat1 * Math.PI) / 180) *
          Math.cos((lat2 * Math.PI) / 180) *
          Math.sin(dLng / 2) *
          Math.sin(dLng / 2);
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
      const distance = R * c;

      // 3m以上100m未満の正常な徒歩移動の場合に歩数算定（歩幅約0.7m換算）
      if (distance >= 3 && distance < 100) {
        const addedSteps = Math.round(distance / 0.7);
        setSteps((prev) => Math.min(prev + addedSteps, 10000));
      }
    }

    lastLocationRef.current = userLocation;
  }, [userLocation]);

  return { steps, setSteps };
}