import React, { useEffect, useRef, useState } from 'react';
import { SPOTS_DATA } from '../constants/spots';
import { UkiyoePlaceholder } from './CardPackModal';

const styles = `
.ency-mode{flex:none;min-height:42px;padding:0 16px;border:1px solid #7dd3fc;border-radius:999px;background:linear-gradient(135deg,#0284c7,#0ea5e9);color:#fff!important;font-size:13px;font-weight:800;white-space:nowrap;cursor:pointer;box-shadow:0 4px 12px #0284c733;touch-action:manipulation;position:relative;z-index:21}.ency-mode:hover{background:#0369a1}.ency-mode:active{transform:scale(.97)}
.ency-shell{height:min(94vh,900px);display:flex;flex-direction:column;overflow:hidden}.ency-head{position:sticky;top:0;z-index:20;flex:none;margin:-22px -22px 0;padding:12px 16px;background:rgba(240,249,255,.97);box-shadow:0 8px 14px #07598512}.ency-grid{flex:1;min-height:0;overflow-y:auto;overscroll-behavior:contain;align-content:start;padding:16px 2px 3px;scrollbar-gutter:stable}
.ency-overlay{position:fixed;inset:48px 0 82px;z-index:9990;background:rgba(8,35,52,.88);backdrop-filter:blur(8px);display:flex;align-items:center;justify-content:center;padding:14px;overflow:hidden}
.ency-shell{width:min(100%,820px);height:min(94vh,900px);max-height:100%;display:flex;flex-direction:column;overflow:hidden;position:relative;border-radius:22px;background:#f0f9ff;padding:22px;box-shadow:0 24px 70px #0008;box-sizing:border-box}
.ency-head{position:sticky;top:0;z-index:20;flex:none;display:flex;align-items:center;justify-content:space-between;gap:12px;margin:-22px -22px 0;padding:12px 16px;background:rgba(240,249,255,.97);backdrop-filter:blur(12px);border-radius:22px 22px 0 0;box-shadow:0 8px 14px #07598512}.ency-head h2{margin:0;color:#075985!important;font-size:22px}
.ency-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:14px}.ency-tile{min-width:0;padding:0;border:1px solid #bae6fd;border-radius:14px;background:linear-gradient(160deg,#fff,#f0f9ff);text-align:center;cursor:pointer;transition:transform .2s,box-shadow .2s;overflow:visible;display:flex;flex-direction:column;box-shadow:0 2px 8px #0369a112}.ency-tile:hover{transform:translateY(-3px);box-shadow:0 8px 22px #0369a122}.ency-grid .ency-art{display:block;flex:none;width:100%;aspect-ratio:4/5;min-height:0;overflow:visible;border-radius:13px 13px 0 0;background:#e0f2fe}.ency-grid .ency-art .ukiyoe-placeholder{width:100%;height:100%;overflow:visible;border-radius:13px 13px 0 0;background-size:cover}.ency-grid .ency-art .ukiyoe-placeholder svg{width:100%;height:100%;object-fit:contain}.ency-title{flex:none;min-height:42px;display:flex;align-items:center;justify-content:center;padding:7px 8px;box-sizing:border-box;border-radius:0 0 13px 13px;background:#f0f9ff;color:#0c4a6e!important;font-size:12px;line-height:1.3;overflow-wrap:anywhere}.ency-tile.locked{background:#f1f5f9;border-color:#cbd5e1;box-shadow:none;cursor:default}.ency-grid .ency-tile.locked .ency-art{display:grid;place-items:center;background:#e2e8f0}.ency-lock-visual{display:grid;place-items:center;gap:5px;width:100%;height:100%;color:#94a3b8}.ency-lock-visual svg{width:44%;height:44%;max-width:96px;max-height:96px;filter:drop-shadow(0 2px 2px #64748b22)}.ency-grid .ency-tile.locked .ency-title{background:#f8fafc;color:#64748b!important;font-size:15px;font-weight:700;letter-spacing:.12em}.ency-empty{grid-column:1/-1;padding:36px 16px;text-align:center;border:1px dashed #7dd3fc;border-radius:16px;color:#075985!important;background:#e0f2fe;line-height:1.8}
.ency-detail{position:fixed;inset:0;z-index:9991;background:rgba(8,35,52,.94);display:flex;align-items:center;justify-content:center;padding:18px 18px calc(92px + env(safe-area-inset-bottom));touch-action:pan-y}.ency-detail-panel{width:min(100%,420px);text-align:center;color:#e0f2fe!important;position:relative}.ency-detail-head{display:flex;align-items:center;justify-content:space-between;margin:0 auto 10px;width:min(86vw,330px);color:#fff}.ency-detail-head button{border:0;border-radius:999px;padding:8px 13px;background:#e0f2fe;color:#075985!important;font-weight:700;cursor:pointer}.ency-detail-head span{font-size:13px;color:#e0f2fe!important}
.ency-card-perspective{perspective:1200px;width:min(86vw,330px);height:min(470px,66vh);min-height:370px;margin:0 auto 12px;cursor:pointer}.ency-card-inner{position:relative;width:100%;height:100%;transition:transform .72s cubic-bezier(.2,.75,.2,1);transform-style:preserve-3d}.ency-card-inner.flipped{transform:rotateY(180deg)}.ency-face{position:absolute;inset:0;backface-visibility:hidden;-webkit-backface-visibility:hidden;border-radius:17px;border:1px solid #7dd3fc;background:linear-gradient(160deg,#f0f9ff,#dbeafe);padding:14px;box-shadow:0 22px 60px #0008;display:flex;flex-direction:column;overflow:hidden;box-sizing:border-box}.ency-front{padding:12px}.ency-front .ency-art{flex:1;min-height:0;overflow:hidden;border-radius:11px;background:#bae6fd}.ency-front .ency-art .ukiyoe-placeholder{height:100%!important;min-height:0}.ency-front h3{flex:none;margin:10px 0 0;padding:12px 10px;border-radius:10px;background:rgba(2,132,199,.92);color:#fff!important;font-size:19px;line-height:1.35;box-shadow:0 4px 14px #07598533}.ency-back{transform:rotateY(180deg);text-align:left;justify-content:flex-start;overflow-y:auto;background:linear-gradient(145deg,#f0f9ff,#e0f2fe)}.ency-back h3{margin:0 0 12px;color:#075985!important;text-align:center;font-size:20px}.ency-back .ency-date{padding:10px 12px;border-radius:10px;background:#bae6fd;color:#0c4a6e!important;font-weight:700}.ency-back p{line-height:1.7;font-size:14px;color:#164e63!important;margin:8px 0}.ency-back strong{color:#0369a1!important}.ency-badge{position:absolute;z-index:2;top:13px;right:13px;padding:5px 9px;border-radius:99px;background:linear-gradient(135deg,#0284c7,#38bdf8);color:#fff!important;box-shadow:0 3px 12px #07598555;font-size:11px;font-weight:bold}
.ency-tip{color:#e0f2fe!important;font-size:12px;margin:8px}.ency-nav{display:flex;justify-content:space-between;position:absolute;inset:50% max(0px,calc((100% - 390px)/2)) auto;pointer-events:none}.ency-nav button{pointer-events:auto;width:40px;height:40px;border:0;border-radius:50%;background:#fff;color:#0369a1!important;font-size:20px;box-shadow:0 4px 16px #0003;cursor:pointer}
@media(max-width:480px){.ency-shell{padding:16px}.ency-grid{grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}.ency-title{font-size:11px}.ency-card-perspective{height:min(62vh,440px);min-height:350px}.ency-tile{min-width:0}.ency-nav{inset:48% 0 auto}}
`;

export function EncyclopediaModal({ isOpen, onClose, obtainedCards = {} }) {
  const [selectedId, setSelectedId] = useState(null);
  const [flipped, setFlipped] = useState(false);
  const touchStart = useRef(null);
  useEffect(() => { if (!isOpen) { setSelectedId(null); setFlipped(false); } }, [isOpen]);
  if (!isOpen) return null;

  const owned = SPOTS_DATA.filter(spot => obtainedCards[spot.id]);
  const selected = owned.find(spot => spot.id === selectedId);
  const selectedIndex = owned.findIndex(spot => spot.id === selectedId);
  const move = direction => {
    if (!owned.length) return;
    const next = (selectedIndex + direction + owned.length) % owned.length;
    setSelectedId(owned[next].id);
    setFlipped(false);
  };
  const showList = () => { setSelectedId(null); setFlipped(false); };
  const share = async () => {
    if (!selected) return;
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="600" height="820"><defs><linearGradient id="g" x2="0" y2="1"><stop stop-color="#38bdf8"/><stop offset="1" stop-color="#e0f2fe"/></linearGradient></defs><rect width="600" height="820" rx="36" fill="#f0f9ff"/><rect x="28" y="28" width="544" height="764" rx="24" fill="url(#g)"/><circle cx="450" cy="145" r="65" fill="#7dd3fc"/><path d="M28 510 Q145 470 270 510 T572 504 V792 H28Z" fill="#0284c7"/><text x="300" y="660" text-anchor="middle" font-size="42" fill="#fff">${selected.name}</text></svg>`;
    const blob = new Blob([svg], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = `suito-card-${selected.id}.svg`; a.click();
    URL.revokeObjectURL(url);
    if (navigator.share && navigator.canShare) {
      try { const file = new File([blob], `suito-card-${selected.id}.svg`, { type: 'image/svg+xml' }); if (navigator.canShare({ files: [file] })) await navigator.share({ title: selected.name, files: [file] }); } catch { /* Share may be dismissed. */ }
    }
  };

  return <>
    <style>{styles}</style>
    <div className="ency-overlay" role="dialog" aria-modal="true" aria-label="水都の歴史図鑑">
      <div className="ency-shell">
        <div className="ency-head"><h2>水都・歴史図鑑 <small style={{fontSize:13,color:'#0284c7'}}> {owned.length}/{SPOTS_DATA.length}</small></h2><button className="ency-mode" onClick={() => { if (owned.length) { setSelectedId(owned[0].id); setFlipped(false); } }} aria-label="カードを1枚ずつめくる" title="カード閲覧">カード閲覧</button></div>
        <div className="ency-grid">
          {SPOTS_DATA.map(spot => {
            const isOwned = Boolean(obtainedCards[spot.id]);
            return <button key={spot.id} className={`ency-tile${isOwned ? '' : ' locked'}`} disabled={!isOwned} onClick={() => { setSelectedId(spot.id); setFlipped(false); }} aria-label={isOwned ? spot.name : '未獲得'}>
              <div className="ency-art">{isOwned ? <UkiyoePlaceholder spot={spot}/> : <div className="ency-lock-visual" aria-hidden="true"><svg viewBox="0 0 120 120" focusable="false"><circle cx="60" cy="39" r="23" fill="currentColor"/><path d="M17 112c2-28 18-43 43-43s41 15 43 43" fill="currentColor"/><path d="M0 116h120" stroke="#cbd5e1" strokeWidth="8"/></svg></div>}</div><strong className="ency-title">{isOwned ? spot.name : '？？？'}</strong>
            </button>;
          })}        </div>
      </div>
    </div>
    {selected && <div className="ency-detail" onTouchStart={e => { touchStart.current = e.touches[0].clientX; }} onTouchEnd={e => { if (touchStart.current == null) return; const dx = e.changedTouches[0].clientX - touchStart.current; if (Math.abs(dx) > 55) move(dx < 0 ? 1 : -1); touchStart.current = null; }} onMouseDown={e => { touchStart.current = e.clientX; }} onMouseUp={e => { if (touchStart.current == null) return; const dx = e.clientX - touchStart.current; if (Math.abs(dx) > 70) move(dx < 0 ? 1 : -1); touchStart.current = null; }}>
      <div className="ency-detail-panel">
        <div className="ency-detail-head"><button onClick={showList} aria-label="一覧に戻る">× 一覧に戻る</button><span>{selectedIndex + 1} / {owned.length}</span></div>
        <div className="ency-card-perspective" onClick={() => setFlipped(value => !value)} role="button" aria-label="カードを裏返す">
          <div className={`ency-card-inner ${flipped ? 'flipped' : ''}`}>
            <div className="ency-face ency-front"><div className="ency-art"><UkiyoePlaceholder spot={selected}/></div><h3>{selected.name}</h3>{obtainedCards[selected.id]?.isBuddyClear && <span className="ency-badge">ペア達成</span>}</div>
            <div className="ency-face ency-back"><h3>{selected.name}</h3><p className="ency-date">ゲットした日：{obtainedCards[selected.id]?.obtainedAt || '日付不明'}</p><p><strong>江戸時代の呼び名</strong><br/>{selected.edoName || '—'}</p><p><strong>場所の解説</strong><br/>{selected.desc}</p><p><strong>豆知識</strong><br/>{selected.trivia || '—'}</p></div>
          </div>
        </div>
        <p className="ency-tip">カードをタップで裏返す・左右にスワイプでカードを切り替え</p>
        <button onClick={share} style={{border:0,borderRadius:99,padding:'10px 17px',background:'#0284c7',color:'#fff',fontWeight:700,cursor:'pointer'}}>画像を保存・共有</button>
      </div>
      <div className="ency-nav"><button aria-label="前のカード" onClick={e => {e.stopPropagation();move(-1);}}>‹</button><button aria-label="次のカード" onClick={e => {e.stopPropagation();move(1);}}>›</button></div>
    </div>}
  </>;
}
