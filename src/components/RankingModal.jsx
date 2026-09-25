import React from 'react';

export default function RankingModal({
  ranking,
  user,
  onClose,
  onLinkGoogle
}) {
  return (
    <div className="aquatic-modal-overlay" onClick={onClose}>
      <div className="aquatic-modal-content ranking-modal" onClick={(e) => e.stopPropagation()}>
        <span className="modal-badge">TOP EXPLORERS</span>
        <h3>リアルタイムランキング</h3>
        
        <div className="ranking-list-container">
          {ranking.map((player, index) => {
            const isMe = user && player.id === user.uid;
            return (
              <div key={player.id} className={`ranking-item rank-${index + 1} ${isMe ? 'is-me' : ''}`}>
                <div className="rank-number">{index + 1}</div>
                <div className="rank-nickname">{isMe ? '👉 ' : ''}{player.nickname}</div>
                <div className="rank-score">{player.score.toLocaleString()} pt</div>
              </div>
            );
          })}
          {ranking.length === 0 && <p className="loading-text">データを同期中...</p>}
        </div>

        <div className="account-link-zone" style={{ margin: '18px 0 10px 0', textAlign: 'center' }}>
          <button onClick={onLinkGoogle} className="google-link-button" style={{ width: '100%', padding: '10px', borderRadius: '8px', cursor: 'pointer' }}>
            🌐 Googleアカウントと連携してデータを保存
          </button>
        </div>

        <div className="modal-footer-btns central-btn">
          <button className="confirm-btn holo-btn" onClick={onClose}>閉じる</button>
        </div>
      </div>
    </div>
  );
}