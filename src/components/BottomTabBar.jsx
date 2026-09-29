import React from 'react';

export function BottomTabBar({ activeTab, setActiveTab }) {
  const tabs = [
    { id: 'map', label: 'マップ', icon: '/icons/3-1.png' },
    { id: 'encyclopedia', label: '図鑑', icon: '/icons/3-2.png' },
    { id: 'rewards', label: '特典', icon: '/icons/3-3.png' },
    { id: 'ranking', label: '順位', icon: '/icons/3-4.png' },
    { id: 'mypage', label: 'マイページ', icon: '/icons/3-5.jpg' },
  ];

  return (
    <nav
      style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        height: '82px', /* アイコン45pxと下部余白に合わせて高さを拡張 */
        backgroundColor: 'rgba(255, 255, 255, 0.95)',
        backdropFilter: 'blur(8px)',
        borderTop: '1px solid #e5e7eb',
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-around',
        boxShadow: '0 -2px 10px rgba(0,0,0,0.08)',
        paddingBottom: '10px', /* 文字の下にしっかり余白を確保 */
        boxSizing: 'border-box'
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
            {/* ⭕ アイコン幅・高さを 45px に指定 */}
            <img 
              src={tab.icon} 
              alt={tab.label} 
              style={{
                width: '45px',
                height: '45px',
                objectFit: 'contain',
                opacity: isActive ? 1 : 0.6,
                transform: isActive ? 'scale(1.05)' : 'scale(1)',
                transition: 'all 0.2s ease'
              }} 
            />
            <span style={{ fontSize: '10px', marginTop: '1px' }}>{tab.label}</span>
          </button>
        );
      })}
    </nav>
  );
}

export default BottomTabBar;