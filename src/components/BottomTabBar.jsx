import React from 'react';
import { motion } from 'framer-motion';

const tabs = [
  { id: 'map', label: 'マップ', icon: '/icons/3-1.png' },
  { id: 'encyclopedia', label: '図鑑', icon: '/icons/3-2.png' },
  { id: 'rewards', label: '特典', icon: '/icons/3-3.png' },
  { id: 'ranking', label: 'ランキング', icon: '/icons/3-4.png' },
  { id: 'mypage', label: 'マイページ', icon: null },
];

const spring = { type: 'spring', stiffness: 420, damping: 32, mass: 0.75 };

export function BottomTabBar({ activeTab, setActiveTab }) {
  return (
    <nav className="bottom-tab-bar" aria-label="メインナビゲーション">
      {tabs.map((tab) => {
        const isActive = activeTab === tab.id;
        return (
          <button key={tab.id} type="button" className={`bottom-tab${isActive ? ' is-active' : ''}`} aria-current={isActive ? 'page' : undefined} onClick={() => setActiveTab(tab.id)}>
            {isActive && <motion.span className="tab-pill" layoutId="active-tab-pill" transition={spring} />}
            {tab.icon ? (
              <motion.img src={tab.icon} alt="" animate={{ y: isActive ? -2 : 0, scale: isActive ? 1.04 : 0.96, opacity: isActive ? 1 : 0.66 }} transition={spring} />
            ) : (
              <motion.svg viewBox="0 0 32 32" width="31" height="31" fill="none" xmlns="http://www.w3.org/2000/svg" animate={{ y: isActive ? -2 : 0, scale: isActive ? 1.04 : 0.96, opacity: isActive ? 1 : 0.66 }} transition={spring} aria-hidden="true">
                <circle cx="16" cy="10" r="6" fill="currentColor" />
                <path d="M5 28c0-6.1 4.9-11 11-11s11 4.9 11 11" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
              </motion.svg>
            )}
            <span className="bottom-tab-label">{tab.label}</span>
            {isActive && <motion.span className="tab-ripple" initial={{ scale: 0.35, opacity: 0.5 }} animate={{ scale: 1.65, opacity: 0 }} transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }} />}
          </button>
        );
      })}
    </nav>
  );
}

export default BottomTabBar;