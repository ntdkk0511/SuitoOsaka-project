import React, { useState } from 'react';

export default function MyPageView({
  userName,
  setUserName,
  userScore,
  userPoints,
  steps,
  onGoogleLogin,
  onEmailLogin,
  user
}) {
  const [isEditingName, setIsEditingName] = useState(false);
  const [tempName, setTempName] = useState(userName);
  const [showEmailForm, setShowEmailForm] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const isLinked = user && !user.isAnonymous;
  const linkedProvider = user?.providerData?.[0]?.providerId;

  const handleSaveName = () => {
    if (tempName.trim()) {
      setUserName(tempName.trim());
      setIsEditingName(false);
    }
  };

  const handleSubmitEmail = (e) => {
    e.preventDefault();
    if (!email || !password) return alert("メールアドレスとパスワードを入力してください。");
    onEmailLogin(email, password);
  };

  return (
    <div style={{ padding: '16px', maxWidth: '480px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <h2 style={{ fontSize: '18px', fontWeight: 'bold', borderBottom: '1px solid #eee', paddingBottom: '8px', margin: 0, color: '#111' }}>
        👤 マイページ
      </h2>

      {/* 👤 1. ユーザープロフィール */}
      <div style={{ background: '#fff', border: '1px solid #eee', borderRadius: '12px', padding: '16px' }}>
        <div style={{ fontSize: '12px', color: '#666', fontWeight: 'bold', marginBottom: '4px' }}>プレイヤー名</div>
        {isEditingName ? (
          <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
            <input
              type="text"
              value={tempName}
              onChange={(e) => setTempName(e.target.value)}
              style={{ flex: 1, padding: '8px', borderRadius: '6px', border: '1px solid #ccc', fontSize: '14px' }}
            />
            <button
              onClick={handleSaveName}
              style={{ background: '#2563eb', color: '#fff', border: 'none', padding: '8px 14px', borderRadius: '6px', fontWeight: 'bold', fontSize: '13px', cursor: 'pointer' }}
            >
              保存
            </button>
          </div>
        ) : (
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '16px', fontWeight: 'bold', color: '#111' }}>{userName}</span>
            <button
              onClick={() => { setTempName(userName); setIsEditingName(true); }}
              style={{ background: '#f3f4f6', border: 'none', padding: '6px 12px', borderRadius: '6px', fontSize: '12px', color: '#4b5563', cursor: 'pointer' }}
            >
              編集
            </button>
          </div>
        )}
      </div>

      {/* 📊 2. スコア・ポイント・歩数表示 */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px' }}>
        <div style={{ background: '#fff', border: '1px solid #eee', borderRadius: '12px', padding: '12px', textAlign: 'center' }}>
          <div style={{ fontSize: '11px', color: '#666' }}>現在のスコア</div>
          <div style={{ fontSize: '18px', fontWeight: '800', color: '#2563eb', marginTop: '4px' }}>
            {userScore} <span style={{ fontSize: '10px', fontWeight: 'normal' }}>pt</span>
          </div>
        </div>
        <div style={{ background: '#fff', border: '1px solid #eee', borderRadius: '12px', padding: '12px', textAlign: 'center' }}>
          <div style={{ fontSize: '11px', color: '#666' }}>所持ポイント</div>
          <div style={{ fontSize: '18px', fontWeight: '800', color: '#d97706', marginTop: '4px' }}>
            {userPoints} <span style={{ fontSize: '10px', fontWeight: 'normal' }}>pt</span>
          </div>
        </div>
        <div style={{ background: '#fff', border: '1px solid #eee', borderRadius: '12px', padding: '12px', textAlign: 'center' }}>
          <div style={{ fontSize: '11px', color: '#666' }}>本日の歩数</div>
          <div style={{ fontSize: '18px', fontWeight: '800', color: '#0284c7', marginTop: '4px' }}>
            {steps} <span style={{ fontSize: '10px', fontWeight: 'normal' }}>歩</span>
          </div>
        </div>
      </div>

      {/* 🔐 3. アカウント保存・連携 */}
      <div style={{ background: '#fff', border: '1px solid #eee', borderRadius: '12px', padding: '16px' }}>
        <h3 style={{ fontSize: '15px', fontWeight: 'bold', margin: '0 0 8px 0', color: '#333', display: 'flex', alignItems: 'center', gap: '6px' }}>
          🔐 アカウント保存・連携
        </h3>
        <p style={{ fontSize: '12px', color: '#666', margin: '0 0 16px 0', lineHeight: '1.5' }}>
          アカウントを連携すると、機種変更時や他端末でも現在のプレイデータを引き継ぐことができます。
        </p>

        {isLinked ? (
          <div style={{ background: '#e0f2fe', border: '1px solid #7dd3fc', padding: '12px', borderRadius: '8px', color: '#0369a1', fontSize: '13px', fontWeight: 'bold', textAlign: 'center' }}>
            ✅ {linkedProvider === 'google.com' ? 'Google' : 'メールアドレス'} で連携済みです
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <button
              onClick={onGoogleLogin}
              style={{
                width: '100%',
                padding: '10px',
                borderRadius: '8px',
                border: '1px solid #ccc',
                background: '#fff',
                fontSize: '13px',
                fontWeight: 'bold',
                color: '#333',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px'
              }}
            >
              🌐 Googleアカウントで連携する
            </button>

            <button
              onClick={() => setShowEmailForm(!showEmailForm)}
              style={{
                width: '100%',
                padding: '10px',
                borderRadius: '8px',
                border: '1px solid #2563eb',
                background: '#eff6ff',
                fontSize: '13px',
                fontWeight: 'bold',
                color: '#2563eb',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px'
              }}
            >
              ✉️ メールアドレスでアカウント作成・連携
            </button>

            {showEmailForm && (
              <form onSubmit={handleSubmitEmail} style={{ marginTop: '8px', display: 'flex', flexDirection: 'column', gap: '8px', background: '#f9fafb', padding: '12px', borderRadius: '8px', border: '1px solid #eee' }}>
                <div>
                  <label style={{ fontSize: '11px', color: '#666', fontWeight: 'bold' }}>メールアドレス</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="example@email.com"
                    required
                    style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #ccc', fontSize: '13px', marginTop: '2px', boxSizing: 'border-box' }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '11px', color: '#666', fontWeight: 'bold' }}>パスワード（6文字以上）</label>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                    minLength={6}
                    style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #ccc', fontSize: '13px', marginTop: '2px', boxSizing: 'border-box' }}
                  />
                </div>
                <button
                  type="submit"
                  style={{
                    width: '100%',
                    padding: '8px',
                    borderRadius: '6px',
                    border: 'none',
                    background: '#2563eb',
                    color: '#fff',
                    fontSize: '13px',
                    fontWeight: 'bold',
                    cursor: 'pointer',
                    marginTop: '4px'
                  }}
                >
                  登録してデータを保護する
                </button>
              </form>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
