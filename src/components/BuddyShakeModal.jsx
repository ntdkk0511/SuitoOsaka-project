import React, { useCallback, useEffect, useRef, useState } from 'react';
import { collection, deleteDoc, doc, getDocs, onSnapshot, query, runTransaction, where } from 'firebase/firestore';
import { db } from '../firebase';

const styles = `.buddy-backdrop{position:fixed;inset:0;z-index:15000;background:#082f49aa;backdrop-filter:blur(7px);display:grid;place-items:center;padding:18px}.buddy-panel{width:min(100%,390px);max-height:92vh;overflow:auto;border-radius:24px;padding:24px;background:linear-gradient(160deg,#f0fdfa,#e0f2fe);box-shadow:0 24px 70px #082f4955;text-align:center;color:#0c4a6e}.buddy-panel h2{margin:6px 0 10px;font-size:20px}.buddy-panel p{line-height:1.7}.buddy-code{display:flex;gap:8px;margin-top:14px}.buddy-code input{min-width:0;flex:1;padding:12px;border:1px solid #7dd3fc;border-radius:12px;font-size:18px;letter-spacing:.2em;text-align:center;text-transform:uppercase}.buddy-panel button{border:0;border-radius:12px;padding:11px 14px;background:#0284c7;color:white;font-weight:700;cursor:pointer}.buddy-panel button.secondary{background:#dbeafe;color:#075985}.buddy-panel button:disabled{opacity:.55;cursor:wait}.buddy-status{min-height:26px;color:#0369a1;font-size:13px;font-weight:700}.buddy-close{margin-top:12px;width:100%}.shake-card{margin:12px 0;padding:16px;border-radius:18px;background:#fff;box-shadow:0 5px 18px #07598512}.shake-card h3{margin:0 0 6px;font-size:16px}.shake-orb{display:inline-grid;place-items:center;width:58px;height:58px;margin:8px;border-radius:50%;background:#e0f2fe;font-size:30px}.shake-orb.active{animation:shake-pulse 1s ease-in-out infinite}@keyframes shake-pulse{50%{transform:scale(1.12);box-shadow:0 0 0 10px #38bdf833}}`;
const newCode = () => Array.from({ length: 6 }, () => 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'[Math.floor(Math.random() * 36)]).join('');
const coordinates = value => Array.isArray(value) && value.length >= 2 ? { lat: Number(value[1]), lng: Number(value[0]) } : value && Number.isFinite(Number(value.lat)) && Number.isFinite(Number(value.lng)) ? { lat: Number(value.lat), lng: Number(value.lng) } : null;
const distance = (a, b) => { const rad = n => n * Math.PI / 180; const dLat = rad(b.lat-a.lat), dLng = rad(b.lng-a.lng); const h = Math.sin(dLat/2)**2 + Math.cos(rad(a.lat))*Math.cos(rad(b.lat))*Math.sin(dLng/2)**2; return 6371000 * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1-h)); };

export default function BuddyShakeModal({ isOpen, uid, nickname, location, visitedLocations = [], onClose, onPaired }) {
  const [status, setStatus] = useState('コードを発行するか、友達のコードを入力してください。');
  const [roomCode, setRoomCode] = useState('');
  const [myCode, setMyCode] = useState('');
  const [copied, setCopied] = useState(false);
  const [shakeActive, setShakeActive] = useState(false);
  const [shakeStatus, setShakeStatus] = useState('');
  const cooldownRef = useRef(0);
  const previousMotionRef = useRef(null);
  const handledRef = useRef(false);
  const shakeActiveRef = useRef(false);
  const hostCodeRef = useRef('');
  const timeoutRef = useRef(null);

  const stopWaiting = useCallback(async (message = '') => {
    shakeActiveRef.current = false;
    setShakeActive(false);
    hostCodeRef.current = '';
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = null;
    if (hostCodeRef.current) await deleteDoc(doc(db, 'buddies', hostCodeRef.current)).catch(() => {});
    if (message) setShakeStatus(message);
  }, []);

  const matchShake = useCallback(async () => {
    if (!uid || handledRef.current) return;
    handledRef.current = true;
    setShakeStatus('近くの仲間を探しています...');
    try {
      const now = Date.now();
      const q = query(collection(db, 'buddies'), where('mode', '==', 'shake'));
      const results = await getDocs(q);
      let candidate = null;
      for (const snap of results.docs) {
        if (snap.id === hostCodeRef.current) continue;
        const data = snap.data();
        if (data.status !== 'waiting') continue;
        const timestamp = Number(data.shakeTimestamp ?? data.updatedAt ?? 0);
        if (now - timestamp > 15000 || timestamp > now + 5000 || data.hostUid === uid || (data.participants || []).includes(uid)) continue;
        const peer = Object.values(data.members || {})[0];
        if (!peer?.uid || peer.uid === uid || (data.participants || []).length >= 2) continue;
        const mine = coordinates(location), theirs = coordinates(peer.location ?? data.location);
        if (mine && theirs ? distance(mine, theirs) <= 100 : now - timestamp <= 10000) { candidate = { snap, data, peer }; break; }
      }
      if (candidate) {
        await runTransaction(db, async tx => {
          const ref = doc(db, 'buddies', candidate.snap.id);
          const latest = await tx.get(ref);
          if (!latest.exists()) throw new Error('相手の待機が終了しました。もう一度お試しください。');
          const data = latest.data();
          if (data.status !== 'waiting' || (data.participants || []).length >= 2) throw new Error('相手は別の仲間と合流しました。もう一度お試しください。');
          tx.update(ref, { participants: [...(data.participants || []), uid], [`members.${uid}`]: { uid, nickname, location, visitedLocations }, status: 'matched', updatedAt: Date.now() });
        });
        setShakeStatus('仲間と合流しました！');
        onPaired({ ...candidate.peer, roomId: candidate.snap.id });
        return;
      }
      let code, created = false;
      while (!created) {
        code = newCode();
        created = await runTransaction(db, async tx => {
          const ref = doc(db, 'buddies', code); const snap = await tx.get(ref); if (snap.exists()) return false;
          tx.set(ref, { roomId: code, roomCode: code, mode: 'shake', status: 'waiting', hostUid: uid, shakeTimestamp: now, participants: [uid], members: { [uid]: { uid, nickname, location, visitedLocations } }, createdAt: now, updatedAt: now }); return true;
        });
      }
      hostCodeRef.current = code;
      setMyCode(code);
      setShakeStatus('スマホを振ってください...（待機中）');
      timeoutRef.current = setTimeout(async () => {
        const expiredCode = hostCodeRef.current;
        hostCodeRef.current = '';
        shakeActiveRef.current = false; setShakeActive(false);
        if (expiredCode) await deleteDoc(doc(db, 'buddies', expiredCode)).catch(() => {});
        setShakeStatus('近くに振っている仲間が見つかりませんでした。もう一度振るか6桁コードをお試しください');
      }, 15000);
    } catch (error) {
      handledRef.current = false;
      setShakeStatus(error.message || 'シェイク合流に失敗しました。もう一度お試しください。');
    }
  }, [uid, location, nickname, visitedLocations, onPaired]);

  const startShake = async () => {
    if (!uid) { setShakeStatus('ログイン情報を確認できません。'); return; }
    if (typeof DeviceMotionEvent === 'undefined') { setShakeActive(true); shakeActiveRef.current = true; setShakeStatus('スマホを振ってください...（待機中）'); return; }
    if (typeof DeviceMotionEvent !== 'undefined' && typeof DeviceMotionEvent.requestPermission === 'function') {
      try { if (await DeviceMotionEvent.requestPermission() !== 'granted') { setShakeStatus('センサーの許可が必要です。下の6桁コードでも合流できます'); return; } }
      catch { setShakeStatus('センサーの許可が必要です。下の6桁コードでも合流できます'); return; }
    }
    handledRef.current = false; cooldownRef.current = 0;
    shakeActiveRef.current = true; setShakeActive(true); setShakeStatus('スマホを振ってください...（待機中）');
  };
  const testShake = () => { handledRef.current = false; shakeActiveRef.current = true; setShakeActive(true); matchShake(); };

  useEffect(() => {
    if (!isOpen || !shakeActive) return undefined;
    const listener = event => {
      if (!shakeActiveRef.current) return;
      const a = event.accelerationIncludingGravity || event.acceleration;
      if (!a) return;
      const vector = [a.x || 0, a.y || 0, a.z || 0];
      const previous = previousMotionRef.current;
      previousMotionRef.current = vector;
      if (!previous) return;
      const magnitude = Math.hypot(vector[0]-previous[0], vector[1]-previous[1], vector[2]-previous[2]);
      const now = Date.now();
      if (magnitude >= 16 && now - cooldownRef.current >= 1500) {
        cooldownRef.current = now;
        if (navigator.vibrate) navigator.vibrate(200);
        matchShake();
      }
    };
    window.addEventListener('devicemotion', listener);
    return () => window.removeEventListener('devicemotion', listener);
  }, [isOpen, shakeActive, matchShake]);

  useEffect(() => {
    if (!isOpen || !uid || !myCode) return undefined;
    const unsubscribe = onSnapshot(doc(db, 'buddies', myCode), snapshot => {
      const data = snapshot.data();
      const peerId = data?.participants?.find(id => id !== uid);
      if (peerId && data.members?.[peerId]) { setShakeStatus('仲間と合流しました！'); onPaired({ ...data.members[peerId], roomId: myCode }); }
    }, error => setStatus(`ルームを確認できませんでした: ${error.message}`));
    return unsubscribe;
  }, [isOpen, uid, myCode, onPaired]);

  useEffect(() => {
    if (!isOpen || !shakeActive) return undefined;
    const q = query(collection(db, 'buddies'), where('mode', '==', 'shake'));
    const unsubscribe = onSnapshot(q, snapshots => {
      const hostCode = hostCodeRef.current;
      if (!hostCode) return;
      const room = snapshots.docs.find(s => s.id === hostCode);
      const data = room?.data();
      const peerId = data?.participants?.find(id => id !== uid);
      if (peerId && data.members?.[peerId]) {
        if (timeoutRef.current) clearTimeout(timeoutRef.current);
        timeoutRef.current = null; hostCodeRef.current = ''; shakeActiveRef.current = false; setShakeActive(false);
        setShakeStatus('仲間と合流しました！'); onPaired({ ...data.members[peerId], roomId: hostCode });
      }
    });
    return unsubscribe;
  }, [isOpen, shakeActive, uid, onPaired]);

  useEffect(() => () => {
    shakeActiveRef.current = false;
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    const code = hostCodeRef.current;
    if (code) deleteDoc(doc(db, 'buddies', code)).catch(() => {});
  }, []);

  const close = async () => { const code = hostCodeRef.current; hostCodeRef.current = ''; if (timeoutRef.current) clearTimeout(timeoutRef.current); timeoutRef.current = null; shakeActiveRef.current = false; setShakeActive(false); if (code) await deleteDoc(doc(db, 'buddies', code)).catch(() => {}); onClose(); };
  const createCode = async () => {
    if (!uid || !location) { setStatus('位置情報を取得してからお試しください。'); return; }
    try { let code, created = false; while (!created) { code = newCode(); created = await runTransaction(db, async tx => { const ref = doc(db, 'buddies', code); if ((await tx.get(ref)).exists()) return false; tx.set(ref, { roomId: code, roomCode: code, participants: [uid], members: { [uid]: { uid, nickname, location, visitedLocations: [] } }, visitedLocations: [], createdAt: Date.now(), updatedAt: Date.now() }); return true; }); } setMyCode(code); setStatus('このコードを友達に共有してください。'); }
    catch (error) { setStatus(`コードを発行できませんでした: ${error.message}`); }
  };
  const copyCode = async () => { try { await navigator.clipboard.writeText(myCode); setCopied(true); setTimeout(() => setCopied(false), 1800); } catch { setStatus('コピーできませんでした。コードを長押ししてコピーしてください。'); } };
  const joinCode = async () => {
    const code = roomCode.trim().toUpperCase();
    if (!/^[A-Z0-9]{6}$/.test(code) || !uid || !location) { setStatus('6桁の英数字コードと位置情報を確認してください。'); return; }
    try { let peer; await runTransaction(db, async tx => { const ref = doc(db, 'buddies', code); const snap = await tx.get(ref); if (!snap.exists()) throw new Error('ルームが見つかりません。コードを確認してください。'); const data = snap.data();
 if ((data.participants || []).includes(uid)) throw new Error('この端末はすでに参加しています。'); if ((data.participants || []).length >= 2) throw new Error('このルームは満員です。'); peer = Object.values(data.members || {})[0]; tx.update(ref, { participants: [...(data.participants || []), uid], [`members.${uid}`]: { uid, nickname, location, visitedLocations }, status: 'matched', updatedAt: Date.now() }); }); onPaired({ ...(peer || {}), roomId: code }); }
    catch (error) { setStatus(error.message || 'ルームに参加できませんでした。'); }
  };

  if (!isOpen) return null;
  return <><style>{styles}</style><div className="buddy-backdrop" role="dialog" aria-modal="true" aria-label="友達と合流"><section className="buddy-panel"><div aria-hidden="true" style={{fontSize:46}}>🤝</div><h2>友達と合流</h2><p>コードを発行して共有するか、友達から受け取ったコードを入力してください。</p>
    <div className="shake-card"><h3>スマホを振って近くの仲間と合流</h3><div className={`shake-orb${shakeActive ? ' active' : ''}`} aria-hidden="true">📱</div><div className="buddy-status" role="status">{shakeStatus}</div><button onClick={startShake} disabled={shakeActive}>{shakeActive ? 'シェイク待機中' : 'シェイク待機を開始する'}</button><div><button className="secondary" style={{display:'block',margin:'9px auto 0',padding:'7px 10px',fontSize:12}} onClick={testShake}>テスト：シェイクを実行</button></div></div>
    <div className="buddy-status" role="status">{status}</div>{myCode && <div style={{margin:'14px 0',padding:14,borderRadius:16,background:'#fff'}}><div style={{fontSize:12,color:'#64748b'}}>ルームコード</div><strong style={{display:'block',fontSize:32,letterSpacing:'.18em',color:'#0369a1'}}>{myCode}</strong><button onClick={copyCode}>{copied ? 'コピーしました' : 'コードをコピー'}</button></div>}<div className="buddy-code"><input aria-label="6桁のルームコード" maxLength={6} placeholder="例：A7K9P2" value={roomCode} onChange={e => setRoomCode(e.target.value.replace(/[^a-z0-9]/gi, '').toUpperCase())}/><button onClick={joinCode}>合流する</button></div><button className="secondary" style={{marginTop:10}} onClick={createCode}>コードを発行する</button><button className="secondary buddy-close" onClick={close}>閉じる</button></section></div></>;
}
