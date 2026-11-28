import React, { useRef, useState } from 'react';
import { motion, useMotionValue, useTransform } from 'framer-motion';

function UkiyoePlaceholder({ spot, className = '', photoStyle, containerStyle }) {
  const [imageFailed, setImageFailed] = useState(false);
  return (
    <div className={`ukiyoe-placeholder ${className}`} style={containerStyle}>
      {!imageFailed && <img className="ukiyoe-photo" style={photoStyle} src={spot.ukiyoeImage} alt={`${spot.name}のイラスト`} onError={() => setImageFailed(true)} />}
      <svg className={imageFailed ? '' : 'ukiyoe-fallback'} viewBox="0 0 240 300" role="img" aria-label={`${spot.name}の水彩風イラスト`}>
        <defs><linearGradient id="ukiyoe-sky" x2="0" y2="1"><stop stopColor="#dff4f5"/><stop offset="1" stopColor="#f7efe1"/></linearGradient></defs>
        <rect width="240" height="300" fill="url(#ukiyoe-sky)"/><circle cx="179" cy="62" r="26" fill="#d99b72" opacity=".7"/>
        <path d="M0 194 Q45 170 88 192 T174 188 T240 191 V300 H0Z" fill="#80cfe3"/><path d="M0 222 Q58 204 112 222 T240 220 V300 H0Z" fill="#287f9b"/>
        <path d="M26 185 L44 115 62 185 M152 188 L174 102 198 188" fill="#f8f5ee" stroke="#795e51" strokeWidth="5"/>
        <path d="M12 186 H80 M136 188 H215" stroke="#795e51" strokeWidth="7"/>
      </svg>
    </div>
  );
}

export default function CardPackModal({ spot, isBuddyClear = false, onComplete, onClose }) {
  const [opened, setOpened] = useState(false);
  const [dragged, setDragged] = useState(false);
  const startX = useRef(null);
  const x = useMotionValue(0);
  const rotate = useTransform(x, [-180, 180], [-18, 18]);
  const cardX = useMotionValue(0);
  const cardRotateY = useTransform(cardX, [-120, 120], [-28, 28]);
  const complete = () => {
    if (opened) return;
    setOpened(true);
  };
  const handleKey = (event) => { if (event.key === 'ArrowRight' || event.key === ' ') complete(); };

  return (
    <div className="cardpack-overlay" role="dialog" aria-modal="true" aria-label="街の記憶を開く">
      <style>{`
        .cardpack-overlay{--water-mist:#ddf5fa;--river-blue:#80cfe3;--deep-water:#287f9b;--paper:#f8f5ee;position:fixed;inset:0;z-index:12000;display:grid;place-items:center;padding:20px;background:radial-gradient(ellipse at 50% 45%,rgba(128,207,227,.28),transparent 46%),rgba(12,43,54,.82);backdrop-filter:blur(12px);-webkit-backdrop-filter:blur(12px);overflow:hidden}
        .cardpack-overlay:before,.cardpack-overlay:after{content:'';position:absolute;left:50%;top:48%;width:230px;height:230px;border:1px solid #dffaff66;border-radius:50%;transform:translate(-50%,-50%);pointer-events:none;animation:water-ring 2.2s ease-out infinite}.cardpack-overlay:after{animation-delay:.8s}.cardpack-scene{position:relative;width:min(92vw,390px);height:min(620px,82vh);display:grid;place-items:center;perspective:1000px;z-index:1}
        .cardpack-title{position:absolute;top:5%;margin:0;color:#f2fbfa!important;text-align:center;font-size:19px;letter-spacing:.12em;font-weight:600}.cardpack-subtitle{position:absolute;top:12%;color:#d9f3f5!important;font-size:12px;letter-spacing:.08em}.cardpack-hint{position:absolute;bottom:3%;color:#e9f8f8!important;font-size:13px;text-align:center}
        .pack-body{position:absolute;width:min(260px,68vw);height:340px;border:1px solid #e4f8f5;border-radius:18px;background:linear-gradient(155deg,#80cfe3,#287f9b);box-shadow:0 24px 65px #001e2c80, inset 0 1px 0 #fff9;display:grid;place-items:center;color:#fff!important;transition:opacity .45s,transform .55s cubic-bezier(.2,.8,.2,1);overflow:hidden}.pack-body:before{content:'';position:absolute;inset:12px;border:1px solid #ffffff80;border-radius:11px}.pack-body:after{content:'';position:absolute;inset:-70% -30%;background:linear-gradient(110deg,transparent 42%,#fff8 50%,transparent 58%);transform:translateX(-65%);animation:water-glint 3.4s ease-in-out infinite}.pack-seal{position:relative;z-index:1;text-align:center;line-height:1.8;letter-spacing:.16em;color:white!important;font-family:'Noto Serif',serif!important}.pack-seal small{display:block;font-size:11px;letter-spacing:.24em;opacity:.85}
        .pack-top{position:absolute;z-index:3;top:21%;width:min(262px,68vw);height:84px;touch-action:none;cursor:grab;border:1px solid #ecfffb;border-radius:15px 15px 5px 5px;background:linear-gradient(135deg,#80cfe3,#3d9eb8);display:grid;place-items:center;color:white!important;box-shadow:0 12px 24px #001e2c66, inset 0 1px 0 #fff9;transition:opacity .3s}.pack-top:after{content:'';position:absolute;bottom:10px;left:16px;right:16px;border-bottom:1px dashed #ffffffb3}.pack-top.open{pointer-events:none}
        .pack-card{position:absolute;z-index:2;width:min(220px,58vw);height:315px;padding:10px;border-radius:12px;background:var(--paper);border:1px solid #fff;box-shadow:0 20px 55px #001e2c77;transform-origin:center;display:flex;flex-direction:column;opacity:0;transition:transform .85s cubic-bezier(.2,.8,.2,1),opacity .35s}.pack-card.reveal{opacity:1;transform:translateY(-24px) scale(1.03);animation:card-watercolor .85s ease-out both}.pack-card.fly{transform:translate(36vw,36vh) scale(.16) rotate(14deg);opacity:0}.pack-card h3{font-size:16px;margin:10px 4px 4px;color:#294b50!important;text-align:center;font-weight:600}.pack-card small{color:#69898a!important;text-align:center;font-size:10px;letter-spacing:.15em}.ukiyoe-placeholder{height:250px;overflow:hidden;border-radius:7px;background:linear-gradient(150deg,#dff4f5,#f8f5ee);position:relative}.ukiyoe-placeholder svg{display:block;width:100%;height:100%}.ukiyoe-placeholder .ukiyoe-photo{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;object-position:center}.ukiyoe-placeholder .ukiyoe-fallback{display:none}
        .buddy-badge{display:inline-flex;align-self:center;margin:4px auto;padding:5px 12px;border-radius:999px;background:#dff4f5;color:#287f9b!important;font-size:11px;font-weight:700}.pack-close{position:absolute;right:0;top:3%;border:1px solid #ffffff66;border-radius:99px;width:44px;height:44px;background:#ffffff1c;color:#fff!important;font-size:22px;cursor:pointer;backdrop-filter:blur(8px)}
        @keyframes water-ring{0%{opacity:.5;transform:translate(-50%,-50%) scale(.55)}100%{opacity:0;transform:translate(-50%,-50%) scale(1.65)}}@keyframes water-glint{0%,20%{transform:translateX(-65%)}70%,100%{transform:translateX(65%)}}@keyframes card-watercolor{0%{filter:blur(5px) saturate(.7);clip-path:inset(48% 12% 48% 12%)}100%{filter:blur(0) saturate(1);clip-path:inset(0)}}
        @media(prefers-reduced-motion:reduce){.cardpack-overlay:before,.cardpack-overlay:after,.pack-body:after,.pack-card.reveal{animation:none!important}}
      `}</style>
      <div className="cardpack-scene" onKeyDown={handleKey} tabIndex={-1}>
        <button className="pack-close" onClick={onClose} aria-label="閉じる">×</button>
        <h2 className="cardpack-title">街の記憶が届きました</h2><p className="cardpack-subtitle">A MEMORY FROM OSAKA</p>
        <div className="pack-body" style={{ opacity: opened ? 0 : 1, transform: opened ? 'scale(.82) translateY(32px)' : undefined }}><div className="pack-seal">SUITO<small>RIVER · CITY · MEMORY</small></div></div>
        <motion.div className={`pack-top ${opened ? 'open' : ''}`} style={{ x, rotate, opacity: opened ? 0 : 1 }} drag={!opened ? 'x' : false} dragConstraints={{ left: -220, right: 220 }} dragElastic={0.15}
          onDragStart={(event, info) => { startX.current = info.point.x; setDragged(true); }}
          onDragEnd={(event, info) => { if (Math.abs(info.offset.x) > 70 || Math.abs(info.velocity.x) > 450) complete(); else { x.set(0); setDragged(false); } }}
          onPointerUp={(event) => { if (!dragged && Math.abs(event.clientX - (startX.current ?? event.clientX)) > 70) complete(); }}
          onClick={() => { if (!opened && !dragged) complete(); }} aria-label="タップまたは左右にスワイプして開く" role="button" tabIndex={0}>水面をひらく</motion.div>
        <motion.div drag={opened ? 'x' : false} dragConstraints={{left:-110,right:110}} dragElastic={0.16} style={{rotateY:cardRotateY,transformStyle:'preserve-3d'}} onDrag={(_, info)=>cardX.set(info.offset.x)} onDragEnd={()=>cardX.set(0)} className={`pack-card ${opened ? 'reveal' : ''}`}>
          <UkiyoePlaceholder spot={spot}/><h3>{spot.name}</h3><small>{spot.englishName}</small>{isBuddyClear && <span className="buddy-badge">一緒に見つけた記憶</span>}
        </motion.div>
        <p className="cardpack-hint">{opened ? '受け取るか、閉じるまでこのカードを表示します' : 'タップ、または左右にスワイプして開く'}</p>
        {opened && <div style={{position:'absolute',bottom:'-9%',display:'flex',gap:10}}><button style={{border:0,borderRadius:999,padding:'11px 18px',fontWeight:800}} onClick={onComplete}>受け取る</button><button style={{border:0,borderRadius:999,padding:'11px 18px',fontWeight:800}} onClick={onClose}>閉じる</button></div>}
      </div>
    </div>
  );
}

export { UkiyoePlaceholder };
