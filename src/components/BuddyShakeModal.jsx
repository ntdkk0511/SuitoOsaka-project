import React, { useEffect, useState } from 'react';
import { doc, onSnapshot, runTransaction } from 'firebase/firestore';
import { db } from '../firebase';

const styles = `.buddy-backdrop{position:fixed;inset:0;z-index:15000;background:#082f49aa;backdrop-filter:blur(7px);display:grid;place-items:center;padding:18px}.buddy-panel{width:min(100%,390px);border-radius:24px;padding:24px;background:linear-gradient(160deg,#f0fdfa,#e0f2fe);box-shadow:0 24px 70px #082f4955;text-align:center;color:#0c4a6e}.buddy-panel h2{margin:6px 0 10px;font-size:20px}.buddy-panel p{line-height:1.7}.buddy-code{display:flex;gap:8px;margin-top:14px}.buddy-code input{min-width:0;flex:1;padding:12px;border:1px solid #7dd3fc;border-radius:12px;font-size:18px;letter-spacing:.2em;text-align:center;text-transform:uppercase}.buddy-panel button{border:0;border-radius:12px;padding:11px 14px;background:#0284c7;color:white;font-weight:700;cursor:pointer}.buddy-panel button.secondary{background:#dbeafe;color:#075985}.buddy-status{min-height:26px;color:#0369a1;font-size:13px;font-weight:700}.buddy-close{margin-top:12px;width:100%}`;

const newCode = () => Array.from({ length: 6 }, () => 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'[Math.floor(Math.random() * 36)]).join('');

export default function BuddyShakeModal({ isOpen, uid, nickname, location, visitedLocations = [], onClose, onPaired }) {
  const [status, setStatus] = useState('コードを発行するか、友達のコードを入力してください。');
  const [roomCode, setRoomCode] = useState('');
  const [myCode, setMyCode] = useState('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!isOpen || !uid || !myCode) return undefined;
    const unsubscribe = onSnapshot(doc(db, 'buddies', myCode), snapshot => {
      const data = snapshot.data();
      const peerId = data?.participants?.find(id => id !== uid);
      if (peerId && data.members?.[peerId]) onPaired({ ...data.members[peerId], roomId: myCode });
    }, error => setStatus(`ルームを確認できませんでした: ${error.message}`));
    return unsubscribe;
  }, [isOpen, uid, myCode, onPaired]);

  const createCode = async () => {
    if (!uid || !location) { setStatus('位置情報を取得してからお試しください。'); return; }
    try {
      let code;
      let created = false;
      while (!created) {
        code = newCode();
        created = await runTransaction(db, async tx => {
          const ref = doc(db, 'buddies', code);
          const snap = await tx.get(ref);
          if (snap.exists()) return false;
          tx.set(ref, { roomId: code, roomCode: code, participants: [uid], members: { [uid]: { uid, nickname, location, visitedLocations: [] } }, visitedLocations: [], createdAt: Date.now(), updatedAt: Date.now() });
          return true;
        });
      }
      setMyCode(code);
      setStatus('このコードを友達に共有してください。');
    } catch (error) { setStatus(`コードを発行できませんでした: ${error.message}`); }
  };

  const copyCode = async () => {
    try { await navigator.clipboard.writeText(myCode); setCopied(true); setTimeout(() => setCopied(false), 1800); }
    catch { setStatus('コピーできませんでした。コードを長押ししてコピーしてください。'); }
  };

  const joinCode = async () => {
    const code = roomCode.trim().toUpperCase();
    if (!/^[A-Z0-9]{6}$/.test(code) || !uid || !location) { setStatus('6桁の英数字コードと位置情報を確認してください。'); return; }
    try {
      let peer;
      await runTransaction(db, async tx => {
        const ref = doc(db, 'buddies', code);
        const snap = await tx.get(ref);
        if (!snap.exists()) throw new Error('ルームが見つかりません。コードを確認してください。');
        const data = snap.data();
        if ((data.participants || []).includes(uid)) throw new Error('この端末はすでに参加しています。');
        if ((data.participants || []).length >= 2) throw new Error('このルームは満員です。');
        peer = Object.values(data.members || {})[0];
        tx.update(ref, { participants: [...(data.participants || []), uid], [`members.${uid}`]: { uid, nickname, location, visitedLocations }, updatedAt: Date.now() });
      });
      onPaired({ ...(peer || {}), roomId: code });
    } catch (error) { setStatus(error.message || 'ルームに参加できませんでした。'); }
  };

  if (!isOpen) return null;
  return <><style>{styles}</style><div className="buddy-backdrop" role="dialog" aria-modal="true" aria-label="友達と合流"><section className="buddy-panel"><div aria-hidden="true" style={{fontSize:46}}>👥</div><h2>友達と合流</h2><p>コードを発行して共有するか、友達から受け取ったコードを入力してください。</p><div className="buddy-status" role="status">{status}</div>{myCode && <div style={{margin:'14px 0',padding:14,borderRadius:16,background:'#fff'}}><div style={{fontSize:12,color:'#64748b'}}>ルームコード</div><strong style={{display:'block',fontSize:32,letterSpacing:'.18em',color:'#0369a1'}}>{myCode}</strong><button onClick={copyCode}>{copied ? 'コピーしました' : 'コードをコピー'}</button></div>}<div className="buddy-code"><input aria-label="6桁のルームコード" maxLength={6} placeholder="例 A7K9P2" value={roomCode} onChange={e => setRoomCode(e.target.value.replace(/[^a-z0-9]/gi, '').toUpperCase())}/><button onClick={joinCode}>合流する</button></div><button className="secondary" style={{marginTop:10}} onClick={createCode}>コードを発行する</button><button className="secondary buddy-close" onClick={onClose}>閉じる</button></section></div></>;
}
