import React, { useRef, useState } from 'react';
import HTMLFlipBook from 'react-pageflip';
import { SPOTS_DATA } from '../constants/spots';

// 📖 ページコンポーネント
const Page = React.forwardRef(({ children, density = 'soft', pageNum, isLeft = false }, ref) => {
  return (
    <div className="page-sheet" ref={ref} data-density={density}>
      <div className={`page-inner ${isLeft ? 'page-left-inner' : 'page-right-inner'}`}>
        {children}
        {pageNum && <div className="page-footer-num">- {pageNum} -</div>}
      </div>
    </div>
  );
});

Page.displayName = 'Page';

export function EncyclopediaModal({ isOpen, onClose }) {
  const bookRef = useRef(null);
  const [currentPage, setCurrentPage] = useState(0);

  if (!isOpen) return null;

  const handleNext = () => {
    if (bookRef.current) {
      bookRef.current.pageFlip().flipNext();
    }
  };

  const handlePrev = () => {
    if (bookRef.current) {
      bookRef.current.pageFlip().flipPrev();
    }
  };

  const onPageChange = (e) => {
    setCurrentPage(e.data);
  };

  return (
    /* 🎯 背景クリックによる閉じる処理を排除（×ボタンでのみ終了） */
    <div className="encyclopedia-overlay">
      <style>{`
        /* 📖 モーダル背景 */
        .encyclopedia-overlay {
          position: fixed;
          inset: 0;
          background: rgba(10, 15, 25, 0.88);
          backdrop-filter: blur(10px);
          z-index: 9999;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 8px;
        }

        .book-modal-container {
          position: relative;
          display: flex;
          flex-direction: column;
          align-items: center;
        }

        /* 📱 画面幅に応じて見開き全体をレスポンシブ縮小 */
        .book-scaler {
          width: 560px;
          height: 420px;
          display: flex;
          justify-content: center;
        }

        @media (max-width: 600px) {
          .book-scaler {
            transform: scale(0.62);
            transform-origin: center center;
            margin: -60px 0;
          }
        }

        @media (max-width: 380px) {
          .book-scaler {
            transform: scale(0.52);
            margin: -80px 0;
          }
        }

        .book-close-btn {
          position: absolute;
          top: -44px;
          right: 0;
          background: rgba(255, 255, 255, 0.2);
          border: none;
          color: white;
          width: 32px;
          height: 32px;
          border-radius: 50%;
          font-size: 16px;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 10;
          transition: background 0.2s;
        }

        .book-close-btn:hover {
          background: rgba(255, 255, 255, 0.4);
        }

        /* 📄 紙の装飾 */
        .page-sheet {
          background-color: #fcfaf7;
          overflow: hidden;
        }

        .page-inner {
          width: 100%;
          height: 100%;
          padding: 20px 18px 30px 18px;
          box-sizing: border-box;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          position: relative;
          border: 1px solid rgba(0, 0, 0, 0.05);
        }

        /* 📕 ノド（中央の立体影） */
        .page-left-inner {
          box-shadow: inset -15px 0 15px -10px rgba(0, 0, 0, 0.12);
        }
        .page-right-inner {
          box-shadow: inset 15px 0 15px -10px rgba(0, 0, 0, 0.12);
        }

        /* 📘 表紙スタイル */
        .cover-page {
          background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%);
          color: #f8fafc;
          border: 2px solid #334155;
          text-align: center;
          display: flex;
          flex-direction: column;
          justify-content: center;
          align-items: center;
          gap: 12px;
        }

        /* 🎨 左ページ：イラスト＆ステータス画面 */
        .spot-visual-box {
          width: 100%;
          height: 160px;
          background: linear-gradient(135deg, #e0f2fe 0%, #bae6fd 100%);
          border-radius: 10px;
          border: 2px dashed #0284c7;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          color: #0369a1;
          margin-top: 8px;
        }

        .spot-badge-left {
          display: inline-block;
          padding: 4px 10px;
          background: #0284c7;
          color: white;
          border-radius: 12px;
          font-size: 11px;
          font-weight: bold;
        }

        .stamp-box {
          margin-top: 12px;
          padding: 8px 12px;
          border: 2px solid #22c55e;
          color: #15803d;
          background: #f0fdf4;
          border-radius: 8px;
          font-size: 11px;
          font-weight: bold;
          display: flex;
          align-items: center;
          gap: 6px;
        }

        /* 📝 右ページ：説明＆クイズ画面 */
        .spot-title-right {
          font-size: 18px;
          font-weight: 800;
          color: #0f172a;
          margin: 4px 0 2px 0;
          line-height: 1.3;
        }

        .spot-en-right {
          font-size: 11px;
          color: #64748b;
          margin-bottom: 10px;
        }

        .spot-desc-box {
          font-size: 12px;
          line-height: 1.6;
          color: #334155;
          background: #ffffff;
          padding: 10px;
          border-radius: 8px;
          border: 1px solid #e2e8f0;
        }

        .quiz-hint-box {
          margin-top: 8px;
          padding: 10px;
          background: #fefce8;
          border-radius: 8px;
          border: 1px solid #fde047;
          font-size: 11px;
          color: #713f12;
        }

        .page-footer-num {
          position: absolute;
          bottom: 8px;
          left: 0;
          right: 0;
          text-align: center;
          font-size: 10px;
          color: #94a3b8;
        }

        /* 画面下のボタン */
        .book-controls {
          display: flex;
          align-items: center;
          gap: 16px;
          margin-top: 12px;
        }

        .ctrl-btn {
          padding: 8px 18px;
          background: #0284c7;
          color: white;
          border: none;
          border-radius: 20px;
          font-size: 12px;
          font-weight: 700;
          cursor: pointer;
        }
      `}</style>

      <div className="book-modal-container">
        {/* 🎯 この×ボタンのみ閉じるアクション（onClose）を実行 */}
        <button className="book-close-btn" onClick={onClose}>✕</button>

        <div className="book-scaler">
          <HTMLFlipBook
            width={280}
            height={420}
            size="fixed"
            minWidth={280}
            maxWidth={280}
            minHeight={420}
            maxHeight={420}
            maxShadowOpacity={0.4}
            showCover={true}
            usePortrait={false}
            mobileScrollSupport={true}
            onFlip={onPageChange}
            ref={bookRef}
          >
            {/* 表紙 */}
            <Page density="hard">
              <div className="cover-page page-inner">
                <div style={{ fontSize: '42px' }}>🚢</div>
                <h1 style={{ fontSize: '20px', color: '#38bdf8', margin: 0 }}>水の都ガイドブック</h1>
                <p style={{ fontSize: '11px', color: '#94a3b8' }}>Suito Time-Walk</p>
                <span style={{ fontSize: '10px', color: '#64748b', marginTop: '20px' }}>
                  ◀ ページをめくって閲覧
                </span>
              </div>
            </Page>

            {/* 各スポットの見開き（左：ビジュアル＆スタンプ / 右：解説＆クイズ） */}
            {SPOTS_DATA.map((spot, index) => [
              /* 🎨 左ページ */
              <Page key={`${spot.id}-left`} pageNum={index * 2 + 1} isLeft={true}>
                <div>
                  <span className="spot-badge-left">SPOT #{spot.id}</span>
                  
                  <div className="spot-visual-box">
                    <div style={{ fontSize: '36px' }}>📍</div>
                    <span style={{ fontSize: '11px', fontWeight: 'bold' }}>MAP SPOT</span>
                  </div>

                  <div className="stamp-box">
                    <span>済</span>
                    <span>訪問達成スタンプ欄</span>
                  </div>
                </div>

                <div style={{ fontSize: '10px', color: '#94a3b8', textAlign: 'center' }}>
                  位置: {spot.lngLat[0]}, {spot.lngLat[1]}
                </div>
              </Page>,

              /* 📝 右ページ */
              <Page key={`${spot.id}-right`} pageNum={index * 2 + 2} isLeft={false}>
                <div>
                  <h2 className="spot-title-right">{spot.name}</h2>
                  <div className="spot-en-right">{spot.englishName}</div>

                  <div className="spot-desc-box">
                    {spot.desc}
                  </div>

                  {spot.quiz && (
                    <div className="quiz-hint-box">
                      <strong>💡 クイズヒント:</strong><br />
                      {spot.quiz.q}
                    </div>
                  )}
                </div>
              </Page>
            ])}

            {/* 裏表紙 */}
            <Page density="hard" isLeft={true}>
              <div className="cover-page page-inner">
                <h2 style={{ fontSize: '18px', color: '#38bdf8' }}>COMPLETE!</h2>
                <p style={{ fontSize: '11px', color: '#94a3b8' }}>
                  すべてのスポットを巡って<br />水の都を制覇しよう！
                </p>
              </div>
            </Page>
          </HTMLFlipBook>
        </div>

        {/* コントロールバー */}
        <div className="book-controls">
          <button className="ctrl-btn" onClick={handlePrev}>◀ 前へ</button>
          <span style={{ color: 'white', fontSize: '12px', fontWeight: 'bold' }}>
            {currentPage === 0 ? '表紙' : `${Math.ceil(currentPage / 2)} / ${SPOTS_DATA.length}`}
          </span>
          <button className="ctrl-btn" onClick={handleNext}>次へ ▶</button>
        </div>
      </div>
    </div>
  );
}