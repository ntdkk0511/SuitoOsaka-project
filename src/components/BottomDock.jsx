import React from 'react';

export default function BottomDock({
  currentSpot,
  isCurrentCleared,
  isNearSpot,
  onRecenter,
  onOpenQuiz,
  onOpenAR
}) {
  return (
    <footer 
      className="integrated-bottom-dock"
      style={{ bottom: 'calc(78px + env(safe-area-inset-bottom, 0px))', position: 'fixed', left: 0, right: 0, zIndex: 30 }}
    >
      <div className="embedded-story-card">
        <div className="card-meta">
          <span className="badge-purple">{currentSpot.englishName}</span>
          <span className={`badge-status ${isCurrentCleared ? 'cleared-text' : 'locked-text'}`}>
            {isCurrentCleared ? '🔓 解放済みエリア' : '🔒 未開拓エリア'}
          </span>
          {isNearSpot && !isCurrentCleared && (
            <span className="badge-purple" style={{ background: '#0ea5e9', color: '#fff' }}>
              📍 現地に到着！
            </span>
          )}
        </div>
        <h2 className="card-title">{isCurrentCleared ? currentSpot.name : '？？？ の試練'}</h2>
        <p className="card-desc">
          {isCurrentCleared
            ? currentSpot.desc
            : isNearSpot
            ? 'スポットの目の前に到着しました！クイズに挑戦してマップを解放しましょう！'
            : 'このエリアは霧に包まれています。現地（20m以内）に近づくとクイズに挑戦できます！'}
        </p>
      </div>

      <div className="compass-navigation-zone">
        <button className="nav-action-btn-side" onClick={onRecenter}>
          <span className="side-icon">🧭</span>
          <span className="side-label">現在地へ</span>
        </button>

        <div className="main-action-core">
          {isCurrentCleared ? (
            <>
              <button className="core-trigger ready-ar" onClick={onOpenAR}>
                <span className="core-icon">✨</span>
              </button>
              <span className="core-label">ARを開く</span>
            </>
          ) : (
            <>
              <button
                className="core-trigger ready-unlock"
                onClick={onOpenQuiz}
                style={{ opacity: isNearSpot ? 1 : 0.6 }}
              >
                <span className="core-icon">🔑</span>
              </button>
              <span className="core-label">
                {isNearSpot ? 'クイズに挑戦' : '現地で挑戦可能'}
              </span>
            </>
          )}
        </div>
        <div style={{ width: '75px' }} />
      </div>
    </footer>
  );
}
