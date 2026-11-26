import React from 'react';

export default function Header({ userScore = 0, userName = 'ゲスト', buddyName, onLeaveBuddy }) {
  return (
    <header className="suito-header">
      <div className="suito-brand"><strong>Suito-Time-Walk</strong></div>
      <div className="suito-header-meta">
        {buddyName && <div className="suito-buddy"><span>{buddyName}さんと探索中</span><button onClick={onLeaveBuddy}>解除</button></div>}
        <div className="suito-score" aria-label={`スコア ${userScore}ポイント`}><span aria-hidden="true">✦</span> {userScore} pt</div>
        <div className="suito-user" title={userName}>{userName}</div>
      </div>
      <style>{`.suito-header{position:fixed;top:0;left:0;right:0;height:48px;padding:0 12px;box-sizing:border-box;z-index:9999;display:flex;align-items:center;justify-content:space-between;background:rgba(255,255,255,.88);border-bottom:1px solid rgba(128,207,227,.3);backdrop-filter:blur(14px) saturate(145%);-webkit-backdrop-filter:blur(14px) saturate(145%);box-shadow:0 3px 14px rgba(40,127,155,.08)}.suito-brand{min-width:0;display:flex;align-items:baseline;gap:9px;color:#174b5a;flex:0 1 auto}.suito-brand strong{font-family:Inter,'Noto Sans JP',sans-serif!important;font-size:16px;letter-spacing:.08em;text-transform:none;white-space:nowrap;color:#287f9b!important}.suito-header-meta{display:flex;align-items:center;gap:6px;min-width:0;flex:none}.suito-score{flex:none;padding:5px 8px;border-radius:99px;background:#ddf5fa;color:#287f9b!important;font-size:10px;font-weight:700;white-space:nowrap}.suito-score span{color:#80cfe3!important}.suito-user{max-width:80px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;padding:5px 8px;border-radius:99px;background:#f8f5ee;color:#52727a!important;font-size:10px}.suito-buddy{display:flex;align-items:center;gap:4px;padding:4px 6px;border-radius:99px;background:#ddf5fa;color:#287f9b!important;font-size:9px;white-space:nowrap}.suito-buddy button{border:0;border-radius:99px;background:#fff;color:#287f9b;padding:4px 6px;font-weight:700}@media(max-width:390px){.suito-header{padding:0 8px}.suito-header-meta{gap:4px}.suito-user{max-width:48px}.suito-buddy span{max-width:54px;overflow:hidden;text-overflow:ellipsis}}@media(max-width:340px){.suito-brand strong{font-size:14px;letter-spacing:.04em}.suito-user{max-width:38px}}`}</style>
    </header>
  );
}
