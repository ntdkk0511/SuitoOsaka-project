// src/components/WaterBusQRModal.jsx
import React, { useState } from 'react';

export default function WaterBusQRModal({ isOpen, onClose, onStartCruise }) {
  const [ticketCode, setTicketCode] = useState('');

  if (!isOpen) return null;

  const handleManualSubmit = (e) => {
    e.preventDefault();
    if (ticketCode.trim().length > 0 || true) {
      onStartCruise();
      onClose();
    }
  };

  return (
    <div className="aquatic-modal-overlay" style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10000
    }}>
      <div style={{
        background: '#fff', borderRadius: '20px', padding: '24px', width: '300px', textAlign: 'center'
      }}>
        <h3 style={{ margin: '0 0 12px 0', fontSize: '18px', color: '#0369a1' }}>🚢 水上バスチェックイン</h3>
        <p style={{ fontSize: '12px', color: '#64748b', marginBottom: '20px' }}>
          船着き場のQRコードを読み取るか、乗船コードを入力して川エリアの探索を開始します。
        </p>

        <button
          onClick={() => { onStartCruise(); onClose(); }}
          style={{
            width: '100%', padding: '12px', background: '#0284c7', color: '#fff',
            border: 'none', borderRadius: '10px', fontWeight: 'bold', cursor: 'pointer', marginBottom: '10px'
          }}
        >
          📷 QRコードを読み取る（乗船開始）
        </button>

        <button
          onClick={onClose}
          style={{ width: '100%', padding: '8px', background: '#f1f5f9', border: 'none', borderRadius: '8px', color: '#64748b', cursor: 'pointer' }}
        >
          キャンセル
        </button>
      </div>
    </div>
  );
}