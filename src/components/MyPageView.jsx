import React, { useState } from 'react';

const styles = `
.mypage{max-width:520px;margin:0 auto;padding:20px 16px 30px;display:flex;flex-direction:column;gap:16px;color:#0c4a6e}.mypage .mp-title{letter-spacing:.02em}.mypage .mp-card{background:linear-gradient(145deg,rgba(255,255,255,.78),rgba(240,249,255,.58));border:1px solid rgba(255,255,255,.92);backdrop-filter:blur(18px);-webkit-backdrop-filter:blur(18px);box-shadow:0 12px 30px rgba(3,105,161,.12),inset 0 1px 0 rgba(255,255,255,.95);transition:box-shadow .2s,transform .2s}.mypage .mp-card:hover{box-shadow:0 16px 34px rgba(3,105,161,.16),inset 0 1px 0 #fff}.mypage .mp-stat{background:linear-gradient(145deg,rgba(255,255,255,.84),rgba(224,242,254,.65));border-color:rgba(255,255,255,.95);backdrop-filter:blur(14px);box-shadow:0 7px 18px rgba(3,105,161,.08),inset 0 1px 0 #fff}.mypage .mp-status{background:linear-gradient(130deg,rgba(224,242,254,.95),rgba(186,230,253,.7));box-shadow:inset 0 1px 0 #fff}.mypage .mp-btn{background:linear-gradient(135deg,#0284c7,#0ea5e9)}.mypage .mp-btn.secondary{background:rgba(224,242,254,.88);border:1px solid rgba(125,211,252,.72)}.mypage .mp-input{background:rgba(255,255,255,.88);border-color:rgba(125,211,252,.75)}.mypage .mp-form{background:rgba(240,249,255,.72);backdrop-filter:blur(14px)}
.mypage *{box-sizing:border-box}.mp-title{margin:0;color:#075985;font-size:22px}.mp-card{padding:18px;border:1px solid #bae6fd;border-radius:20px;background:linear-gradient(145deg,rgba(255,255,255,.97),rgba(240,249,255,.94));box-shadow:0 10px 28px #0369a112}
.mp-label{font-size:12px;font-weight:700;color:#64748b}.mp-name-row{display:flex;align-items:center;justify-content:space-between;gap:10px}.mp-name{font-size:20px;font-weight:800;color:#0c4a6e}.mp-stats{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:9px}.mp-stat{padding:13px 7px;border:1px solid #dbeafe;border-radius:15px;background:linear-gradient(145deg,#fff,#f0f9ff);text-align:center}.mp-stat strong{display:block;margin-top:6px;color:#0284c7;font-size:18px}.mp-stat small{font-size:10px;color:#64748b}.mp-btn{border:0;border-radius:12px;padding:10px 14px;background:#0284c7;color:#fff;font-weight:700;cursor:pointer;transition:transform .18s,background .18s,box-shadow .18s;box-shadow:0 4px 12px #0284c733}.mp-btn:hover{background:#0369a1;transform:translateY(-1px)}.mp-btn:active{transform:scale(.97)}.mp-btn.secondary{background:#e0f2fe;color:#0369a1;box-shadow:none}.mp-input{width:100%;padding:11px 12px;margin-top:5px;border:1px solid #cbd5e1;border-radius:12px;background:#fff;font-size:14px;outline:none;transition:border-color .18s,box-shadow .18s}.mp-input:focus{border-color:#0ea5e9;box-shadow:0 0 0 4px #0ea5e933}.mp-form{display:flex;flex-direction:column;gap:12px;padding:14px;border-radius:15px;background:#f0f9ff;border:1px solid #dbeafe}.mp-status{padding:13px;border-radius:13px;background:#e0f2fe;border:1px solid #7dd3fc;color:#0369a1;font-size:13px;font-weight:700}.mp-muted{margin:0 0 14px;color:#64748b;font-size:13px;line-height:1.65}
`;

export default function MyPageView({ userName, setUserName, userScore, userPoints, steps, onGoogleLogin, onEmailLogin, user }) {
  const [isEditingName, setIsEditingName] = useState(false);
  const [tempName, setTempName] = useState(userName || '');
  const [showEmailForm, setShowEmailForm] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const isLinked = user && !user.isAnonymous;
  const linkedProvider = user?.providerData?.[0]?.providerId;
  const handleSubmitEmail = e => { e.preventDefault(); if (email && password) onEmailLogin(email, password); };

  return <><style>{styles}</style><section className="mypage">
    <h2 className="mp-title">マイページ</h2>
    <div className="mp-card">
      <div className="mp-label">プレイヤー名</div>
      {isEditingName ? <div style={{display:'flex',gap:8,marginTop:8}}><input className="mp-input" value={tempName} onChange={e=>setTempName(e.target.value)} aria-label="ニックネーム"/><button className="mp-btn" onClick={()=>{if(tempName.trim()){setUserName(tempName.trim());setIsEditingName(false)}}}>保存</button></div> : <div className="mp-name-row"><span className="mp-name">{userName || 'プレイヤー'}</span><button className="mp-btn secondary" onClick={()=>{setTempName(userName||'');setIsEditingName(true)}}>編集</button></div>}
    </div>
    <div className="mp-stats">
      <div className="mp-stat"><span className="mp-label">総スコア</span><strong>{userScore}<small> pt</small></strong></div>
      <div className="mp-stat"><span className="mp-label">保有ポイント</span><strong>{userPoints}<small> pt</small></strong></div>
      <div className="mp-stat"><span className="mp-label">今日の歩数</span><strong>{steps}<small> 歩</small></strong></div>
    </div>
    <div className="mp-card">
      <h3 style={{margin:'0 0 8px',fontSize:17,color:'#075985'}}>アカウント連携</h3>
      <p className="mp-muted">アカウントを連携すると、機種変更後もプレイデータを引き継げます。</p>
      {isLinked ? <div className="mp-status">✓ {linkedProvider === 'google.com' ? 'Google' : 'メールアドレス'}で連携済み</div> : <div style={{display:'flex',flexDirection:'column',gap:10}}>
        <button className="mp-btn" onClick={onGoogleLogin}>Googleアカウントで連携</button>
        <button className="mp-btn secondary" onClick={()=>setShowEmailForm(v=>!v)}>{showEmailForm?'メール登録を閉じる':'メールアドレスで登録・連携'}</button>
        {showEmailForm&&<form className="mp-form" onSubmit={handleSubmitEmail}><label className="mp-label">メールアドレス<input className="mp-input" type="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="example@email.com" required/></label><label className="mp-label">パスワード（6文字以上）<input className="mp-input" type="password" value={password} onChange={e=>setPassword(e.target.value)} minLength={6} required/></label><button className="mp-btn" type="submit">登録してデータを保存</button></form>}
      </div>}
    </div>
  </section></>;
}
