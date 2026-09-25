import React from 'react';

export default function ARViewport({
  currentSpot,
  isFlash,
  showARSuccess,
  onShutter,
  onClose,
  onCloseSuccess
}) {
  return (
    <div className="ar-viewport-fullscreen">
      <div className={`ar-flash-overlay ${isFlash ? 'active' : ''}`}></div>
      <div className="ar-scan-line"></div>
      <div className="ar-frame-corners"></div>

      <div className="ar-top-overlay">
        <div className="ar-spot-title">【時空同期中】{currentSpot.name}</div>
        <div className="ar-status-pill">● VPS ONLINE</div>
      </div>

      <div className="ar-hologram-center">
        <div className="hologram-ring"></div>
        <div className="hologram-monument">
          <span className="hologram-icon">🏙️</span>
          <p className="hologram-text">HISTORICAL WATER FRONT</p>
          <span className="hologram-year">ー 大正・昭和初期の風景 ー</span>
        </div>
      </div>

      <div className="ar-bottom-controls">
        <button className="ar-btn-close" onClick={onClose}>✕ 閉じる</button>
        <div className="ar-shutter-outer">
          <button className="ar-shutter-inner" onClick={onShutter}></button>
        </div>
        <div style={{ width: '80px' }}></div>
      </div>

      {showARSuccess && (
        <div className="ar-success-overlay">
          <div className="ar-success-modal">
            <span className="holo-badge">SYNC COMPLETE</span>
            <h2>時空データの回収成功！</h2>
            <p className="holo-reward-desc">
              {currentSpot.name} の歴史的風景キャプチャを完了し、タイムウォーターサーバーへの同期が承認されました。
            </p>
            <div className="holo-score-up">+100 pt</div>
            <button className="holo-close-btn" onClick={onCloseSuccess}>
              タイムラインを戻す
            </button>
          </div>
        </div>
      )}
    </div>
  );
}