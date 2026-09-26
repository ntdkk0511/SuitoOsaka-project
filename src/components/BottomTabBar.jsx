import React from 'react';

export function BottomTabBar({ activeTab, setActiveTab }) {
  const tabs = [
    { id: 'map', label: 'マップ', icon: '🗺️' },
    { id: 'encyclopedia', label: '図鑑', icon: '📖' },
    { id: 'rewards', label: '特典', icon: '🎁' },
    { id: 'ranking', label: '順位', icon: '🏆' },
    { id: 'mypage', label: 'マイ', icon: '👤' },
  ];

  return (
    <nav
      style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        height: '60px',
        backgroundColor: 'rgba(255, 255, 255, 0.95)',
        backdropFilter: 'blur(8px)',
        borderTop: '1px solid #e5e7eb',
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-around',
        boxShadow: '0 -2px 10px rgba(0,0,0,0.08)',
      }}
    >
      {tabs.map((tab) => {
        const isActive = activeTab === tab.id;
        return (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            style={{
              background: 'none',
              border: 'none',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              width: '100%',
              height: '100%',
              cursor: 'pointer',
              color: isActive ? '#2563eb' : '#6b7280',
              fontWeight: isActive ? 'bold' : 'normal',
              padding: 0,
            }}
          >
            <span style={{ fontSize: '20px', lineHeight: 1 }}>{tab.icon}</span>
            <span style={{ fontSize: '11px', marginTop: '2px' }}>{tab.label}</span>
          </button>
        );
      })}
    </nav>
  );
}

export default BottomTabBar;