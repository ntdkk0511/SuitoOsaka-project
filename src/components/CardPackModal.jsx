import React, { useRef, useState } from 'react';
import { motion, useMotionValue, useTransform } from 'framer-motion';

function UkiyoePlaceholder({ spot, className = '', photoStyle, containerStyle }) {
  const [imageFailed, setImageFailed] = useState(false);
  return (
    <div className={`ukiyoe-placeholder ${className}`} style={containerStyle}>
      {!imageFailed && <img className="ukiyoe-photo" style={photoStyle} src={spot.ukiyoeImage} alt={`${spot.name}`} onError={() => setImageFailed(true)} />}
      <svg className={imageFailed ? '' : 'ukiyoe-fallback'} viewBox="0 0 240 300" role="img" aria-label={`${spot.name}の仮イラスト`}>
        <defs><linearGradient id="ukiyoe-sky" x2="0" y2="1"><stop stopColor="#bae6fd"/><stop offset="1" stopColor="#e0f2fe"/></linearGradient></defs>
        <rect width="240" height="300" fill="url(#ukiyoe-sky)"/><circle cx="179" cy="62" r="26" fill="#d78c61" opacity=".8"/>
        <path d="M0 194 Q45 170 88 192 T174 188 T240 191 V300 H0Z" fill="#38bdf8"/><path d="M0 222 Q58 204 112 222 T240 220 V300 H0Z" fill="#0284c7"/>
        <path d="M26 185 L44 115 62 185 M152 188 L174 102 198 188" fill="#f8eedc" stroke="#7b5140" strokeWidth="6"/>
        <path d="M12 186 H80 M136 188 H215" stroke="#7b5140" strokeWidth="8"/>
      </svg>
    </div>
  );
}

export default function CardPackModal({ spot, isBuddyClear = false, onComplete, onClose }) {
  const [opened, setOpened] = useState(false);
  const [absorbed, setAbsorbed] = useState(false);
  const [dragged, setDragged] = useState(false);
  const startX = useRef(null);
  const x = useMotionValue(0);
  const rotate = useTransform(x, [-180, 180], [-22, 22]);
  const complete = () => {
    if (opened) return;
    setOpened(true);
    window.setTimeout(() => setAbsorbed(true), 550);
    window.setTimeout(() => onComplete?.(), 1800);
  };
  const handleKey = (event) => { if (event.key === 'ArrowRight' || event.key === ' ') complete(); };

  return (
    <div className="cardpack-overlay" role="dialog" aria-modal="true" aria-label="歴史カードパック">
      <style>{`
        .cardpack-overlay{position:fixed;inset:0;z-index:12000;display:grid;place-items:center;padding:20px;background:rgba(12,31,36,.78);backdrop-filter:blur(8px)}
        .cardpack-scene{position:relative;width:min(92vw,380px);min-height:510px;display:grid;place-items:center;perspective:1000px}
        .cardpack-title{position:absolute;top:0;color:#fff5df!important;text-align:center;font-size:19px;letter-spacing:.12em}
        .cardpack-hint{position:absolute;bottom:13px;color:#fff!important;font-size:13px;text-align:center}
        .pack-body{position:absolute;width:260px;height:340px;border:2px solid #e9c77d;border-radius:18px;background:repeating-linear-gradient(135deg,#9e3f36 0 12px,#a8493c 12px 24px);box-shadow:0 20px 45px #0007;display:grid;place-items:center;color:#fff4d4!important;transition:opacity .35s,transform .35s}
        .pack-body:before{content:'';position:absolute;inset:12px;border:1px solid #f1d995;border-radius:10px}.pack-seal{font-size:27px;text-align:center;line-height:1.8;color:#fff3cf!important}
        .pack-top{position:absolute;z-index:3;top:108px;width:262px;height:84px;touch-action:none;cursor:grab;border:2px solid #f4d58a;border-radius:15px 15px 4px 4px;background:repeating-linear-gradient(135deg,#bb5b45 0 10px,#a8493c 10px 20px);display:grid;place-items:center;color:#fff2cf!important;box-shadow:0 8px 18px #0005}
        .pack-top:after{content:'';position:absolute;bottom:9px;left:14px;right:14px;border-bottom:2px dashed #f8dda0}.pack-top.open{pointer-events:none}
        .pack-card{position:absolute;z-index:2;width:220px;height:315px;padding:10px;border-radius:14px;background:#f8eedc;box-shadow:0 18px 45px #0008;transform-origin:center;display:flex;flex-direction:column;opacity:0;transition:transform 1.2s cubic-bezier(.2,.8,.2,1),opacity .4s}
        .pack-card.reveal{opacity:1;transform:translateY(-28px) scale(1.05)}.pack-card.fly{transform:translate(40vw,40vh) scale(.12) rotate(18deg);opacity:.15}.pack-card h3{font-size:16px;margin:8px 4px;color:#513b30!important;text-align:center}
        .ukiyoe-placeholder{height:250px;overflow:hidden;border-radius:9px;background:linear-gradient(150deg,#bae6fd,#e0f2fe);position:relative}.ukiyoe-placeholder svg{display:block;width:100%;height:100%}.ukiyoe-placeholder .ukiyoe-photo{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;object-position:center}.ukiyoe-placeholder .ukiyoe-fallback{display:none}
        .buddy-badge{display:inline-flex;align-self:center;margin:4px auto;padding:5px 12px;border-radius:999px;background:linear-gradient(90deg,#fff3a5,#f6c94e,#fff3a5);color:#754b11!important;font-size:12px;font-weight:800;box-shadow:0 0 15px #ffe481;animation:buddy-glow 1.4s ease-in-out infinite alternate}
        @keyframes buddy-glow{to{box-shadow:0 0 24px #fff2a1;filter:brightness(1.15)}}
        .pack-close{position:absolute;right:0;top:0;border:0;border-radius:99px;width:38px;height:38px;background:#fff;color:#253d40!important;font-size:20px;cursor:pointer}
      `}</style>
      <div className="cardpack-scene" onKeyDown={handleKey} tabIndex={-1}>
        <button className="pack-close" onClick={onClose} aria-label="閉じる">×</button>
        <h2 className="cardpack-title">水都・歴史カードパック</h2>
        <div className="pack-body" style={{ opacity: opened ? 0 : 1, transform: opened ? 'scale(.8) translateY(40px)' : undefined }}><div className="pack-seal">水都<br/>浪漫帖</div></div>
        <motion.div className={`pack-top ${opened ? 'open' : ''}`} style={{ x, rotate, opacity: opened ? 0 : 1 }}
          drag={!opened ? 'x' : false} dragConstraints={{ left: -220, right: 220 }} dragElastic={0.15}
          onDragStart={(event, info) => { startX.current = info.point.x; setDragged(true); }}
          onDragEnd={(event, info) => { if (Math.abs(info.offset.x) > 70 || Math.abs(info.velocity.x) > 450) complete(); else { x.set(0); setDragged(false); } }}
          onPointerUp={(event) => { if (!dragged && Math.abs(event.clientX - (startX.current ?? event.clientX)) > 70) complete(); }}
          onClick={() => { if (!opened && !dragged) complete(); }}
          aria-label="パック上部を左右にスワイプして開封" role="button" tabIndex={0}>
          切り取り線に沿ってスワイプ
        </motion.div>
        <div className={`pack-card ${opened ? (absorbed ? 'fly' : 'reveal') : ''}`}>
          <UkiyoePlaceholder spot={spot}/><h3>{spot.name}</h3>{isBuddyClear && <span className="buddy-badge">✦ ペア達成 ✦</span>}
        </div>
        <p className="pack-hint">{opened ? '図鑑にカードを登録しました' : '上部を横にスワイプして開封'}</p>
      </div>
    </div>
  );
}

export { UkiyoePlaceholder };
