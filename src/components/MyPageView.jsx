import React, { useState } from 'react';

const buttonStyle = {
  minHeight: 48,
  padding: '12px 14px',
  border: 0,
  borderRadius: 12,
  background: '#0284c7',
  color: '#fff',
  fontSize: 14,
  fontWeight: 700,
  cursor: 'pointer',
};

export default function MyPageView({ userName, userScore, userPoints, steps, onGoogleLogin, onEmailLogin, onUnlink, user }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [show, setShow] = useState(false);
  const providers = user?.providerData || [];
  const submit = event => {
    event.preventDefault();
    if (password.length < 6) {
      alert('パスワードは6文字以上で入力してください。');
      return;
    }
    onEmailLogin(email, password);
  };

  return (
    <section style={{ maxWidth: 520, margin: '0 auto', padding: '20px 16px', color: '#0c4a6e', boxSizing: 'border-box' }}>
      <h2 style={{ margin: '0 0 8px', fontSize: 22, color: '#075985' }}>マイページ</h2>
      <p style={{ margin: '0 0 16px', color: '#475569', fontWeight: 600 }}>{userName}</p>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 8, marginBottom: 18 }}>
        {[
          ['スコア', userScore, 'pt'],
          ['ポイント', userPoints, 'pt'],
          ['歩数', steps, '歩'],
        ].map(([label, value, unit]) => (
          <div key={label} style={{ minWidth: 0, padding: '13px 8px', background: 'linear-gradient(145deg,#fff,#effaff)', border: '1px solid #bae6fd', borderRadius: 14, textAlign: 'center', boxShadow: '0 4px 12px #0369a110' }}>
            <div style={{ color: '#64748b', fontSize: 11, fontWeight: 700 }}>{label}</div>
            <div style={{ marginTop: 4, color: '#075985', fontSize: 'clamp(16px,5vw,22px)', fontWeight: 800, lineHeight: 1.2, overflowWrap: 'anywhere' }}>{value}<span style={{ marginLeft: 3, fontSize: 11, fontWeight: 700 }}>{unit}</span></div>
          </div>
        ))}
      </div>
      <section style={{ padding: 18, background: '#fff', border: '1px solid #dbeafe', borderRadius: 18, boxShadow: '0 8px 24px #0369a110' }}>
        <h3 style={{ margin: '0 0 8px', color: '#075985', fontSize: 17 }}>アカウント連携</h3>
        <p style={{ margin: '0 0 14px', color: '#64748b', fontSize: 13, lineHeight: 1.6 }}>連携すると機種変更後もプレイデータを引き継げます。</p>
        {providers.length ? providers.map(provider => (
          <div key={provider.providerId} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, padding: 10, background: '#ecfdf5', border: '1px solid #a7f3d0', marginBottom: 10, borderRadius: 12 }}>
            <strong style={{ color: '#047857', fontSize: 13 }}>✓ {provider.providerId === 'google.com' ? 'Google' : 'メールアドレス'}で連携済み</strong>
            <button type="button" style={{ ...buttonStyle, minHeight: 40, padding: '8px 12px', background: '#fff', color: '#b91c1c', border: '1px solid #fecaca', flexShrink: 0 }} onClick={() => onUnlink(provider.providerId)}>連携解除</button>
          </div>
        )) : <div style={{ display: 'inline-flex', marginBottom: 12, padding: '6px 11px', borderRadius: 999, background: '#f1f5f9', color: '#475569', fontSize: 12, fontWeight: 700 }}>未連携</div>}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 9 }}>
          <button type="button" style={buttonStyle} onClick={onGoogleLogin}>Googleアカウントと連携</button>
          <button type="button" style={{ ...buttonStyle, background: '#fff', color: '#0369a1', border: '1px solid #7dd3fc' }} onClick={() => setShow(value => !value)}>メールアドレスで連携</button>
        </div>
        {show && <form onSubmit={submit} style={{ display: 'grid', gap: 12, marginTop: 14 }}>
          <label style={{ display: 'grid', gap: 6, color: '#334155', fontSize: 13, fontWeight: 700 }}>メールアドレス<input type="email" value={email} onChange={event => setEmail(event.target.value)} required style={{ width: '100%', boxSizing: 'border-box', minHeight: 46, padding: '10px 12px', border: '1px solid #cbd5e1', borderRadius: 10, fontSize: 16 }} /></label>
          <label style={{ display: 'grid', gap: 6, color: '#334155', fontSize: 13, fontWeight: 700 }}>パスワード（6文字以上）<input type="password" value={password} onChange={event => setPassword(event.target.value)} minLength={6} required style={{ width: '100%', boxSizing: 'border-box', minHeight: 46, padding: '10px 12px', border: '1px solid #cbd5e1', borderRadius: 10, fontSize: 16 }} /></label>
          <button type="submit" style={buttonStyle}>登録してデータを保存</button>
        </form>}
      </section>
    </section>
  );
}
