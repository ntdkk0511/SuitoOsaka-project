import React from 'react';

export default function Header({ userScore = 0, userName = 'ゲスト', buddyName, onLeaveBuddy }) {
  return (
    <header style={{ position: 'fixed', top: 0, left: 0, right: 0, height: 48, background: 'rgba(255,255,255,.94)', backdropFilter: 'blur(8px)', borderBottom: '1px solid rgba(0,0,0,.08)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 12px', boxSizing: 'border-box' }}>
      <div style={{ fontSize: 15, fontWeight: 700, color: '#2c1810', letterSpacing: '.5px', fontFamily: 'sans-serif' }}>Suito Time-Walk</div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        {buddyName && <div style={{ background: '#cffafe', color: '#0e7490', padding: '4px 7px', borderRadius: 12, fontSize: 10, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 4 }}><span>{buddyName}と同行中</span><button onClick={onLeaveBuddy} style={{ border: 0, borderRadius: 10, background: '#a5f3fc', color: '#155e75', cursor: 'pointer', fontWeight: 700, padding: '3px 6px' }}>解除</button></div>}
        <div style={{ background: '#fffbeb', border: '1px solid #fde68a', padding: '3px 8px', borderRadius: 12, fontSize: 11, fontWeight: 700, color: '#b45309' }}>🏅 {userScore} pt</div>
        <div style={{ background: '#f3f4f6', padding: '3px 8px', borderRadius: 12, fontSize: 10, color: '#4b5563', fontWeight: 500, maxWidth: 90, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>👤 {userName}</div>
      </div>
    </header>
  );
}
