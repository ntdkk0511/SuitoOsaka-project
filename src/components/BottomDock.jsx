import React from 'react';

export default function BottomDock({ currentSpot, isCurrentCleared, isNearSpot, onRecenter, onOpenQuiz, onOpenAR }) {
  return (
    <footer className="integrated-bottom-dock" style={{ bottom: 'calc(78px + env(safe-area-inset-bottom, 0px))', position: 'fixed', left: 0, right: 0, zIndex: 30 }}>
      <div className="embedded-story-card">
        <div className="card-meta">
          <span className="badge-purple">{currentSpot.englishName}</span>
          <span className={`badge-status ${isCurrentCleared ? 'cleared-text' : 'locked-text'}`}>
            {isCurrentCleared ? '記憶を収集済み' : '未発見のスポット'}
          </span>
          {isNearSpot && !isCurrentCleared && <span className="badge-purple" style={{ background: '#287f9b', color: '#fff' }}>現地に到着</span>}
        </div>
        <h2 className="card-title">{currentSpot.name}</h2>
        <p className="card-desc">
          {isCurrentCleared
            ? 'この街の記憶をコレクションに収めました。水辺を歩いて、次の景色を探してみましょう。'
            : isNearSpot
              ? 'チェックポイントに到着しました。ミッションを達成して、街の記憶が描かれたカードパックを受け取りましょう。'
              : '水辺を歩いて街の記憶を探しましょう。チェックポイントに近づくとミッションに挑戦できます。'}
        </p>
      </div>
      <div className="compass-navigation-zone">
        <button className="nav-action-btn-side" onClick={onRecenter}>
          <span className="side-icon" aria-hidden="true">⌖</span><span className="side-label">現在地</span>
        </button>
        <div className="main-action-core">
          {isCurrentCleared ? <>
            <button className="core-trigger ready-ar" onClick={onOpenAR} aria-label="ARで再訪"><span className="core-icon">✧</span></button>
            <span className="core-label">ARで再訪</span>
          </> : <>
            <button className="core-trigger ready-unlock" onClick={onOpenQuiz} style={{ opacity: isNearSpot ? 1 : 0.6 }} aria-label="ミッションに挑戦"><span className="core-icon">◇</span></button>
            <span className="core-label">{isNearSpot ? 'ミッションに挑戦' : '現地で挑戦できます'}</span>
          </>}
        </div>
        <div style={{ width: '75px' }} />
      </div>
    </footer>
  );
}
