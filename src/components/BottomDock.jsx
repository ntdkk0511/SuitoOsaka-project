import React from 'react';

export default function BottomDock({ currentSpot, isCurrentCleared, isNearSpot, distanceLimitEnabled = true, remainingDistance, onRecenter, onOpenQuiz, onOpenAR }) {
  return (
    <footer className="integrated-bottom-dock" style={{ bottom: 'calc(78px + env(safe-area-inset-bottom, 0px))', position: 'fixed', left: 0, right: 0, zIndex: 30 }}>
      <div className="embedded-story-card">
        <div className="card-meta">
          <span className="badge-purple">{isCurrentCleared ? currentSpot.englishName : '???'}</span>
          <span className={`badge-status ${isCurrentCleared ? 'cleared-text' : 'locked-text'}`}>
            {isCurrentCleared ? '発見済み' : '未発見のスポット'}
          </span>
          {isNearSpot && !isCurrentCleared && <span className="badge-purple" style={{ background: '#287f9b', color: '#fff' }}>チェックポイント到着</span>}
          {!isCurrentCleared && !isNearSpot && distanceLimitEnabled && remainingDistance !== null && <span className="badge-purple" style={{ background: '#fff7ed', color: '#9a3412' }}>あと{remainingDistance}mで挑戦できます</span>}
          {!isCurrentCleared && !distanceLimitEnabled && <span className="badge-purple" style={{ background: '#fef3c7', color: '#92400e' }}>テスト許可中</span>}
        </div>
        <h2 className="card-title">{isCurrentCleared ? currentSpot.name : '???'}</h2>
        <p className="card-desc">
          {isCurrentCleared
            ? 'このスポットの記憶をコレクションに登録しました。水辺を歩いて、次の景色を探しましょう。'
            : isNearSpot
              ? 'チェックポイントに到着しました。ミッションに挑戦して、街の記憶が描かれたカードパックを受け取りましょう。'
              : distanceLimitEnabled
                ? '水辺を歩いて街の記憶を探しましょう。チェックポイントに近づくとミッションに挑戦できます。'
                : '距離制限をオフにしています。どこからでもミッションに挑戦できます（テスト用）。'}
        </p>
      </div>
      <div className="compass-navigation-zone">
        <button className="nav-action-btn-side" onClick={onRecenter}>
          <span className="side-icon" aria-hidden="true">◎</span><span className="side-label">現在地</span>
        </button>
        <div className="main-action-core">
          {isCurrentCleared ? <>
            <button className="core-trigger ready-ar" onClick={onOpenAR} aria-label="ARで再体験"><span className="core-icon">✧</span></button>
            <span className="core-label">ARで再体験</span>
          </> : <>
            <button className="core-trigger ready-unlock" onClick={onOpenQuiz} disabled={!isNearSpot} style={{ opacity: isNearSpot ? 1 : 0.45, filter: isNearSpot ? 'none' : 'grayscale(1)', cursor: isNearSpot ? 'pointer' : 'not-allowed' }} aria-label="ミッションに挑戦"><span className="core-icon">◇</span></button>
            <span className="core-label">{!distanceLimitEnabled && isNearSpot ? 'ミッションに挑戦！（テスト許可中）' : isNearSpot ? 'ミッションに挑戦する！' : '距離を近づけて挑戦'}</span>
          </>}
        </div>
        <div style={{ width: '75px' }} />
      </div>
    </footer>
  );
}
