import React, { useState } from 'react';
import { SPOTS_DATA } from '../constants/spots';

export function EncyclopediaModal({ isOpen, onClose }) {
  const [currentPage, setCurrentPage] = useState(0);
  const [isFlipping, setIsFlipping] = useState(false);
  const [flipDirection, setFlipDirection] = useState('next');

  if (!isOpen) return null;

  const totalPages = SPOTS_DATA.length;
  const spot = SPOTS_DATA[currentPage];

  const handleNext = () => {
    if (currentPage < totalPages - 1 && !isFlipping) {
      setFlipDirection('next');
      setIsFlipping(true);
      setTimeout(() => {
        setCurrentPage((prev) => prev + 1);
        setIsFlipping(false);
      }, 750);
    }
  };

  const handlePrev = () => {
    if (currentPage > 0 && !isFlipping) {
      setFlipDirection('prev');
      setIsFlipping(true);
      setTimeout(() => {
        setCurrentPage((prev) => prev - 1);
        setIsFlipping(false);
      }, 750);
    }
  };

  return (
    <div className="encyclopedia-overlay" onClick={onClose}>
      <style>{`
        /* 📖 モーダル背景 */
        .encyclopedia-overlay {
          position: fixed;
          inset: 0;
          background: rgba(10, 15, 25, 0.82);
          backdrop-filter: blur(10px);
          z-index: 9999;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 16px;
        }

        /* 3D本のコンテナ */
        .book-container {
          position: relative;
          width: 100%;
          max-width: 380px;
          height: 540px;
          perspective: 1600px;
          user-select: none;
        }

        /* 本の外枠・表紙の厚み */
        .book-base {
          position: absolute;
          inset: 0;
          background: #1e293b; /* 本の表紙（レザー調のダークグラデーション） */
          border-radius: 8px 14px 14px 8px;
          box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.85),
                      0 0 0 1px rgba(255, 255, 255, 0.1);
          padding: 3px 4px 4px 3px;
        }

        /* 📖 開いた見開き本の紙面構造 */
        .open-book-spread {
          position: relative;
          width: 100%;
          height: 100%;
          display: flex;
          border-radius: 6px 12px 12px 6px;
          overflow: hidden;
          background: #ffffff;
        }

        /* 📄 1. 左ページのチラ見えエリア（影になった左側の紙） */
        .left-page-peek {
          width: 36px;
          height: 100%;
          background: linear-gradient(to left, #e2e8f0 0%, #cbd5e1 100%);
          position: relative;
          flex-shrink: 0;
          border-right: 1px solid rgba(0, 0, 0, 0.08);
        }

        /* 左ページのダミー行テキスト（見切れの雰囲気演出） */
        .left-page-peek::after {
          content: '';
          position: absolute;
          top: 40px;
          left: 8px;
          right: 8px;
          bottom: 40px;
          background: repeating-linear-gradient(
            to bottom,
            rgba(100, 116, 139, 0.2) 0px,
            rgba(100, 116, 139, 0.2) 2px,
            transparent 2px,
            transparent 12px
          );
        }

        /* 📕 2. 本の中央（ノド・本の谷間）の立体溝影 */
        .book-spine {
          position: absolute;
          left: 36px;
          top: 0;
          bottom: 0;
          width: 20px;
          background: linear-gradient(to right, 
            rgba(0, 0, 0, 0.35) 0%, 
            rgba(0, 0, 0, 0.15) 30%, 
            rgba(0, 0, 0, 0.03) 70%,
            rgba(0, 0, 0, 0) 100%
          );
          pointer-events: none;
          z-index: 20;
        }

        /* 📄 3. 右ページ（メインコンテンツ表示部） */
        .right-page-main {
          flex: 1;
          height: 100%;
          background: #ffffff;
          display: flex;
          flex-direction: column;
          position: relative;
          box-shadow: inset -6px 0 12px rgba(0, 0, 0, 0.03);
        }

        /* 🌀 動的ドロップシャドウ（めくられる紙が右ページに落とす影） */
        .under-page-shadow {
          position: absolute;
          inset: 0;
          pointer-events: none;
          z-index: 15;
          will-change: opacity, background;
        }

        .under-page-shadow.anim-next {
          animation: underShadowNext 0.75s cubic-bezier(0.4, 0.0, 0.2, 1) forwards;
        }

        .under-page-shadow.anim-prev {
          animation: underShadowPrev 0.75s cubic-bezier(0.4, 0.0, 0.2, 1) forwards;
        }

        @keyframes underShadowNext {
          0% { background: linear-gradient(to left, rgba(0,0,0,0.2) 0%, rgba(0,0,0,0) 40%); opacity: 0; }
          40% { background: linear-gradient(to left, rgba(0,0,0,0.4) 0%, rgba(0,0,0,0) 70%); opacity: 1; }
          100% { background: linear-gradient(to right, rgba(0,0,0,0.2) 0%, rgba(0,0,0,0) 40%); opacity: 0; }
        }

        @keyframes underShadowPrev {
          0% { background: linear-gradient(to right, rgba(0,0,0,0.2) 0%, rgba(0,0,0,0) 40%); opacity: 0; }
          40% { background: linear-gradient(to right, rgba(0,0,0,0.4) 0%, rgba(0,0,0,0) 70%); opacity: 1; }
          100% { background: linear-gradient(to left, rgba(0,0,0,0.2) 0%, rgba(0,0,0,0) 40%); opacity: 0; }
        }

        /* 🌀 3Dめくり紙シート（ノドの位置＝left: 36px を回転軸に設定） */
        .flipping-sheet-3d {
          position: absolute;
          top: 3px;
          bottom: 4px;
          right: 4px;
          left: 39px; /* ノドの位置に正確に合わせる */
          transform-origin: left center;
          transform-style: preserve-3d;
          pointer-events: none;
          z-index: 30;
          will-change: transform;
        }

        .flipping-sheet-3d.anim-next {
          animation: smoothPageTurnNext 0.75s cubic-bezier(0.33, 1, 0.68, 1) forwards;
        }

        .flipping-sheet-3d.anim-prev {
          transform-origin: right center;
          left: 39px;
          right: 4px;
          animation: smoothPageTurnPrev 0.75s cubic-bezier(0.33, 1, 0.68, 1) forwards;
        }

        /* 紙の表裏 */
        .paper-face {
          position: absolute;
          inset: 0;
          background: #ffffff;
          border-radius: 2px 10px 10px 2px;
          backface-visibility: hidden;
          overflow: hidden;
          box-shadow: 0 4px 12px rgba(0,0,0,0.08);
        }

        .paper-face-front {
          transform: rotateY(0deg);
        }

        .paper-face-back {
          transform: rotateY(180deg);
          background: #f1f5f9;
          border-radius: 10px 2px 2px 10px;
        }

        /* 光と影のカールエフェクト */
        .curl-overlay {
          position: absolute;
          inset: 0;
          pointer-events: none;
          background: linear-gradient(
            90deg, 
            rgba(255,255,255,0) 0%, 
            rgba(0,0,0,0.05) 20%, 
            rgba(255,255,255,0.7) 45%, 
            rgba(0,0,0,0.18) 70%, 
            rgba(0,0,0,0) 100%
          );
          background-size: 200% 100%;
          animation: curlShadingSmooth 0.75s cubic-bezier(0.33, 1, 0.68, 1) forwards;
          will-change: background-position;
        }

        @keyframes curlShadingSmooth {
          0% { background-position: 120% 0; }
          100% { background-position: -120% 0; }
        }

        /* 3D旋回＆撓みモーション */
        @keyframes smoothPageTurnNext {
          0% { transform: translate3d(0, 0, 0) rotateY(0deg) skewY(0deg); }
          25% { transform: translate3d(-6px, -4px, 30px) rotateY(-45deg) skewY(-3deg); }
          50% { transform: translate3d(-12px, -8px, 45px) rotateY(-90deg) skewY(-1deg); }
          75% { transform: translate3d(-6px, -3px, 20px) rotateY(-135deg) skewY(2deg); }
          100% { transform: translate3d(0, 0, 0) rotateY(-180deg) skewY(0deg); }
        }

        @keyframes smoothPageTurnPrev {
          0% { transform: translate3d(0, 0, 0) rotateY(0deg) skewY(0deg); }
          25% { transform: translate3d(6px, -4px, 30px) rotateY(45deg) skewY(3deg); }
          50% { transform: translate3d(12px, -8px, 45px) rotateY(90deg) skewY(1deg); }
          75% { transform: translate3d(6px, -3px, 20px) rotateY(135deg) skewY(-2deg); }
          100% { transform: translate3d(0, 0, 0) rotateY(180deg) skewY(0deg); }
        }

        /* レイアウト部 */
        .book-header {
          padding: 16px 16px 12px 20px;
          border-bottom: 1px solid #f1f5f9;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .book-title {
          font-size: 14px;
          font-weight: 700;
          color: #0f172a;
          display: flex;
          align-items: center;
          gap: 6px;
        }

        .book-close-btn {
          background: #f1f5f9;
          border: none;
          width: 28px;
          height: 28px;
          border-radius: 50%;
          color: #64748b;
          font-size: 14px;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .book-body {
          padding: 20px 20px 20px 24px;
          flex: 1;
          display: flex;
          flex-direction: column;
          gap: 16px;
          overflow-y: auto;
        }

        .spot-badge {
          display: inline-block;
          align-self: flex-start;
          padding: 4px 10px;
          background: #eff6ff;
          color: #2563eb;
          border-radius: 12px;
          font-size: 11px;
          font-weight: 700;
        }

        .spot-name {
          font-size: 22px;
          font-weight: 800;
          color: #1e293b;
          margin: 0;
          line-height: 1.3;
        }

        .spot-desc {
          font-size: 13px;
          line-height: 1.7;
          color: #475569;
          background: #f8fafc;
          padding: 14px;
          border-radius: 8px;
          border: 1px solid #e2e8f0;
        }

        .book-footer {
          padding: 12px 16px 14px 20px;
          border-top: 1px solid #f1f5f9;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .page-btn {
          padding: 8px 14px;
          background: #0284c7;
          color: white;
          border: none;
          border-radius: 6px;
          font-weight: 700;
          font-size: 12px;
          cursor: pointer;
        }

        .page-btn:disabled {
          background: #cbd5e1;
          cursor: not-allowed;
        }

        .page-num {
          font-size: 12px;
          color: #64748b;
          font-weight: 600;
        }
      `}</style>

      <div className="book-container" onClick={(e) => e.stopPropagation()}>
        <div className="book-base">
          <div className="open-book-spread">
            {/* 1. チラ見えする左ページ */}
            <div className="left-page-peek" />

            {/* 2. 本の中央（ノド）の立体影 */}
            <div className="book-spine" />

            {/* 3. メイン表示の右ページ */}
            <div className="right-page-main">
              <div className="book-header">
                <span className="book-title">📘 水の都ガイドブック</span>
                <button className="book-close-btn" onClick={onClose}>✕</button>
              </div>

              <div className="book-body">
                <span className="spot-badge">SPOT #{spot.id}</span>
                <h2 className="spot-name">{spot.name}</h2>
                <div className="spot-desc">
                  {spot.desc || 'このスポットの詳しい歴史や魅力がここに記載されます。現地を訪れて探索を進めましょう！'}
                </div>
              </div>

              <div className="book-footer">
                <button 
                  className="page-btn" 
                  onClick={handlePrev} 
                  disabled={currentPage === 0 || isFlipping}
                >
                  ◀ 前のページ
                </button>

                <span className="page-num">
                  {currentPage + 1} / {totalPages}
                </span>

                <button 
                  className="page-btn" 
                  onClick={handleNext} 
                  disabled={currentPage === totalPages - 1 || isFlipping}
                >
                  次のページ ▶
                </button>
              </div>

              {/* 下の固定ページに落ちる動的な影 */}
              {isFlipping && (
                <div className={`under-page-shadow ${flipDirection === 'next' ? 'anim-next' : 'anim-prev'}`} />
              )}
            </div>
          </div>
        </div>

        {/* 3Dめくりシート（回転軸をノドの境目にジャスト配置） */}
        {isFlipping && (
          <div className={`flipping-sheet-3d ${flipDirection === 'next' ? 'anim-next' : 'anim-prev'}`}>
            <div className="paper-face paper-face-front">
              <div className="curl-overlay" />
            </div>
            <div className="paper-face paper-face-back">
              <div className="curl-overlay" />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}