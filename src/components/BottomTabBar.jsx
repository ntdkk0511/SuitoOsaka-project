import React from 'react';
import { motion } from 'framer-motion';

const tabs = [
  { id: 'map', label: 'マップ', icon: '/icons/3-1.png' },
  { id: 'encyclopedia', label: '図鑑', icon: '/icons/3-2.png' },
  { id: 'rewards', label: '特典', icon: '/icons/3-3.png' },
  { id: 'ranking', label: 'ランキング', icon: '/icons/3-4.png' },
  { id: 'mypage', label: 'マイページ', icon: '/icons/3-5.jpg' },
];

const spring = { type: 'spring', stiffness: 420, damping: 32, mass: 0.75 };

export function BottomTabBar({ activeTab, setActiveTab }) {
  return (
    <nav className="bottom-tab-bar" aria-label="メインナビゲーション">
      {tabs.map((tab) => {
        const isActive = activeTab === tab.id;
        return (
          <button
            key={tab.id}
            type="button"
            className={`bottom-tab${isActive ? ' is-active' : ''}`}
            aria-current={isActive ? 'page' : undefined}
            onClick={() => setActiveTab(tab.id)}
          >
            {isActive && <motion.span className="tab-pill" layoutId="active-tab-pill" transition={spring} />}
            <motion.img
              src={tab.icon}
              alt=""
              animate={{ y: isActive ? -2 : 0, scale: isActive ? 1.04 : 0.96, opacity: isActive ? 1 : 0.66 }}
              transition={spring}
            />
            <span className="bottom-tab-label">{tab.label}</span>
            {isActive && <motion.span className="tab-ripple" initial={{ scale: 0.35, opacity: 0.5 }} animate={{ scale: 1.65, opacity: 0 }} transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }} />}
          </button>
        );
      })}
    </nav>
  );
}

export default BottomTabBar;
