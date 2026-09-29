// src/components/WaterBusCruiseEffect.jsx
import React from 'react';

export default function WaterBusCruiseEffect({ isActive, speed, unlockedProgress }) {
  if (!isActive) return null;

  return (
    <div style={{
      position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 999,
      overflow: 'hidden', border: '4px solid rgba(14, 165, 233, 0.6)'
    }}>
      <style>{`
        @keyframes ripple {
          0% { transform: scale(0.8); opacity: 0.8; }
          100% { transform: scale(2.2); opacity: 0; }
        }
        .water-wave {
          position: absolute; bottom: -20px; left: 0; width: 100%; height: 80px;
          background: linear-gradient(180deg, transparent, rgba(56, 189, 248, 0.3));
          filter: blur(4px);
        }
      `}</style>
      
      {/* 水上バス乗船中バッジ */}
      <div style={{
        position: 'absolute', top: '70px', left: '50%', transform: 'translateX(-50%)',
        background: 'rgba(2, 132, 199, 0.9)', color: '#fff', padding: '8px 16px',
        borderRadius: '20px', fontSize: '13px', fontWeight: 'bold',
        boxShadow: '0 4px 12px rgba(0,0,0,0.2)', display: 'flex', alignItems: 'center', gap: '8px'
      }}>
        <span>🚢 水上バス航行中</span>
        <span style={{ fontSize: '11px', opacity: 0.9 }}>{Math.round(speed)} km/h</span>
      </div>

      <div className="water-wave" />
    </div>
  );
}