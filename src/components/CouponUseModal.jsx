// src/components/CouponUseModal.jsx
import React, { useState, useEffect, useRef } from 'react';

export default function CouponUseModal({ isOpen, onClose, coupon }) {
  const [sliderPos, setSliderPos] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [isUsed, setIsUsed] = useState(false);
  const [timeLeft, setTimeLeft] = useState(300); // 5分 = 300秒
  const startXRef = useRef(0);
  const storageKey = coupon ? `tw_coupon_used_${coupon.id}` : '';

  useEffect(() => {
    if (!isOpen || !coupon) return;

    const savedEndTime = localStorage.getItem(storageKey);
    if (savedEndTime) {
      const remainingSeconds = Math.floor((parseInt(savedEndTime, 10) - Date.now()) / 1000);
      if (remainingSeconds > 0) {
        setIsUsed(true);
        setTimeLeft(remainingSeconds);
      } else {
        localStorage.removeItem(storageKey);
        setIsUsed(false);
      }
    } else {
      setIsUsed(false);
      setSliderPos(0);
    }
  }, [isOpen, coupon, storageKey]);

  useEffect(() => {
    if (!isUsed || timeLeft <= 0) return;

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isUsed, timeLeft]);

  if (!isOpen || !coupon) return null;

  const handleStart = (e) => {
    if (isUsed) return;
    setIsDragging(true);
    startXRef.current = e.touches ? e.touches[0].clientX : e.clientX;
  };

  const handleMove = (e) => {
    if (!isDragging || isUsed) return;
    const currentX = e.touches ? e.touches[0].clientX : e.clientX;
    const diff = currentX - startXRef.current;
    const newPos = Math.max(0, Math.min(100, (diff / 200) * 100));
    setSliderPos(newPos);

    if (newPos > 85) {
      completeRedemption();
    }
  };

  const handleEnd = () => {
    if (isUsed) return;
    setIsDragging(false);
    if (sliderPos <= 85) setSliderPos(0);
  };

  const completeRedemption = () => {
    const endTime = Date.now() + 5 * 60 * 1000;
    localStorage.setItem(storageKey, endTime.toString());
    setIsUsed(true);
    setTimeLeft(300);
    setSliderPos(100);
    setIsDragging(false);
  };

  const formatTime = (seconds) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  return (
    <div className="aquatic-modal-overlay" onClick={onClose} style={{ zIndex: 10000 }}>
      <style>{`
        .coupon-use-card {
          width: 100%; max-width: 320px; background: #fff;
          border-radius: 20px; overflow: hidden; text-align: center;
          box-shadow: 0 20px 40px rgba(0,0,0,0.4);
        }
        .coupon-use-header { background: #0284c7; color: white; padding: 16px; font-weight: 800; }
        .coupon-use-body { padding: 20px; }
        .swipe-track {
          position: relative; width: 100%; height: 54px; background: #e2e8f0;
          border-radius: 27px; overflow: hidden; display: flex; align-items: center;
          justify-content: center; user-select: none; touch-action: none;
        }
        .swipe-thumb {
          position: absolute; left: 4px; top: 3px; width: 48px; height: 48px;
          background: #0284c7; border-radius: 50%; display: flex; align-items: center;
          justify-content: center; color: white; font-weight: 800; cursor: grab;
        }
        .used-alert-box {
          background: #fef2f2; border: 2px dashed #ef4444; border-radius: 12px; padding: 16px;
        }
        .timer-val { font-size: 32px; font-weight: 900; color: #dc2626; font-family: monospace; }
      `}</style>

      <div className="coupon-use-card" onClick={(e) => e.stopPropagation()}>
        <div className="coupon-use-header">
          {isUsed ? '店員に見せてください' : 'クーポン消し込み'}
        </div>

        <div className="coupon-use-body">
          <h3 style={{ margin: '0 0 8px 0', fontSize: '18px', color: '#0f172a' }}>{coupon.title}</h3>
          <p style={{ margin: '0 0 20px 0', fontSize: '12px', color: '#64748b' }}>
            {isUsed ? '以下のタイマーが動いている画面をスタッフに提示してください' : 'お会計時に店員の前でスワイプしてください'}
          </p>

          {!isUsed ? (
            <div
              className="swipe-track"
              onTouchStart={handleStart}
              onTouchMove={handleMove}
              onTouchEnd={handleEnd}
              onMouseDown={handleStart}
              onMouseMove={handleMove}
              onMouseUp={handleEnd}
            >
              <span style={{ fontSize: '12px', fontWeight: 'bold', color: '#64748b' }}>右へスワイプして使用 ➔</span>
              <div className="swipe-thumb" style={{ left: `calc(${sliderPos}% * 0.78 + 4px)` }}>➔</div>
            </div>
          ) : (
            <div className="used-alert-box">
              <div style={{ color: '#ef4444', fontWeight: 'bold', fontSize: '14px', marginBottom: '4px' }}>⚠️ 使用済み（画面キャプチャ無効）</div>
              <div className="timer-val">{formatTime(timeLeft)}</div>
              <p style={{ margin: '8px 0 0 0', fontSize: '10px', color: '#991b1b' }}>5分経過後に自動で無効化されます</p>
            </div>
          )}

          <button
            onClick={onClose}
            style={{ marginTop: '20px', width: '100%', padding: '10px', background: '#f1f5f9', border: 'none', borderRadius: '8px', fontWeight: 'bold', color: '#475569', cursor: 'pointer' }}
          >
            閉じる
          </button>
        </div>
      </div>
    </div>
  );
}