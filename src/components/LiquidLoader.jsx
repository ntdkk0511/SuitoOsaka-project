import React from 'react';
import './LiquidLoader.css';

/**
 * 清涼感・透明感を極めた水満ちローディング演出コンポーネント
 */
export default function LiquidLoader({ 
  show = true, 
  progress = 0, 
  message = "水の都マップを読み込んでいます..." 
}) {
  if (!show) return null;

  const currentProgress = Math.min(100, Math.max(0, progress));

  return (
    <div className="liquid-screen-overlay">
      {/* 🌊 透明感のある水の領域 */}
      <div className="liquid-screen-fill" style={{ height: `${currentProgress}%` }}>
        <div className="liquid-screen-wave liquid-screen-wave-front" />
        <div className="liquid-screen-wave liquid-screen-wave-back" />

        {/* 🫧 下から湧き出る気泡 */}
        <div className="bubble b1" />
        <div className="bubble b2" />
        <div className="bubble b3" />
        <div className="bubble b4" />
      </div>

      {/* 📝 中央パーセント表示 */}
      <div className="liquid-screen-content">
        <div className="liquid-screen-percent">{Math.round(currentProgress)}%</div>
        {message && <div className="liquid-screen-message">{message}</div>}
      </div>
    </div>
  );
}