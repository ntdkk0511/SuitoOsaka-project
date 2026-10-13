// src/components/WaterBusQRModal.jsx
import React, { useEffect, useRef, useState } from 'react';
import { Html5Qrcode } from 'html5-qrcode';

export default function WaterBusQRModal({ isOpen, onClose, onStartCruise }) {
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const scannerRef = useRef(null);

  useEffect(() => {
    if (isOpen && isCameraActive) {
      const html5QrcodeScanner = new Html5Qrcode("qr-reader");
      scannerRef.current = html5QrcodeScanner;

      html5QrcodeScanner.start(
        { facingMode: "environment" },
        { fps: 10, qrbox: { width: 200, height: 200 } },
        (decodedText) => {
          // QRスキャン成功時
          stopScanner();
          onStartCruise(decodedText);
          onClose();
        },
        (errorMessage) => {
          // 読み取り中のフレームエラーは無視
        }
      ).catch((err) => {
        console.error("カメラ起動エラー:", err);
        setErrorMsg("カメラを起動できませんでした。テスト乗船をご利用ください。");
        setIsCameraActive(false);
      });
    }

    return () => {
      stopScanner();
    };
  }, [isOpen, isCameraActive]);

  const stopScanner = () => {
    if (scannerRef.current && scannerRef.current.isScanning) {
      scannerRef.current.stop().then(() => {
        scannerRef.current.clear();
      }).catch(err => console.error(err));
    }
  };

  if (!isOpen) return null;

  return (
    <div className="aquatic-modal-overlay" style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)',
      backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center',
      justifyContent: 'center', zIndex: 10000
    }}>
      <div style={{
        background: '#fff', borderRadius: '20px', padding: '24px',
        width: '320px', textAlign: 'center', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.2)'
      }}>
        <h3 style={{ margin: '0 0 8px 0', fontSize: '18px', color: '#0369a1' }}>
          🚢 水上バスチェックイン
        </h3>
        <p style={{ fontSize: '12px', color: '#64748b', marginBottom: '16px' }}>
          乗船場・船内のQRコードをカメラで読み取って乗船を開始します。
        </p>

        {/* カメラプレビュー表示領域 */}
        {isCameraActive ? (
          <div style={{ marginBottom: '16px' }}>
            <div id="qr-reader" style={{ width: '100%', borderRadius: '12px', overflow: 'hidden' }} />
            <button
              onClick={() => { stopScanner(); setIsCameraActive(false); }}
              style={{
                marginTop: '8px', padding: '6px 12px', background: '#e2e8f0',
                border: 'none', borderRadius: '6px', fontSize: '12px', color: '#475569', cursor: 'pointer'
              }}
            >
              カメラを閉じる
            </button>
          </div>
        ) : (
          <button
            onClick={() => { setErrorMsg(''); setIsCameraActive(true); }}
            style={{
              width: '100%', padding: '12px', background: '#0284c7', color: '#fff',
              border: 'none', borderRadius: '10px', fontWeight: 'bold', cursor: 'pointer', marginBottom: '10px'
            }}
          >
            📷 カメラでQRスキャンを開始
          </button>
        )}

        {errorMsg && (
          <p style={{ fontSize: '11px', color: '#ef4444', margin: '4px 0 10px 0' }}>{errorMsg}</p>
        )}

        {/* 実機なしテスト用ボタン */}
        <button
          onClick={() => { stopScanner(); onStartCruise('TEST_TICKET_001'); onClose(); }}
          style={{
            width: '100%', padding: '10px', background: '#f0f9ff', color: '#0369a1',
            border: '1px dashed #0284c7', borderRadius: '10px', fontWeight: 'bold',
            cursor: 'pointer', marginBottom: '10px', fontSize: '12px'
          }}
        >
          ⚡ 【テスト用】ワンタップで乗船
        </button>

        <button
          onClick={() => { stopScanner(); onClose(); }}
          style={{
            width: '100%', padding: '8px', background: '#f1f5f9', border: 'none',
            borderRadius: '8px', color: '#64748b', cursor: 'pointer', fontSize: '12px'
          }}
        >
          キャンセル
        </button>
      </div>
    </div>
  );
}