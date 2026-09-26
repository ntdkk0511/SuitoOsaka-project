import React from 'react';

export default function Header({ userScore = 0, userName = 'ゲスト' }) {
  return (
    <header
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        height: '48px',
        backgroundColor: 'rgba(255, 255, 255, 0.92)',
        backdropFilter: 'blur(8px)',
        borderBottom: '1px solid rgba(0, 0, 0, 0.08)',
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 16px',
        boxSizing: 'border-box',
      }}
    >
      {/* タイトルロゴ */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <span style={{ fontSize: '15px', fontWeight: 'bold', color: '#2c1810', letterSpacing: '0.5px', fontFamily: 'sans-serif' }}>
          Suito Time-Walk
        </span>
      </div>

      {/* スコア・ユーザー情報 */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <div
          style={{
            background: '#fffbeb',
            border: '1px solid #fde68a',
            padding: '3px 10px',
            borderRadius: '12px',
            fontSize: '11px',
            fontWeight: 'bold',
            color: '#b45309',
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
          }}
        >
          <span>🏆</span>
          <span>{userScore} pt</span>
        </div>
        <div
          style={{
            background: '#f3f4f6',
            padding: '3px 10px',
            borderRadius: '12px',
            fontSize: '11px',
            color: '#4b5563',
            fontWeight: '500',
          }}
        >
          👤 {userName}
        </div>
      </div>
    </header>
  );
}