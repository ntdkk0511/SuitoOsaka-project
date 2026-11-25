import React, { useEffect, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';

import { auth, db, googleProvider } from './firebase';
import { 
  signInAnonymously, 
  onAuthStateChanged, 
  linkWithPopup, 
  EmailAuthProvider, 
  linkWithCredential 
} from 'firebase/auth';
import { doc, setDoc, getDoc, collection, query, orderBy, limit, onSnapshot, arrayUnion, deleteDoc } from 'firebase/firestore';

import { SPOTS_DATA } from './constants/spots';
import { isWithinRadius } from './utils/geo';
import { useGeolocation } from './hooks/useGeolocation';
import { useVisitedLocations } from './hooks/useVisitedLocations';
import { useFogOverlay } from './hooks/useFogOverlay';
import { useStepCounter } from './hooks/useStepCounter';
import { canClaimSpotPoints, recordSpotClaim } from './utils/cooldown';
import { calculateSpeedKmH, isValidWaterBusSpeed } from './utils/waterRoute';

import Splash from './components/Splash';
import Header from './components/Header';
import BottomDock from './components/BottomDock';
import QuizModal from './components/QuizModal';
import ARViewport from './components/ARViewport';
import BottomTabBar from './components/BottomTabBar';
import MyPageView from './components/MyPageView';
import LiquidLoader from './components/LiquidLoader';
import { EncyclopediaModal } from './components/EncyclopediaModal';
import CouponUseModal from './components/CouponUseModal';
import WaterBusCruiseEffect from './components/WaterBusCruiseEffect';
import WaterBusQRModal from './components/WaterBusQRModal';
import CardPackModal from './components/CardPackModal';
import BuddyShakeModal from './components/BuddyShakeModal';

mapboxgl.accessToken = import.meta.env.VITE_MAPBOX_TOKEN;

const DEFAULT_CENTER = [135.5036, 34.6932];

// 大阪市から枚方市までをカバーする表示領域を設定
const OSAKA_HIRAKATA_BOUNDS = [
  [135.35, 34.55], // 大阪市南西部
  [135.78, 34.87]  // 枚方市・京都市東部
];

const COUPONS_DATA = [
  { id: 'cosmos-50', title: 'ドラッグストア コスモス 50円引き', price: 100 },
  { id: 'cafe-100', title: 'リバーサイドカフェ 100円OFF', price: 150 },
];

export default function App() {
  const mapContainerRef = useRef(null);
  const mapRef = useRef(null);
  const fogOverlayRef = useRef(null);
  const markersRef = useRef({});
  const userMarkerRef = useRef(null);

  const hasCenteredOnUserRef = useRef(false);
  const isFirstRenderRef = useRef(true);

  // GPSで現在地を取得
  const { location: userLocation } = useGeolocation();

  // 歩数を計測
  const { steps } = useStepCounter(userLocation);

  const prevProcessedStepsRef = useRef(
    parseInt(localStorage.getItem('tw_processed_steps') || '0', 10)
  );

  // 保存データを読み込み
  const [score, setScore] = useState(() => parseInt(localStorage.getItem('tw_score') || '420', 10));
  const [clearedSpots, setClearedSpots] = useState(() => JSON.parse(localStorage.getItem('tw_cleared_spots') || '["central-hall"]'));
  const [obtainedCards, setObtainedCards] = useState(() => {
    const saved = JSON.parse(localStorage.getItem('tw_obtained_cards') || '{}');
    const legacyCleared = JSON.parse(localStorage.getItem('tw_cleared_spots') || '["central-hall"]');
    const today = new Date();
    const date = `${today.getFullYear()}.${String(today.getMonth() + 1).padStart(2, '0')}.${String(today.getDate()).padStart(2, '0')}`;
    legacyCleared.forEach(id => { if (!saved[id]) saved[id] = { obtainedAt: date, isBuddyClear: false }; });
    return saved;
  });
  const [nickname, setNickname] = useState(() => localStorage.getItem('tw_nickname') || `水都冒険者_${Math.floor(1000 + Math.random() * 9000)}`);
  const [userPoints, setUserPoints] = useState(120);

  // 水上バスの状態
  const [isCruising, setIsCruising] = useState(false);
  const [currentSpeed, setCurrentSpeed] = useState(0);
  const [showWaterBusQR, setShowWaterBusQR] = useState(false);
  const prevLocationRef = useRef(null);
  const prevTimeRef = useRef(Date.now());

  // タブの状態
  const [activeTab, setActiveTab] = useState('map');

  // UI迥ｶ諷・
  const [showSplash, setShowSplash] = useState(true);
  const [showLiquidLoader, setShowLiquidLoader] = useState(false);
  const [waterProgress, setWaterProgress] = useState(0);

  const [selectedSpotId, setSelectedSpotId] = useState('central-hall');
  const [isManuallySelected, setIsManuallySelected] = useState(false);
  const [showQuiz, setShowQuiz] = useState(false);
  const [packSpotId, setPackSpotId] = useState(null);
  const [packBuddyClear, setPackBuddyClear] = useState(false);
  const [showCardPack, setShowCardPack] = useState(false);
  const [showAR, setShowAR] = useState(false);
  const [isEncyclopediaOpen, setIsEncyclopediaOpen] = useState(false);
  const [quizSelected, setQuizSelected] = useState(null);
  const [quizFeedback, setQuizFeedback] = useState('');
  const [isFlash, setIsFlash] = useState(false);
  const [showARSuccess, setShowARSuccess] = useState(false);

  // クーポン選択モーダルの状態
  const [selectedCoupon, setSelectedCoupon] = useState(null);

  // Firebase
  const [user, setUser] = useState(null);
  const [ranking, setRanking] = useState([]);
  const [showBuddyModal, setShowBuddyModal] = useState(false);
  const [buddy, setBuddy] = useState(null);
  const [buddyTrail, setBuddyTrail] = useState([]);

  const isAppLoading = showSplash || showLiquidLoader;

  const handleTabChange = (tabId) => {
    setActiveTab(tabId);
    if (tabId === 'encyclopedia') {
      setIsEncyclopediaOpen(true);
    } else {
      setIsEncyclopediaOpen(false);
    }
  };

  // 歩数をポイントに換算
  useEffect(() => {
    const STEP_PER_POINT = 10;
    const currentDiff = steps - prevProcessedStepsRef.current;

    if (currentDiff >= STEP_PER_POINT) {
      const earnedPoints = Math.floor(currentDiff / STEP_PER_POINT);
      const consumedSteps = earnedPoints * STEP_PER_POINT;

      setUserPoints((prev) => prev + earnedPoints);
      prevProcessedStepsRef.current += consumedSteps;
      localStorage.setItem('tw_processed_steps', prevProcessedStepsRef.current.toString());
    }
  }, [steps]);

  const { visitedLocations, cruisedLocations } = useVisitedLocations(userLocation, isCruising);

  const fogRadiiRef = useRef({
    'central-hall': clearedSpots.includes('central-hall') ? 80 : 0,
    'nakanishima-park': clearedSpots.includes('nakanishima-park') ? 80 : 0,
    'osaka-castle-pier': clearedSpots.includes('osaka-castle-pier') ? 80 : 0
  });

  // 霧の表示を更新
  const sharedTrail = [...new Map([...visitedLocations, ...buddyTrail].map(point => [`${point[0]}:${point[1]}`, point])).values()];
  const { updateFogPosition } = useFogOverlay({
    mapRef,
    fogOverlayRef,
    clearedSpots,
    visitedLocations: sharedTrail,
    cruisedLocations,
    userLocation,
    fogRadiiRef,
    buddyActive: Boolean(buddy)
  });

  // 水上バスの速度を確認
  useEffect(() => {
    if (!userLocation || !isCruising) return;

    const now = Date.now();
    const timeDiffSec = (now - prevTimeRef.current) / 1000;

    if (prevLocationRef.current && timeDiffSec > 2) {
      const speed = calculateSpeedKmH(prevLocationRef.current, userLocation, timeDiffSec);
      setCurrentSpeed(speed);
    }

    prevLocationRef.current = userLocation;
    prevTimeRef.current = now;
  }, [userLocation, isCruising]);

  const currentSpot = SPOTS_DATA.find(s => s.id === selectedSpotId) || SPOTS_DATA[0];
  const isCurrentCleared = clearedSpots.includes(selectedSpotId);

  const { isNear: isNearCurrentSpot } = isWithinRadius(userLocation, currentSpot.lngLat, 40);

  useEffect(() => {
    if (!userLocation) return;
    const nearSpot = SPOTS_DATA.find((spot) => {
      const { isNear } = isWithinRadius(userLocation, spot.lngLat, 40);
      return isNear;
    });

    if (nearSpot) {
      setSelectedSpotId(nearSpot.id);
    }
  }, [userLocation]);

  const shouldShowDock = isManuallySelected || isNearCurrentSpot;

  useEffect(() => localStorage.setItem('tw_score', score.toString()), [score]);
  useEffect(() => localStorage.setItem('tw_cleared_spots', JSON.stringify(clearedSpots)), [clearedSpots]);
  useEffect(() => localStorage.setItem('tw_obtained_cards', JSON.stringify(obtainedCards)), [obtainedCards]);
  useEffect(() => localStorage.setItem('tw_nickname', nickname), [nickname]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setShowSplash(false);
      setShowLiquidLoader(true);
    }, 2200);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!buddy?.roomId) { setBuddyTrail([]); return undefined; }
    const roomRef = doc(db, 'buddies', buddy.roomId);
    const unsubscribe = onSnapshot(roomRef, snapshot => {
      if (!snapshot.exists()) { setBuddy(null); setBuddyTrail([]); return; }
      const data = snapshot.data();
      const peerId = data.participants?.find(id => id !== user?.uid);
      const peer = peerId && data.members?.[peerId];
      if (peer) setBuddy(current => current?.roomId === buddy.roomId ? { ...current, ...peer, roomId: buddy.roomId } : current);
      setBuddyTrail(Array.isArray(data.visitedLocations) ? data.visitedLocations : []);
    });
    return unsubscribe;
  }, [buddy?.roomId, user?.uid]);

  useEffect(() => {
    if (!buddy?.roomId || !user?.uid || !visitedLocations.length) return;
    setDoc(doc(db, 'buddies', buddy.roomId), { visitedLocations: arrayUnion(...visitedLocations), updatedAt: Date.now() }, { merge: true })
      .catch(error => console.error('Buddy trail sync failed', error));
  }, [buddy?.roomId, user?.uid, visitedLocations]);

  useEffect(() => {
    if (!showLiquidLoader) return;

    const interval = setInterval(() => {
      setWaterProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval);
          setTimeout(() => setShowLiquidLoader(false), 400);
          return 100;
        }
        return prev + 4;
      });
    }, 40);

    return () => clearInterval(interval);
  }, [showLiquidLoader]);

  useEffect(() => {
    signInAnonymously(auth).catch((err) => console.error(err));
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        setUser(currentUser);
        const userDocRef = doc(db, "users", currentUser.uid);
        const userDoc = await getDoc(userDocRef);
        if (userDoc.exists()) {
          const data = userDoc.data();
          if (data.score > score) setScore(data.score);
          if (data.clearedSpots && data.clearedSpots.length > clearedSpots.length) setClearedSpots(data.clearedSpots);
          if (data.obtainedCards) setObtainedCards(previous => ({ ...previous, ...data.obtainedCards }));
          if (data.nickname) setNickname(data.nickname);
        } else {
          await setDoc(userDocRef, { uid: currentUser.uid, nickname, score, clearedSpots, lastUpdated: new Date() });
        }
      }
    });

    const rankingQuery = query(collection(db, "users"), orderBy("score", "desc"), limit(10));
    const unsubscribeRanking = onSnapshot(rankingQuery, (snapshot) => {
      setRanking(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    return () => { unsubscribe(); unsubscribeRanking(); };
  }, []);

  useEffect(() => {
    if (user) {
      setDoc(doc(db, "users", user.uid), { nickname, score, clearedSpots, obtainedCards, lastUpdated: new Date() }, { merge: true });
    }
  }, [score, clearedSpots, obtainedCards, nickname, user]);

  useEffect(() => {
    if (isAppLoading || mapRef.current || !mapContainerRef.current) return;

    mapRef.current = new mapboxgl.Map({
      container: mapContainerRef.current,
      style: 'mapbox://styles/mapbox/streets-v12',
      center: DEFAULT_CENTER,
      zoom: 17,
      pitch: 15,
      // ズーム範囲と移動範囲を設定し、地図を表示領域内に保つ
      minZoom: 10.5,
      maxBounds: OSAKA_HIRAKATA_BOUNDS
    });

    mapRef.current.on('load', () => {
      if (fogOverlayRef.current && mapRef.current.getCanvasContainer()) {
        mapRef.current.getCanvasContainer().appendChild(fogOverlayRef.current);
      }
      SPOTS_DATA.forEach(spot => {
        const el = document.createElement('div');
        const isCleared = clearedSpots.includes(spot.id);
        el.className = `map-native-marker ${isCleared ? 'cleared' : 'locked'}`;
  
        const iconSrc = isCleared ? '/images/spot-cleared.png' : '/images/spot-locked.png';

        el.innerHTML = `
        <img src="${iconSrc}" class="marker-icon-img" style="width: 36px; height: 36px; object-fit: contain; display: block; margin: 0 auto;" />
        <div class="marker-core-label">${isCleared ? spot.name : '???'}</div>
        `;
        
        el.addEventListener('click', (e) => { 
          e.stopPropagation(); 
          setSelectedSpotId(spot.id);
          setIsManuallySelected(true);
        });

        new mapboxgl.Marker({ element: el, anchor: 'center' }).setLngLat(spot.lngLat).addTo(mapRef.current);
        markersRef.current[spot.id] = { element: el };
      });

      mapRef.current.on('click', () => {
        setIsManuallySelected(false);
      });

      setTimeout(updateFogPosition, 200);
    });
  }, [isAppLoading]);

  useEffect(() => {
    if (isAppLoading || !userLocation || !mapRef.current) return;

    if (!userMarkerRef.current) {
      const el = document.createElement('div');
      el.innerHTML = `<img src="/images/user-pin.png" style="width: 32px; height: 32px; object-fit: contain;" />`;

      userMarkerRef.current = new mapboxgl.Marker({ element: el })
      .setLngLat(userLocation)
      .addTo(mapRef.current);
    } else {
      userMarkerRef.current.setLngLat(userLocation);
    }

    if (!hasCenteredOnUserRef.current) {
      hasCenteredOnUserRef.current = true;
      mapRef.current.flyTo({ center: userLocation, zoom: 17, pitch: 15, duration: 1200 });
    }
  }, [userLocation, isAppLoading]);

  useEffect(() => {
    if (isAppLoading) return;

    Object.keys(markersRef.current).forEach(id => {
      const { element } = markersRef.current[id];
      const spot = SPOTS_DATA.find(s => s.id === id);
      const isCleared = clearedSpots.includes(id);
      const isSelected = id === selectedSpotId;
      if (element) {
        element.className = `map-native-marker mapboxgl-marker ${isCleared ? 'cleared' : 'locked'} ${isSelected ? 'active' : ''}`;
        const labelEl = element.querySelector('.marker-core-label');
        if (labelEl) labelEl.textContent = isCleared ? spot.name : '???';
      }
    });

    if (mapRef.current) {
      if (isFirstRenderRef.current) {
        isFirstRenderRef.current = false;
      } else {
        mapRef.current.easeTo({ center: currentSpot.lngLat, duration: 600 });
      }
      setTimeout(updateFogPosition, 650);
    }
  }, [selectedSpotId, clearedSpots, isAppLoading]);

  const handleRecenter = () => {
    if (mapRef.current) {
      const target = userLocation || currentSpot.lngLat;
      mapRef.current.flyTo({ center: target, zoom: 17, pitch: 20 });
    }
  };

  const animateFogReveal = (spotId) => {
    let currentRad = 0;
    const step = () => {
      if (currentRad < 80) {
        currentRad += 5;
        fogRadiiRef.current[spotId] = currentRad;
        updateFogPosition();
        requestAnimationFrame(step);
      }
    };
    requestAnimationFrame(step);
  };

  const handleAnswerSubmit = (selectedIdx) => {
    if (selectedIdx === currentSpot.quiz.ans) {
      const canClaim = canClaimSpotPoints(currentSpot.id);

      if (canClaim) {
        recordSpotClaim(currentSpot.id);
        const reward = buddy ? 150 : 100;
        setScore(prev => prev + reward);
        setUserPoints(prev => prev + (buddy ? 75 : 50));
        setQuizFeedback('正解！エリアの霧が晴れました。100pt獲得！');
      } else {
        setQuizFeedback('正解！本日のポイントは獲得済みです。');
      }

      setTimeout(() => {
        const spotId = currentSpot.id;
        const today = new Date();
        const obtainedAt = `${today.getFullYear()}.${String(today.getMonth() + 1).padStart(2, '0')}.${String(today.getDate()).padStart(2, '0')}`;
        const isBuddyClear = Boolean(buddy);
        setObtainedCards(previous => ({ ...previous, [spotId]: { ...(previous[spotId] || {}), obtainedAt: previous[spotId]?.obtainedAt || obtainedAt, isBuddyClear: Boolean(previous[spotId]?.isBuddyClear || isBuddyClear) } }));
        setPackSpotId(spotId);
        setPackBuddyClear(isBuddyClear);
        fogRadiiRef.current[currentSpot.id] = 0;
        if (mapRef.current) mapRef.current.flyTo({ center: currentSpot.lngLat, zoom: 18, pitch: 35 });
        animateFogReveal(currentSpot.id);
        setClearedSpots(prev => Array.from(new Set([...prev, currentSpot.id])));
        setShowQuiz(false);
        setQuizSelected(null);
        setQuizFeedback('');
        setIsEncyclopediaOpen(true);
        setShowCardPack(true);
      }, 1500);
    } else {
      setQuizFeedback('不正解。もう一度考えてみましょう。');
      setTimeout(() => {
        setQuizSelected(null);
        setQuizFeedback('');
      }, 2000);
    }
  };

  const handleStartBuddy = async () => {
    if (typeof DeviceMotionEvent !== 'undefined' && typeof DeviceMotionEvent.requestPermission === 'function') {
      try { if (await DeviceMotionEvent.requestPermission() !== 'granted') return; }
      catch (error) { console.error('Motion permission was not granted', error); return; }
    }
    setShowBuddyModal(true);
  };
  const handleBuddyPaired = peer => { setBuddy(peer); setShowBuddyModal(false); };
  const handleLeaveBuddy = async () => {
    const roomId = buddy?.roomId;
    setBuddy(null);
    if (roomId) await deleteDoc(doc(db, 'buddies', roomId)).catch(error => console.error('Buddy room cleanup failed', error));
  };

  const handleARShutter = () => {
    setIsFlash(true);
    setTimeout(() => { setIsFlash(false); setShowARSuccess(true); setScore(prev => prev + 100); }, 200);
  };

  const handleLinkGoogle = async () => {
    try {
      if (!auth.currentUser) return alert('ログイン状態を確認できません。');
      await linkWithPopup(auth.currentUser, googleProvider);
      alert('Googleアカウントとの連携に成功しました。');
    } catch (error) {
      alert('連携エラー: ' + error.message);
    }
  };

  const handleLinkEmail = async (email, password) => {
    try {
      if (!auth.currentUser) return alert('ログイン状態を確認できません。');
      const credential = EmailAuthProvider.credential(email, password);
      await linkWithCredential(auth.currentUser, credential);
      alert('メールアドレスでのアカウント連携に成功しました。');
    } catch (error) {
      if (error.code === 'auth/email-already-in-use') {
        alert('このメールアドレスは既に別のアカウントで使用されています。');
      } else if (error.code === 'auth/weak-password') {
        alert('パスワードは6文字以上で入力してください。');
      } else {
        alert('連携エラー: ' + error.message);
      }
    }
  };

  return (
    <div style={{ width: '100vw', height: '100vh', position: 'relative', overflow: 'hidden', backgroundColor: '#f9fafb' }}>
      {showSplash && <Splash />}

      <LiquidLoader
        show={showLiquidLoader}
        progress={waterProgress}
        message="水都のマップを読み込んでいます..."
      />

      {!isAppLoading && (
        <>
          <Header userScore={score} userName={nickname} buddyName={buddy?.nickname} onLeaveBuddy={handleLeaveBuddy} />

          <div style={{ position: 'absolute', top: '48px', bottom: '82px', left: 0, right: 0, overflowY: 'auto' }}>
            
            {/* マップタブ */}
            <div style={{ width: '100%', height: '100%', position: 'relative', display: activeTab === 'map' ? 'block' : 'none' }}>
              
              <WaterBusCruiseEffect
                isActive={isCruising}
                speed={currentSpeed}
                onEndCruise={() => setIsCruising(false)}
              />

              {!isCruising && (
                <button
                  onClick={() => setShowWaterBusQR(true)}
                  style={{
                    position: 'absolute', top: '16px', right: '16px', zIndex: 80,
                    background: 'linear-gradient(135deg, #0284c7, #0369a1)', color: '#fff',
                    border: 'none', padding: '10px 14px', borderRadius: '20px',
                    fontWeight: 'bold', fontSize: '13px', cursor: 'pointer',
                    boxShadow: '0 4px 12px rgba(2, 132, 199, 0.4)', display: 'flex', alignItems: 'center', gap: '6px'
                  }}
                >
                  水上バスに乗る
                </button>
              )}
              {!buddy && <button onClick={handleStartBuddy} style={{ position: 'absolute', top: '16px', left: '16px', zIndex: 80, background: 'linear-gradient(135deg,#0e7490,#06b6d4)', color: '#fff', border: 0, padding: '10px 14px', borderRadius: 20, fontWeight: 700, fontSize: 13, cursor: 'pointer', boxShadow: '0 4px 12px #0891b255' }}>仲間と合流</button>}

              {/* 📍 現在地ボタン（水上バス乗船ボタンの下に配置） */}
              <button
                onClick={handleRecenter}
                title="現在地へ移動"
                style={{
                  position: 'absolute',
                  top: !isCruising ? '64px' : '16px',
                  right: '16px',
                  zIndex: 80,
                  background: '#ffffff',
                  color: userLocation ? '#0284c7' : '#64748b',
                  border: '1px solid #e2e8f0',
                  padding: '10px 14px',
                  borderRadius: '20px',
                  fontWeight: 'bold',
                  fontSize: '13px',
                  cursor: 'pointer',
                  boxShadow: '0 4px 12px rgba(15, 23, 42, 0.15)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
              >
                📍 現在地
              </button>

              <main className="map-stage-aquatic" style={{ width: '100%', height: '100%' }}>
                <div ref={mapContainerRef} className="mapbox-container" style={{ width: '100%', height: '100%' }} />
                <div ref={fogOverlayRef} className="map-fog-overlay" />
              </main>

              {shouldShowDock && (
                <BottomDock
                  currentSpot={currentSpot}
                  isCurrentCleared={isCurrentCleared}
                  isNearSpot={isNearCurrentSpot}
                  onRecenter={handleRecenter}
                  onOpenQuiz={() => setShowQuiz(true)}
                  onOpenAR={() => setShowAR(true)}
                />
              )}
            </div>

            {/* 特典・クーポンタブ */}
            {activeTab === 'rewards' && (
              <div className="rewards-page">
                <style>{`.rewards-page{max-width:520px;margin:0 auto;padding:20px 16px 28px}.rewards-page h2{letter-spacing:.02em}.rewards-page h3{margin:2px 0 0}.rewards-page .points-card{border:1px solid #ffffff80;background:radial-gradient(circle at 88% 12%,#ffffff55 0 2%,transparent 2.5% 100%),linear-gradient(135deg,rgba(2,132,199,.96),rgba(14,165,233,.93) 58%,rgba(125,211,252,.96));backdrop-filter:blur(18px);-webkit-backdrop-filter:blur(18px);box-shadow:0 18px 40px rgba(2,132,199,.24),inset 0 1px 0 #ffffff80}.rewards-page .coupon-ticket{background:linear-gradient(135deg,rgba(255,255,255,.88),rgba(240,249,255,.68));backdrop-filter:blur(16px);-webkit-backdrop-filter:blur(16px);border:1px solid rgba(255,255,255,.94);box-shadow:0 10px 26px rgba(3,105,161,.12),inset 0 1px 0 #fff;transition:transform .22s cubic-bezier(.22,1,.36,1),box-shadow .22s}.rewards-page .coupon-ticket:hover{transform:translateY(-2px);box-shadow:0 15px 30px rgba(3,105,161,.17),inset 0 1px 0 #fff}.rewards-page .coupon-ticket button{box-shadow:0 5px 14px rgba(2,132,199,.25)}.rewards-page h2{color:#075985;margin:0 0 16px;font-size:22px}.points-card{position:relative;overflow:hidden;padding:22px;border-radius:23px;background:linear-gradient(135deg,#0284c7,#0ea5e9 58%,#7dd3fc);color:#fff;box-shadow:0 16px 30px #0284c733;margin-bottom:22px}.points-card:after{content:'';position:absolute;width:170px;height:170px;border-radius:50%;right:-48px;top:-70px;background:#ffffff25}.points-card *{color:#fff!important}.coupon-ticket{position:relative;display:flex;align-items:center;justify-content:space-between;gap:12px;padding:16px;background:linear-gradient(120deg,#fff,#f0f9ff);border:1px solid #bae6fd;border-radius:17px;box-shadow:0 7px 18px #0369a115}.coupon-ticket:before,.coupon-ticket:after{content:'';position:absolute;top:50%;width:18px;height:18px;background:#e0f2fe;border:1px solid #bae6fd;border-radius:50%;transform:translateY(-50%)}.coupon-ticket:before{left:-10px}.coupon-ticket:after{right:-10px}.coupon-ticket button{transition:transform .18s,background .18s}.coupon-ticket button:hover{background:#0369a1!important;transform:translateY(-1px)}.coupon-ticket button:active{transform:scale(.96)}`}</style>
                <h2>特典・クーポン</h2>
                <div className="points-card"><p style={{fontSize:13,margin:0,fontWeight:600,opacity:.9}}>現在のポイント残高</p><p style={{fontSize:34,fontWeight:800,margin:'6px 0 2px'}}>{userPoints} <span style={{fontSize:15,fontWeight:500}}>pt</span></p><span style={{fontSize:11,letterSpacing:'.12em',opacity:.85}}>SUITO MEMBER</span></div>
                <div style={{display:'flex',flexDirection:'column',gap:12}}><h3 style={{fontSize:16,fontWeight:800,color:'#075985',margin:0}}>利用できるクーポン</h3>
                  {COUPONS_DATA.map(coupon=><div key={coupon.id} className="coupon-ticket"><div><p style={{fontWeight:800,fontSize:15,margin:0,color:'#0c4a6e'}}>{coupon.title}</p><p style={{fontSize:12,color:'#64748b',margin:'5px 0 0'}}>必要ポイント <b style={{color:'#0284c7'}}>{coupon.price} pt</b></p></div><button onClick={()=>setSelectedCoupon(coupon)} style={{background:'#0284c7',color:'#fff',border:0,padding:'9px 14px',borderRadius:10,fontSize:12,fontWeight:800,cursor:'pointer',flexShrink:0}}>使う</button></div>)}
                </div>
              </div>
            )}
            {/* ランキングタブ */}
            {activeTab === 'ranking' && (
              <div className="leaderboard">
                <style>{`.leaderboard{max-width:520px;margin:0 auto;padding:20px 16px 28px}.leaderboard h2{letter-spacing:.02em}.leaderboard .leader-row{background:linear-gradient(140deg,rgba(255,255,255,.88),rgba(240,249,255,.68));border:1px solid rgba(255,255,255,.9);backdrop-filter:blur(16px);-webkit-backdrop-filter:blur(16px);box-shadow:0 9px 22px rgba(3,105,161,.1),inset 0 1px 0 #fff;transition:transform .2s,box-shadow .2s}.leaderboard .leader-row:hover{transform:translateY(-1px);box-shadow:0 13px 26px rgba(3,105,161,.15)}.leaderboard .leader-row.me{background:linear-gradient(135deg,rgba(224,242,254,.96),rgba(186,230,253,.76));border-color:rgba(125,211,252,.9);box-shadow:0 8px 24px rgba(2,132,199,.16),inset 0 1px 0 #fff}.leaderboard .leader-rank{box-shadow:inset 0 1px 0 rgba(255,255,255,.9)}.leaderboard h2{margin:0 0 16px;color:#075985;font-size:22px}.leader-list{display:flex;flex-direction:column;gap:9px}.leader-row{display:flex;align-items:center;gap:12px;padding:13px 14px;background:#fff;border:1px solid #dbeafe;border-radius:16px;box-shadow:0 4px 12px #0369a10b}.leader-row.me{background:#e0f2fe;border-color:#7dd3fc;box-shadow:0 5px 16px #0284c71c}.leader-rank{width:36px;height:36px;display:grid;place-items:center;border-radius:12px;background:#f1f5f9;color:#475569;font-weight:800;flex:none}.leader-rank.gold{background:#fef3c7;color:#b45309}.leader-rank.silver{background:#e2e8f0;color:#475569}.leader-rank.bronze{background:#ffedd5;color:#9a3412}.leader-name{min-width:0;flex:1;font-weight:700;color:#0c4a6e;overflow-wrap:anywhere}.leader-score{color:#0284c7;font-weight:800;white-space:nowrap}.you-badge{padding:4px 8px;border-radius:99px;background:#bae6fd;color:#0369a1;font-size:10px;font-weight:800}`}</style>
                <h2>スコアランキング</h2>
                <div className="leader-list">{ranking.map((item,index)=>{const isMe=Boolean(user?.uid)&&item.uid===user.uid;const medal=['🥇','🥈','🥉'][index];return <div key={item.id||item.uid||index} className={'leader-row'+(isMe?' me':'')}><span className={'leader-rank'+(index===0?' gold':index===1?' silver':index===2?' bronze':'')}>{index<3?'👑 '+(index+1):index+1}</span><span className="leader-name">{item.nickname||'名無し'}</span>{isMe&&<span className="you-badge">あなた</span>}<span className="leader-score">{item.score||0} pt</span></div>})}</div>
              </div>
            )}
            {/* マイページタブ */}
            {activeTab === 'mypage' && (
              <MyPageView
                userName={nickname}
                setUserName={setNickname}
                userScore={score}
                userPoints={userPoints}
                steps={steps}
                onGoogleLogin={handleLinkGoogle}
                onEmailLogin={handleLinkEmail}
                user={user}
              />
            )}
          </div>

          <BottomTabBar activeTab={activeTab} setActiveTab={handleTabChange} />

          <EncyclopediaModal 
            isOpen={isEncyclopediaOpen} 
            onClose={() => { setIsEncyclopediaOpen(false); setActiveTab('map'); }} 
            obtainedCards={obtainedCards}
          />

          {showCardPack && packSpotId && (
            <CardPackModal
              spot={SPOTS_DATA.find(spot => spot.id === packSpotId) || SPOTS_DATA[0]}
              isBuddyClear={packBuddyClear}
              onComplete={() => setShowCardPack(false)}
              onClose={() => setShowCardPack(false)}
            />
          )}

          <CouponUseModal
            isOpen={!!selectedCoupon}
            onClose={() => setSelectedCoupon(null)}
            coupon={selectedCoupon}
          />

          <WaterBusQRModal
            isOpen={showWaterBusQR}
            onClose={() => setShowWaterBusQR(false)}
            onStartCruise={() => setIsCruising(true)}
          />

          <BuddyShakeModal isOpen={showBuddyModal} uid={user?.uid} nickname={nickname} location={userLocation} onClose={() => setShowBuddyModal(false)} onPaired={handleBuddyPaired} />

          {showQuiz && (
            <QuizModal
              currentSpot={currentSpot}
              quizSelected={quizSelected}
              setQuizSelected={setQuizSelected}
              quizFeedback={quizFeedback}
              onClose={() => { setShowQuiz(false); setQuizSelected(null); setQuizFeedback(''); }}
              onSubmit={handleAnswerSubmit}
            />
          )}

          {showAR && (
            <ARViewport
              currentSpot={currentSpot}
              isFlash={isFlash}
              showARSuccess={showARSuccess}
              onShutter={handleARShutter}
              onClose={() => setShowAR(false)}
              onCloseSuccess={() => { setShowARSuccess(false); setShowAR(false); }}
            />
          )}
        </>
      )}
    </div>
  );
}
