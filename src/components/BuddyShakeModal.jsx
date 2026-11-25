import React, { useCallback, useEffect, useRef, useState } from 'react';
import { collection, doc, onSnapshot, runTransaction, setDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { isWithinRadius } from '../utils/geo';

const styles = `
.buddy-backdrop{position:fixed;inset:0;z-index:15000;background:#082f49aa;backdrop-filter:blur(7px);display:grid;place-items:center;padding:18px}
.buddy-panel{width:min(100%,390px);border-radius:24px;padding:24px;background:linear-gradient(160deg,#f0fdfa,#e0f2fe);box-shadow:0 24px 70px #082f4955;text-align:center;color:#0c4a6e}
.buddy-ripple{width:126px;height:126px;margin:8px auto 20px;border-radius:50%;display:grid;place-items:center;background:#67e8f9;box-shadow:0 0 0 0 #22d3ee88;animation:b-ripple 1.8s infinite}
.buddy-ripple span{font-size:50px}.buddy-panel h2{margin:6px 0 10px;font-size:20px}.buddy-panel p{line-height:1.7}.buddy-code{display:flex;gap:8px;margin-top:14px}.buddy-code input{min-width:0;flex:1;padding:12px;border:1px solid #7dd3fc;border-radius:12px;font-size:18px;letter-spacing:.2em;text-align:center}.buddy-panel button{border:0;border-radius:12px;padding:11px 14px;background:#0284c7;color:white;font-weight:700;cursor:pointer}.buddy-panel button.secondary{background:#dbeafe;color:#075985}.buddy-status{min-height:26px;color:#0369a1;font-size:13px;font-weight:700}.buddy-close{margin-top:12px;width:100%}@keyframes b-ripple{70%{box-shadow:0 0 0 24px #22d3ee00}100%{box-shadow:0 0 0 0 #22d3ee00}}
`;

export default function BuddyShakeModal({ isOpen, uid, nickname, location, onClose, onPaired }) {
  const [status, setStatus] = useState('スマホを一緒に振ると、近くの仲間を探します');
  const [roomCode, setRoomCode] = useState('');
  const [myCode, setMyCode] = useState('');
  const matched = useRef(false);
  const lastShake = useRef(0);
  const baseline = useRef(null);
  const stopWatch = useRef(null);

  const finishPair = useCallback(async (peer, roomId) => {
    if (matched.current || !uid || !peer?.uid) return;
    matched.current = true;
    if (stopWatch.current) stopWatch.current();
    window.clearTimeout(window.__buddyWatchTimeout);
    const participants = [uid, peer.uid].sort();
    try {
      await setDoc(doc(db, 'buddies', roomId), {
        roomId, roomCode: roomId.length === 4 ? roomId : '', participants,
        members: { [uid]: { uid, nickname, location }, [peer.uid]: { uid: peer.uid, nickname: peer.nickname, location: peer.location } },
        updatedAt: Date.now()
      }, { merge: true });
    } catch (error) { console.error('Buddy room setup failed', error); }
    setStatus(`${peer.nickname || '仲間'}と合流しました！`);
    if (navigator.vibrate) navigator.vibrate([120, 60, 180]);
    window.setTimeout(() => onPaired({ ...peer, roomId }), 900);
  }, [uid, nickname, location, onPaired]);

  useEffect(() => {
    if (!isOpen || !uid || !location) return undefined;
    matched.current = false;
    const ownRef = doc(db, 'shakes', uid);
    const stop = onSnapshot(collection(db, 'shakes'), snapshot => {
      if (matched.current) return;
      const now = Date.now();
      const other = snapshot.docs.map(item => item.data()).find(item => item.uid !== uid && now - item.timestamp <= 5000 && item.timestamp <= now + 1000 && isWithinRadius(location, item.location, 30).isNear);
      if (other) finishPair(other, [uid, other.uid].sort().join('_'));
    }, error => setStatus(`相手を探せませんでした: ${error.message}`));
    stopWatch.current = stop;
    window.__buddyWatchTimeout = window.setTimeout(() => { stop(); stopWatch.current = null; setStatus('見つかりませんでした。もう一度振るか、合言葉を使ってください'); }, 6000);

    const handleMotion = async event => {
      const a = event.accelerationIncludingGravity;
      if (!a || a.x == null) return;
      const magnitude = Math.sqrt(a.x * a.x + a.y * a.y + a.z * a.z);
      const delta = baseline.current == null ? 0 : Math.abs(magnitude - baseline.current);
      baseline.current = magnitude;
      if (delta < 13 || Date.now() - lastShake.current < 900 || matched.current) return;
      lastShake.current = Date.now();
      setStatus('近くの仲間を探しています…');
      try { await setDoc(ownRef, { uid, nickname, location, timestamp: Date.now() }); }
      catch (error) { setStatus(`合流情報を送れませんでした: ${error.message}`); }
    };
    window.addEventListener('devicemotion', handleMotion);
    return () => { window.removeEventListener('devicemotion', handleMotion); stop(); window.clearTimeout(window.__buddyWatchTimeout); stopWatch.current = null; };
  }, [isOpen, uid, nickname, location, finishPair]);

  const createCode = async () => {
    if (!uid || !location) return setStatus('位置情報を取得してからお試しください');
    const code = String(Math.floor(1000 + Math.random() * 9000));
    const roomRef = doc(db, 'buddies', code);
    await setDoc(roomRef, { roomId: code, roomCode: code, participants: [uid], members: { [uid]: { uid, nickname, location } }, visitedLocations: [], updatedAt: Date.now() });
    setMyCode(code);
    setStatus('この4桁を友達に伝えてください');
    const stop = onSnapshot(roomRef, snapshot => {
      const data = snapshot.data();
      const peerId = data?.participants?.find(id => id !== uid);
      if (peerId && data.members?.[peerId]) finishPair(data.members[peerId], code);
    });
    stopWatch.current = stop;
    window.setTimeout(stop, 10 * 60 * 1000);
  };

  const joinCode = async () => {
    const code = roomCode.trim();
    if (!/^\d{4}$/.test(code) || !uid || !location) return setStatus('4桁の合言葉と位置情報を確認してください');
    const roomRef = doc(db, 'buddies', code);
    let peer;
    await runTransaction(db, async tx => {
      const snap = await tx.get(roomRef);
      if (!snap.exists()) throw new Error('その合言葉の部屋はありません');
      const data = snap.data();
      peer = Object.values(data.members || {}).find(member => member.uid !== uid);
      const participants = Array.from(new Set([...(data.participants || []), uid]));
      tx.set(roomRef, { participants, members: { ...(data.members || {}), [uid]: { uid, nickname, location } }, updatedAt: Date.now() }, { merge: true });
    });
    if (peer) await finishPair(peer, code);
    else setStatus('友達が参加するのを待っています…');
  };

  if (!isOpen) return null;
  return <><style>{styles}</style><div className="buddy-backdrop" role="dialog" aria-modal="true" aria-label="仲間と合流"><section className="buddy-panel"><div className="buddy-ripple"><span aria-hidden="true">〰️</span></div><h2>友達とスマホを一緒に振ってください</h2><p>近くにいる友達を探します。GPSが不安定なときは4桁の合言葉を使えます。</p><div className="buddy-status">{status}</div>{myCode && <p><strong>あなたの合言葉: {myCode}</strong></p>}<div className="buddy-code"><input aria-label="4桁の合言葉" inputMode="numeric" maxLength={4} placeholder="ルーム番号" value={roomCode} onChange={e => setRoomCode(e.target.value.replace(/\D/g, '').slice(0, 4))}/><button onClick={joinCode}>参加</button></div><button className="secondary" style={{marginTop:10}} onClick={createCode}>合言葉を発行</button><button className="secondary buddy-close" onClick={onClose}>閉じる</button></section></div></>;
}
