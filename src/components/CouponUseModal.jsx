import React, { useState, useEffect, useRef } from 'react';

export default function CouponUseModal({ isOpen, onClose, coupon }) {
  const [sliderPos, setSliderPos] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [isUsed, setIsUsed] = useState(false);
  const [timeLeft, setTimeLeft] = useState(300);
  const startXRef = useRef(0);
  const storageKey = coupon ? `tw_coupon_used_${coupon.id}` : '';
  const usedAtKey = coupon ? `tw_coupon_used_at_${coupon.id}` : '';
  const usedAt = usedAtKey ? localStorage.getItem(usedAtKey) : null;

  useEffect(() => {
    if (!isOpen || !coupon) return;
    const savedEndTime = localStorage.getItem(storageKey);
    if (savedEndTime) {
      const remainingSeconds = Math.floor((parseInt(savedEndTime, 10) - Date.now()) / 1000);
      if (remainingSeconds > 0) { setIsUsed(true); setTimeLeft(remainingSeconds); }
      else { localStorage.removeItem(storageKey); setIsUsed(false); setSliderPos(0); }
    } else { setIsUsed(false); setSliderPos(0); }
  }, [isOpen, coupon, storageKey]);

  useEffect(() => {
    if (!isUsed || timeLeft <= 0) return;
    const timer = setInterval(() => setTimeLeft(previous => Math.max(0, previous - 1)), 1000);
    return () => clearInterval(timer);
  }, [isUsed, timeLeft]);

  if (!isOpen || !coupon) return null;

  const completeRedemption = () => {
    localStorage.setItem(storageKey, String(Date.now() + 5 * 60 * 1000));
    setIsUsed(true); setTimeLeft(300); setSliderPos(100); setIsDragging(false);
  };
  const handleStart = event => {
    if (isUsed) return;
    setIsDragging(true);
    startXRef.current = event.touches ? event.touches[0].clientX : event.clientX;
  };
  const handleMove = event => {
    if (!isDragging || isUsed) return;
    const currentX = event.touches ? event.touches[0].clientX : event.clientX;
    const position = Math.max(0, Math.min(100, ((currentX - startXRef.current) / 200) * 100));
    setSliderPos(position);
    if (position > 85) completeRedemption();
  };
  const handleEnd = () => { if (!isUsed) { setIsDragging(false); if (sliderPos <= 85) setSliderPos(0); } };
  const formatTime = seconds => `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;

  return <div className="aquatic-modal-overlay" onClick={onClose} style={{zIndex:10000}}>
    <style>{`.coupon-use-card{width:calc(100% - 32px);max-width:370px;position:relative;overflow:hidden;text-align:center;border:1px solid rgba(255,255,255,.88);border-radius:26px;background:linear-gradient(155deg,rgba(255,255,255,.92),rgba(240,249,255,.78));backdrop-filter:blur(24px);-webkit-backdrop-filter:blur(24px);box-shadow:0 28px 75px rgba(8,35,52,.42),inset 0 1px 0 #fff}.coupon-use-header{padding:20px;background:linear-gradient(120deg,rgba(2,132,199,.96),rgba(14,165,233,.9));color:#fff;font-size:15px;font-weight:800;letter-spacing:.05em;box-shadow:inset 0 1px 0 #ffffff88}.coupon-use-body{padding:22px}.coupon-ticket-stub{height:1px;margin:18px -22px;border-top:2px dashed #bae6fd;position:relative}.coupon-ticket-stub:before,.coupon-ticket-stub:after{content:'';position:absolute;top:-10px;width:18px;height:18px;border-radius:50%;background:#c9ecfa}.coupon-ticket-stub:before{left:-9px}.coupon-ticket-stub:after{right:-9px}.swipe-track{position:relative;width:100%;height:58px;background:#e0f2fe;border:1px solid #bae6fd;border-radius:99px;overflow:hidden;display:flex;align-items:center;justify-content:center;user-select:none;touch-action:none}.swipe-track:before{content:'';position:absolute;inset:0 auto 0 0;width:calc(var(--slider,0)*1%);background:linear-gradient(90deg,#bae6fd,#7dd3fc)}.swipe-thumb{position:absolute;left:4px;top:4px;width:48px;height:48px;background:linear-gradient(135deg,#0284c7,#0ea5e9);border-radius:50%;display:flex;align-items:center;justify-content:center;color:white;font-weight:900;box-shadow:0 3px 9px #0369a155;cursor:grab;z-index:1}.swipe-instruction{position:relative;z-index:0;font-size:12px;font-weight:800;color:#0369a1}.used-alert-box{background:#e0f2fe;border:1px dashed #0284c7;border-radius:16px;padding:16px}.timer-val{font-size:34px;font-weight:900;color:#0369a1;font-family:monospace}.coupon-close{margin-top:20px;width:100%;padding:12px;background:#e0f2fe;border:0;border-radius:12px;font-weight:800;color:#0369a1;cursor:pointer;transition:transform .18s,background .18s}.coupon-close:hover{background:#bae6fd}.coupon-close:active{transform:scale(.98)}`}</style>
    <div className="coupon-use-card" onClick={event=>event.stopPropagation()}>
      <div className="coupon-use-header">{isUsed?'店舗スタッフに画面を提示してください':'クーポンを利用する'}</div>
      <div className="coupon-use-body">
        <h3 style={{margin:'0 0 8px',fontSize:19,color:'#0c4a6e'}}>{coupon.title}</h3>
        <p style={{margin:0,fontSize:13,color:'#64748b',lineHeight:1.6}}>{isUsed?'下のタイマーが動いている画面をスタッフに提示してください':'お会計時に店舗スタッフの前でスワイプしてください'}</p>
        <div className="coupon-ticket-stub" />
        {!isUsed ? <div className="swipe-track" onTouchStart={handleStart} onTouchMove={handleMove} onTouchEnd={handleEnd} onMouseDown={handleStart} onMouseMove={handleMove} onMouseUp={handleEnd} onMouseLeave={handleEnd}>
          <span className="swipe-instruction">右へスワイプして使用</span><div className="swipe-thumb" style={{left:`calc(${sliderPos}% * 0.78 + 4px)`}}>››</div>
        </div> : <div className="used-alert-box"><div style={{color:'#0369a1',fontWeight:800,fontSize:14,marginBottom:4}}>✓ 使用中・画面提示用</div><div className="timer-val">{formatTime(timeLeft)}</div><p style={{margin:'8px 0 0',fontSize:11,color:'#475569'}}>5分経過後に自動で無効になります</p></div>}
        <button className="coupon-close" onClick={onClose}>閉じる</button>
      </div>
    </div>
  </div>;
}
