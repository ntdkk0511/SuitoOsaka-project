import React from 'react';

export default function Header({ nickname, score, onOpenRanking, onEditNickname }) {
  return (
    <header className="aquatic-header-minimal">
      <div className="header-logo">🔵 Suito Time-Walk</div>
      <div className="header-player-zone">
        <button className="header-rank-btn" onClick={onOpenRanking}>🏆</button>
        <div className="header-player-profile" onClick={onEditNickname}>
          <span className="header-nickname">👤 {nickname}</span>
          <span className="header-score">{score} pt</span>
        </div>
      </div>
    </header>
  );
}