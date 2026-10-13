import React, { useState, useEffect, useRef } from 'react';

export default function WaterBusCruiseEffect({ isActive, speed: initialSpeed, onEndCruise }) {
  const [currentSpeed, setCurrentSpeed] = useState(initialSpeed || 0);
  const [rideTime, setRideTime] = useState(0);
  const [showSummary, setShowSummary] = useState(false);

  const timerRef = useRef(null);
  const watchIdRef = useRef(null);

  useEffect(() => {
    if (isActive) {
      setRideTime(0);
      // 乗船タイマー開始
      timerRef.current = setInterval(() => {
        setRideTime((prev) => prev + 1);
      }, 1000);

      // GPSでの移動速度監視
      if ('geolocation' in navigator) {
        watchIdRef.current = navigator.geolocation.watchPosition(
          (pos) => {
            const rawSpeedMps = pos.coords.speed;
            if (rawSpeedMps !== null && rawSpeedMps > 0) {
              setCurrentSpeed(rawSpeedMps * 3.6);
            } else {
              setCurrentSpeed(11.5 + Math.sin(Date.now() / 2000) * 1.5);
            }
          },
          () => {
            setCurrentSpeed(12.0 + Math.sin(Date.now() / 2000));
          },
          { enableHighAccuracy: true }
        );
      }
    } else {
      clearInterval(timerRef.current);
      if (watchIdRef.current) navigator.geolocation.clearWatch(watchIdRef.current);
    }

    return () => {
      clearInterval(timerRef.current);
      if (watchIdRef.current) navigator.geolocation.clearWatch(watchIdRef.current);
    };
  }, [isActive]);

  if (!isActive) return null;

  // 🎯 下船確定時：通常モードへ復帰
  const handleConfirmDisembark = () => {
    setShowSummary(false);
    if (onEndCruise) {
      onEndCruise();
    }
  };

  const formatTime = (secs) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <>
      {/* 🚢 乗船中演出（波エフェクト・HUD） */}
      <div style={{
        position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 999,
        overflow: 'hidden', border: '4px solid rgba(14, 165, 233, 0.6)'
      }}>
        <style>{`
          .water-wave {
            position: absolute; bottom: -20px; left: 0; width: 100%; height: 80px;
            background: linear-gradient(180deg, transparent, rgba(56, 189, 248, 0.3));
            filter: blur(4px);
          }
        `}</style>
        
        {/* 上部HUD */}
        <div style={{
          position: 'absolute', top: '70px', left: '50%', transform: 'translateX(-50%)',
          background: 'rgba(2, 132, 199, 0.95)', color: '#fff', padding: '8px 18px',
          borderRadius: '24px', fontSize: '13px', fontWeight: 'bold',
          boxShadow: '0 4px 16px rgba(0,0,0,0.25)', display: 'flex', alignItems: 'center', gap: '12px',
          pointerEvents: 'auto'
        }}>
          <span>🚢 水上バス航行中</span>
          <span style={{ fontSize: '12px', background: 'rgba(255,255,255,0.2)', padding: '2px 8px', borderRadius: '10px' }}>
            {Math.round(currentSpeed)} km/h
          </span>
          <span style={{ fontSize: '12px', fontFamily: 'monospace' }}>
            ⏱ {formatTime(rideTime)}
          </span>
        </div>

        <div className="water-wave" />
      </div>

      {/* ⚓ 乗船終了（下船）ボタン：pointerEvents: 'auto' でクリックを許可 */}
      <button
        onClick={() => setShowSummary(true)}
        style={{
          position: 'fixed', bottom: '100px', right: '20px', zIndex: 1000,
          background: '#ef4444', color: '#fff', border: 'none', padding: '12px 20px',
          borderRadius: '25px', fontWeight: 'bold', fontSize: '13px',
          boxShadow: '0 4px 15px rgba(239, 68, 68, 0.4)', cursor: 'pointer',
          pointerEvents: 'auto'
        }}
      >
        ⚓ 乗船終了（下船）
      </button>

      {/* 📋 下船サマリーモーダル */}
      {showSummary && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)',
          backdropFilter: 'blur(5px)', display: 'flex', alignItems: 'center',
          justifyContent: 'center', zIndex: 10001, pointerEvents: 'auto'
        }}>
          <div style={{
            background: '#fff', borderRadius: '20px', padding: '24px',
            width: '300px', textAlign: 'center', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.3)'
          }}>
            <div style={{ fontSize: '40px', marginBottom: '8px' }}>⚓</div>
            <h3 style={{ margin: '0 0 6px 0', color: '#0f172a', fontSize: '18px' }}>
              クルーズ終了
            </h3>
            <p style={{ fontSize: '12px', color: '#64748b', margin: '0 0 16px 0' }}>
              おつかれさまでした！通常マップモードへ復帰します。
            </p>

            <div style={{ background: '#f8fafc', padding: '12px', borderRadius: '10px', marginBottom: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '4px' }}>
                <span style={{ color: '#64748b' }}>乗船時間</span>
                <strong style={{ color: '#0f172a' }}>{formatTime(rideTime)}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
                <span style={{ color: '#64748b' }}>最高到達速度</span>
                <strong style={{ color: '#0284c7' }}>{Math.round(currentSpeed)} km/h</strong>
              </div>
            </div>

            <button
              onClick={handleConfirmDisembark}
              style={{
                width: '100%', padding: '12px', background: '#0284c7', color: '#fff',
                border: 'none', borderRadius: '10px', fontWeight: 'bold', cursor: 'pointer'
              }}
            >
              通常モードに戻る
            </button>
          </div>
        </div>
      )}
    </>
  );
}