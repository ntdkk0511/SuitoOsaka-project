import React, { useState } from 'react';

export function MyPageView({ userName, setUserName, userScore, userPoints, onGoogleLogin, user }) {
  const [isEditing, setIsEditing] = useState(false);
  const [tempName, setTempName] = useState(userName);

  const handleSaveName = () => {
    if (tempName.trim()) {
      setUserName(tempName.trim());
      setIsEditing(false);
    }
  };

  return (
    <div style={{ padding: '16px', maxWidth: '480px', margin: '0 auto', color: '#333' }}>
      <h2 style={{ fontSize: '20px', fontWeight: 'bold', borderBottom: '1px solid #eee', paddingBottom: '8px', marginBottom: '16px' }}>
        👤 マイページ
      </h2>

      {/* ユーザー情報 */}
      <div style={{ background: '#fff', padding: '16px', borderRadius: '12px', border: '1px solid #eee', marginBottom: '16px', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
        <p style={{ fontSize: '12px', color: '#888', margin: 0 }}>ニックネーム</p>
        {isEditing ? (
          <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
            <input
              type="text"
              value={tempName}
              onChange={(e) => setTempName(e.target.value)}
              style={{ border: '1px solid #ccc', borderRadius: '6px', padding: '4px 8px', fontSize: '14px', flex: 1 }}
            />
            <button
              onClick={handleSaveName}
              style={{ background: '#2563eb', color: '#fff', border: 'none', borderRadius: '6px', padding: '4px 12px', fontWeight: 'bold', cursor: 'pointer' }}
            >
              保存
            </button>
          </div>
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px' }}>
            <span style={{ fontSize: '16px', fontWeight: 'bold' }}>{userName}</span>
            <button
              onClick={() => { setTempName(userName); setIsEditing(true); }}
              style={{ background: 'none', border: 'none', color: '#2563eb', cursor: 'pointer', fontSize: '12px' }}
            >
              ✏️ 変更
            </button>
          </div>
        )}

        {/* スコア・ポイント */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginTop: '16px', paddingTop: '12px', borderTop: '1px solid #f0f0f0' }}>
          <div style={{ background: '#eff6ff', padding: '12px', borderRadius: '8px', textAlign: 'center' }}>
            <p style={{ fontSize: '12px', color: '#2563eb', margin: 0 }}>累計スコア</p>
            <p style={{ fontSize: '20px', fontWeight: 'bold', color: '#1e40af', margin: '4px 0 0 0' }}>{userScore} <span style={{ fontSize: '12px' }}>pt</span></p>
          </div>
          <div style={{ background: '#fffbeb', padding: '12px', borderRadius: '8px', textAlign: 'center' }}>
            <p style={{ fontSize: '12px', color: '#d97706', margin: 0 }}>所持ポイント</p>
            <p style={{ fontSize: '20px', fontWeight: 'bold', color: '#92400e', margin: '4px 0 0 0' }}>{userPoints} <span style={{ fontSize: '12px' }}>pt</span></p>
          </div>
        </div>
      </div>

      {/* アカウント連携 */}
      <div style={{ background: '#fff', padding: '16px', borderRadius: '12px', border: '1px solid #eee', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
        <h3 style={{ fontSize: '14px', fontWeight: 'bold', margin: '0 0 8px 0' }}>🔐 アカウント保存・連携</h3>
        <p style={{ fontSize: '12px', color: '#666', lineHeight: 1.5, margin: '0 0 12px 0' }}>
          Googleアカウントと連携すると、機種変更時にもデータを引き継ぐことができます。
        </p>
        {user && !user.isAnonymous ? (
          <div style={{ background: '#f0fdf4', color: '#15803d', padding: '10px', borderRadius: '8px', fontSize: '12px', fontWeight: 'bold', border: '1px solid #bbf7d0' }}>
            ✅ Google連携済み
          </div>
        ) : (
          <button
            onClick={onGoogleLogin}
            style={{ width: '100%', background: '#fff', border: '1px solid #ccc', padding: '10px', borderRadius: '8px', fontSize: '12px', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyCenter: 'center', gap: '6px' }}
          >
            <span>🌐</span> Googleアカウントで連携する
          </button>
        )}
      </div>
    </div>
  );
}

export default MyPageView;