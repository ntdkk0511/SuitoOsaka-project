import React, { useEffect, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';

import { auth, db, googleProvider } from './firebase';
import { 
  signInAnonymously, 
  onAuthStateChanged, 
  linkWithPopup, 
  EmailAuthProvider, 
  linkWithCredential,
  unlink,
  reload 
} from 'firebase/auth';
import { doc, setDoc, updateDoc, getDoc, collection, query, orderBy, limit, onSnapshot } from 'firebase/firestore';

import { SPOTS_DATA } from './constants/spots';
import { isWithinRadius } from './utils/geo';
import { useGeolocation } from './hooks/useGeolocation';
import { useVisitedLocations } from './hooks/useVisitedLocations';
import { useFogOverlay } from './hooks/useFogOverlay';
import { useStepCounter } from './hooks/useStepCounter';
import { canClaimSpotPoints, recordSpotClaim } from './utils/cooldown';
import { calculateSpeedKmH, isValidWaterBusSpeed } from './utils/waterRoute';
import { locationForMap, normalizeLocation, normalizeLocations, sanitizeBuddyData } from './utils/buddyData';

import Splash from './components/Splash';
import Header from './components/Header';
import BottomDock from './components/BottomDock';
import QuizModal from './components/QuizModal';
//import ARViewport from './components/ARViewport';
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
  { id: 'cosmos-50', title: 'ドラッグストア コスモス 50円引き', description: '対象店舗でのお買い物に使えるクーポン', price: 100, icon: '🛍️' },
  { id: 'cafe-100', title: '水都カフェ 100円OFFクーポン', description: '中之島・北浜エリアの提携カフェでドリンク100円引き', price: 100, icon: '☕' },
  { id: 'aqualiner-10', title: '大阪水上バス（アクアライナー）乗船料 10%OFF', description: '大阪城港・八軒家浜船着場窓口で提示', price: 300, icon: '🛳️' },
  { id: 'hirakata-sweets', title: '枚方宿 歴史街道 お土産・和菓子 1品プレゼント', description: '枚方公園〜枚方市駅周辺の提携和菓子店で使用可能', price: 200, icon: '🍡' },
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
  const [userPoints, setUserPoints] = useState(() => Number(localStorage.getItem('tw_user_points') ?? 120));

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
  const [isSubmittingAnswer, setIsSubmittingAnswer] = useState(false);
  const answerLockRef = useRef(false);
  const [feedbackCorrect, setFeedbackCorrect] = useState(false);
  const [dockDismissed, setDockDismissed] = useState(false);
  const [distanceLimitEnabled, setDistanceLimitEnabled] = useState(true);
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
  const [pendingCoupon, setPendingCoupon] = useState(null);
  const [showCouponHistory, setShowCouponHistory] = useState(false);

  // Firebase
  const [user, setUser] = useState(null);
  const [profileLoaded, setProfileLoaded] = useState(false);
  const [ranking, setRanking] = useState([]);
  const [showBuddyModal, setShowBuddyModal] = useState(false);
  const [buddy, setBuddy] = useState(null);
  const [buddyTrail, setBuddyTrail] = useState([]);
  const lastBuddySyncRef = useRef({ location: null, at: 0 });

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

  const { visitedLocations, setVisitedLocations, cruisedLocations } = useVisitedLocations(userLocation, isCruising);

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
    ownVisitedLocations: visitedLocations,
    buddyVisitedLocations: buddyTrail,
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

  const challengeRadius = buddy ? 80 : 50;
  const currentSpotDistance = isWithinRadius(userLocation, currentSpot.lngLat, challengeRadius);
  const canAttemptMission = !distanceLimitEnabled || currentSpotDistance.isNear;
  const remainingMissionDistance = currentSpotDistance.distance === null ? null : Math.max(0, currentSpotDistance.distance - challengeRadius);
  const isNearCurrentSpot = currentSpotDistance.isNear;

  useEffect(() => {
    if (!userLocation) return;
    const nearSpot = SPOTS_DATA.find((spot) => {
      const { isNear } = isWithinRadius(userLocation, spot.lngLat, buddy ? 80 : 50);
      return isNear;
    });

    if (nearSpot) {
      setSelectedSpotId(nearSpot.id);
    }
  }, [userLocation, buddy]);

  const shouldShowDock = (isManuallySelected || isNearCurrentSpot) && !dockDismissed;

  useEffect(() => localStorage.setItem('tw_score', score.toString()), [score]);
  useEffect(() => localStorage.setItem('tw_cleared_spots', JSON.stringify(clearedSpots)), [clearedSpots]);
  useEffect(() => localStorage.setItem('tw_obtained_cards', JSON.stringify(obtainedCards)), [obtainedCards]);
  useEffect(() => localStorage.setItem('tw_nickname', nickname), [nickname]);
  useEffect(() => localStorage.setItem('tw_user_points', String(userPoints)), [userPoints]);

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
      const peers = (data.participants || []).filter(id => id !== user?.uid).map(id => data.members?.[id]).filter(Boolean);
      const peer = peers[0];
      if (peer) setBuddy(current => current?.roomId === buddy.roomId ? { ...current, ...peer, peers, location: locationForMap(peer.location), roomId: buddy.roomId } : current);
      const sharedPoints = peers.flatMap(member => normalizeLocations(member.visitedLocations)).concat(normalizeLocations(data.visitedLocations));
      setBuddyTrail([...new Map(sharedPoints.map(point => [`${point.lng}:${point.lat}`, [point.lng, point.lat]])).values()]);
    });
    return unsubscribe;
  }, [buddy?.roomId, user?.uid]);

  useEffect(() => {
    if (!buddy?.roomId || !user?.uid || !userLocation) return;
    const now = Date.now();
    const previous = lastBuddySyncRef.current;
    const movedEnough = !previous.location || isWithinRadius(userLocation, previous.location, 5).isNear === false;
    if (!movedEnough && now - previous.at < 4000) return;
    lastBuddySyncRef.current = { location: userLocation, at: now };
    updateDoc(doc(db, 'buddies', buddy.roomId), sanitizeBuddyData({ [`members.${user.uid}.uid`]: user.uid, [`members.${user.uid}.nickname`]: nickname, [`members.${user.uid}.location`]: normalizeLocation(userLocation), [`members.${user.uid}.visitedLocations`]: normalizeLocations(visitedLocations.slice(-150)), updatedAt: now }))
      .catch(error => console.error('Buddy trail sync failed', error));
  }, [buddy?.roomId, user?.uid, userLocation, nickname, visitedLocations]);

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
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        setProfileLoaded(false);
        setUser(currentUser);
        const userDocRef = doc(db, "users", currentUser.uid);
        const userDoc = await getDoc(userDocRef);
        if (userDoc.exists()) {
          const data = userDoc.data();
          if (data.score > score) setScore(data.score);
          if (Number.isFinite(data.userPoints)) setUserPoints(data.userPoints);
          if (data.clearedSpots && data.clearedSpots.length > clearedSpots.length) setClearedSpots(data.clearedSpots);
          if (data.obtainedCards) setObtainedCards(previous => ({ ...previous, ...data.obtainedCards }));
          if (data.nickname) setNickname(data.nickname);
          if (Array.isArray(data.visitedLocations) && data.visitedLocations.length) {
            const cloudTrail = normalizeLocations(data.visitedLocations).map(point => [point.lng, point.lat]);
            localStorage.setItem('tw_cloud_visited_locations', JSON.stringify(cloudTrail));
            setVisitedLocations(previous => [...new Map([...cloudTrail, ...normalizeLocations(previous).map(point => [point.lng, point.lat])].map(point => [`${point[0]}:${point[1]}`, point])).values()]);
          }
        } else {
          await setDoc(userDocRef, sanitizeBuddyData({ uid: currentUser.uid, nickname, score, userPoints, clearedSpots, obtainedCards, visitedLocations, lastUpdated: new Date() }));
        }
        setProfileLoaded(true);
      } else {
        setUser(null);
        setProfileLoaded(false);
        signInAnonymously(auth).catch((err) => console.error(err));
      }
    });

    const rankingQuery = query(collection(db, "users"), orderBy("score", "desc"), limit(10));
    const unsubscribeRanking = onSnapshot(rankingQuery, (snapshot) => {
      setRanking(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    return () => { unsubscribe(); unsubscribeRanking(); };
  }, []);

  useEffect(() => {
    if (user && profileLoaded) {
      setDoc(doc(db, "users", user.uid), sanitizeBuddyData({ uid: user.uid, nickname, score, userPoints, clearedSpots, obtainedCards, visitedLocations: visitedLocations.slice(-150), lastUpdated: new Date() }), { merge: true })
        .catch(error => console.error('User profile save failed', error));
    }
  }, [score, userPoints, clearedSpots, obtainedCards, nickname, visitedLocations, user, profileLoaded]);

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
        const isCleared = clearedSpots.includes(spot.id) || Boolean(obtainedCards[spot.id]);
        el.className = `map-native-marker ${isCleared ? 'cleared' : 'locked'}`;
  
        const iconSrc = isCleared ? '/images/spot-cleared.png' : '/images/spot-locked.png';

        el.title = isCleared ? spot.name : '???';
        el.setAttribute('aria-label', isCleared ? spot.name : '未発見のスポット (???)');
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
  }, [isAppLoading, obtainedCards, clearedSpots]);

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
    if (!mapRef.current || !buddy?.location) return;
    if (!markersRef.current.buddy) {
      const element = document.createElement('div');
      element.setAttribute('aria-label', `${buddy.nickname || 'パートナー'}の現在地`);
      element.innerHTML = '<div style="width:30px;height:30px;border-radius:50%;background:#fb7185;border:3px solid white;box-shadow:0 2px 10px #0f172a55;display:grid;place-items:center;color:white;font-weight:800">B</div>';
      markersRef.current.buddy = new mapboxgl.Marker({ element, anchor: 'center' }).setLngLat(buddy.location).addTo(mapRef.current);
    } else markersRef.current.buddy.setLngLat(buddy.location);
  }, [buddy?.location, buddy?.nickname, isAppLoading]);

  useEffect(() => {
    if (isAppLoading) return;

    Object.keys(markersRef.current).forEach(id => {
      const { element } = markersRef.current[id];
      const spot = SPOTS_DATA.find(s => s.id === id);
      const isCleared = clearedSpots.includes(id) || Boolean(obtainedCards[id]);
      const isSelected = id === selectedSpotId;
      if (element) {
        element.className = `map-native-marker mapboxgl-marker ${isCleared ? 'cleared' : 'locked'} ${isSelected ? 'active' : ''}`;
        const labelEl = element.querySelector('.marker-core-label');
        const iconEl = element.querySelector('.marker-icon-img');
        if (iconEl) iconEl.src = isCleared ? '/images/spot-cleared.png' : '/images/spot-locked.png';
        if (labelEl) labelEl.textContent = isCleared ? spot.name : '???';
        if (spot) {
          element.title = isCleared ? spot.name : '???';
          element.setAttribute('aria-label', isCleared ? spot.name : '未発見のスポット (???)');
        }
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
  }, [selectedSpotId, clearedSpots, obtainedCards, isAppLoading]);

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
    if (answerLockRef.current || clearedSpots.includes(currentSpot.id)) return;
    if (!canAttemptMission) {
      setShowQuiz(false);
      setQuizFeedback('チェックポイントに近づくとミッションに挑戦できます。');
      return;
    }
    if (selectedIdx === currentSpot.quiz.ans) {
      answerLockRef.current = true;
      setFeedbackCorrect(true);
      setIsSubmittingAnswer(true);
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
        setIsSubmittingAnswer(false);
        setShowCardPack(true);
      }, 1500);
    } else {
      setFeedbackCorrect(false);
      answerLockRef.current = true;
      setQuizFeedback('不正解。もう一度考えてみましょう。');
      setTimeout(() => {
        setQuizSelected(null);
        setQuizFeedback('');
        setIsSubmittingAnswer(false);
        answerLockRef.current = false;
      }, 2000);
    }
  };

  const handleStartBuddy = () => {
    setShowBuddyModal(true);
  };
  const handleBuddyPaired = peer => { setBuddy({ ...peer, location: locationForMap(peer.location) }); setShowBuddyModal(false); };
  const handleLeaveBuddy = async () => {
    const roomId = buddy?.roomId;
    setBuddy(null);
    if (roomId && user?.uid) {
      const roomRef = doc(db, 'buddies', roomId);
      const room = await getDoc(roomRef).catch(() => null);
      await setDoc(roomRef, { participants: (room?.data()?.participants || []).filter(id => id !== user.uid), updatedAt: Date.now() }, { merge: true }).catch(error => console.error('Buddy room cleanup failed', error));
    }
    if (markersRef.current.buddy) { markersRef.current.buddy.remove(); delete markersRef.current.buddy; }
  };

  const handleARShutter = () => {
    setIsFlash(true);
    setTimeout(() => { setIsFlash(false); setShowARSuccess(true); }, 200);
  };

  const handleLinkGoogle = async () => {
    try {
      if (!auth.currentUser) return alert('ログイン状態を確認できません。');
      const result = await linkWithPopup(auth.currentUser, googleProvider);
      setUser(result.user);
      alert('Googleアカウントと連携しました。');
    } catch (error) { alert(`Google連携に失敗しました: ${error.message}`); }
  };
  const handleUnlinkProvider = async providerId => {
    try { const current=auth.currentUser; if (!current) return; await unlink(current, providerId); await reload(current); setUser({ ...current }); alert('連携を解除しました。'); }
    catch (error) { alert(`連携解除に失敗しました: ${error.message}`); }
  };
  const handleLinkEmail = async (email, password) => {
    try {
      if (!auth.currentUser) return alert('ログイン状態を確認できません。');
      if (password.length < 6) { alert('パスワードは6文字以上で入力してください。'); return; }
      const credential = EmailAuthProvider.credential(email, password);
      const result = await linkWithCredential(auth.currentUser, credential);
      setUser(result.user);
      alert('メールアドレスと連携しました。');
    } catch (error) {
      if (error.code === 'auth/email-already-in-use') alert('このメールアドレスはすでに別のアカウントで使用されています。');
      else if (error.code === 'auth/weak-password') alert('パスワードは6文字以上で入力してください。');
      else alert(`メール連携に失敗しました: ${error.message}`);
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

              <div style={{ position: 'absolute', top: '72px', right: '14px', display: 'flex', flexDirection: 'column', gap: '12px', zIndex: 20 }}>
                <button onClick={buddy ? handleLeaveBuddy : handleStartBuddy} aria-label={buddy ? '合流を解除する' : '友達合流'} title={buddy ? '合流を解除する' : '友達合流'} style={{ position: 'relative', width: '48px', height: '48px', minWidth: '48px', minHeight: '48px', padding: 0, borderRadius: '50%', backgroundColor: 'rgba(255, 255, 255, 0.95)', border: '1.5px solid #bae6fd', boxShadow: '0 4px 12px rgba(14, 165, 233, 0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#0284c7', cursor: 'pointer' }}>
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><circle cx="9" cy="8" r="3"/><path d="M3.5 19c.4-3 2.3-4.5 5.5-4.5s5.1 1.5 5.5 4.5M16 5.5a3 3 0 0 1 0 5.8M17 14.7c2.2.4 3.4 1.8 3.7 4.3"/></svg>
                  {buddy && <span aria-label="オンライン" style={{ position: 'absolute', top: '0px', right: '0px', width: '12px', height: '12px', borderRadius: '50%', backgroundColor: '#22c55e', border: '2px solid #ffffff' }} />}
                </button>
                {!isCruising && (
                  <button onClick={() => setShowWaterBusQR(true)} aria-label="水上バス乗船" title="水上バス乗船" style={{ position: 'relative', width: '48px', height: '48px', minWidth: '48px', minHeight: '48px', padding: 0, borderRadius: '50%', backgroundColor: 'rgba(255, 255, 255, 0.95)', border: '1.5px solid #bae6fd', boxShadow: '0 4px 12px rgba(14, 165, 233, 0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#0284c7', cursor: 'pointer' }}>
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><path d="M3 16.5 5 9h14l2 7.5-4 3-5-3-5 3-4-3Z"/><path d="M8 9V5h8v4M2 21c1.2-1 2.3-1 3.5 0s2.3 1 3.5 0 2.3-1 3.5 0 2.3 1 3.5 0 2.3-1 3.5 0 2.3 1 3.5 0"/></svg>
                  </button>
                )}
                <button onClick={handleRecenter} title="現在地へ移動" aria-label="現在地へ移動" style={{ position: 'relative', width: '48px', height: '48px', minWidth: '48px', minHeight: '48px', padding: 0, borderRadius: '50%', backgroundColor: 'rgba(255, 255, 255, 0.95)', border: '1.5px solid #bae6fd', boxShadow: '0 4px 12px rgba(14, 165, 233, 0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#0284c7', cursor: 'pointer' }}>
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><circle cx="12" cy="12" r="7"/><circle cx="12" cy="12" r="2"/><path d="M12 2v3m0 14v3M2 12h3m14 0h3"/></svg>
                </button>
              </div>

              <button
                type="button"
                aria-pressed={!distanceLimitEnabled}
                onClick={() => setDistanceLimitEnabled(enabled => !enabled)}
                style={{ position: 'absolute', top: '58px', left: '12px', zIndex: 25, border: '1px solid #bae6fd', borderRadius: 999, padding: '7px 10px', background: distanceLimitEnabled ? 'rgba(255,255,255,.94)' : '#fef3c7', color: distanceLimitEnabled ? '#075985' : '#92400e', boxShadow: '0 3px 10px #07598522', fontSize: 11, fontWeight: 800, cursor: 'pointer' }}
              >
                {distanceLimitEnabled ? '距離制限: ON' : '距離制限: OFF (テスト用)'}
              </button>

              <main className="map-stage-aquatic" style={{ width: '100%', height: '100%' }}>
                <div ref={mapContainerRef} className="mapbox-container" style={{ width: '100%', height: '100%' }} />
                <div ref={fogOverlayRef} className="map-fog-overlay" />
              </main>

              {shouldShowDock && (
                <BottomDock
                  currentSpot={currentSpot}
                  isCurrentCleared={isCurrentCleared}
                  isNearSpot={canAttemptMission}
                  distanceLimitEnabled={distanceLimitEnabled}
                  remainingDistance={remainingMissionDistance}
                  onRecenter={handleRecenter}
                  onOpenQuiz={() => { if (canAttemptMission) { setQuizFeedback(''); setShowQuiz(true); } }}
                  onOpenAR={() => setShowAR(true)}
                  onClose={() => { setDockDismissed(true); setIsManuallySelected(false); }}
                />
              )}
              {!shouldShowDock && (isNearCurrentSpot || isManuallySelected) && <button type="button" aria-label="スポット情報を再表示" onClick={() => setDockDismissed(false)} style={{position:'fixed',right:14,bottom:'calc(88px + env(safe-area-inset-bottom))',zIndex:31,border:'1px solid #bae6fd',borderRadius:999,padding:'8px 12px',background:'#fff',color:'#075985',boxShadow:'0 4px 14px #07598533'}}>スポット情報</button>}
            </div>

            {/* 特典・クーポンタブ */}
            {activeTab === 'rewards' && (
              <div className="rewards-page">
                <style>{`.rewards-page{max-width:520px;margin:0 auto;padding:20px 16px 28px}.rewards-page h2{letter-spacing:.02em}.rewards-page h3{margin:2px 0 0}.rewards-page .points-card{border:1px solid #ffffff80;background:radial-gradient(circle at 88% 12%,#ffffff55 0 2%,transparent 2.5% 100%),linear-gradient(135deg,rgba(2,132,199,.96),rgba(14,165,233,.93) 58%,rgba(125,211,252,.96));backdrop-filter:blur(18px);-webkit-backdrop-filter:blur(18px);box-shadow:0 18px 40px rgba(2,132,199,.24),inset 0 1px 0 #ffffff80}.rewards-page .coupon-ticket{background:linear-gradient(135deg,rgba(255,255,255,.88),rgba(240,249,255,.68));backdrop-filter:blur(16px);-webkit-backdrop-filter:blur(16px);border:1px solid rgba(255,255,255,.94);box-shadow:0 10px 26px rgba(3,105,161,.12),inset 0 1px 0 #fff;transition:transform .22s cubic-bezier(.22,1,.36,1),box-shadow .22s}.rewards-page .coupon-ticket:hover{transform:translateY(-2px);box-shadow:0 15px 30px rgba(3,105,161,.17),inset 0 1px 0 #fff}.rewards-page .coupon-ticket button{box-shadow:0 5px 14px rgba(2,132,199,.25)}.rewards-page h2{color:#075985;margin:0 0 16px;font-size:22px}.points-card{position:relative;overflow:hidden;padding:22px;border-radius:23px;background:linear-gradient(135deg,#0284c7,#0ea5e9 58%,#7dd3fc);color:#fff;box-shadow:0 16px 30px #0284c733;margin-bottom:22px}.points-card:after{content:'';position:absolute;width:170px;height:170px;border-radius:50%;right:-48px;top:-70px;background:#ffffff25}.points-card *{color:#fff!important}.coupon-ticket{position:relative;display:flex;align-items:center;justify-content:space-between;gap:12px;padding:16px;background:linear-gradient(120deg,#fff,#f0f9ff);border:1px solid #bae6fd;border-radius:17px;box-shadow:0 7px 18px #0369a115}.coupon-ticket:before,.coupon-ticket:after{content:'';position:absolute;top:50%;width:18px;height:18px;background:#e0f2fe;border:1px solid #bae6fd;border-radius:50%;transform:translateY(-50%)}.coupon-ticket:before{left:-10px}.coupon-ticket:after{right:-10px}.coupon-ticket button{transition:transform .18s,background .18s}.coupon-ticket button:hover{background:#0369a1!important;transform:translateY(-1px)}.coupon-ticket button:active{transform:scale(.96)}`}</style>
                <h2>特典・クーポン</h2>
                <div className="points-card"><p style={{fontSize:13,margin:0,fontWeight:600,opacity:.9}}>現在のポイント残高</p><p style={{fontSize:34,fontWeight:800,margin:'6px 0 2px'}}>{userPoints} <span style={{fontSize:15,fontWeight:500}}>pt</span></p><span style={{fontSize:11,letterSpacing:'.12em',opacity:.85}}>SUITO MEMBER</span></div>
                <div style={{display:'flex',flexDirection:'column',gap:12}}><h3 style={{fontSize:16,fontWeight:800,color:'#075985',margin:0}}>利用できるクーポン</h3>
                  {COUPONS_DATA.map(coupon=><div key={coupon.id} className="coupon-ticket"><div style={{display:'flex',gap:12,alignItems:'center'}}><span aria-hidden="true" style={{fontSize:27,background:'#e0f2fe',borderRadius:12,padding:8}}>{coupon.icon}</span><div><p style={{fontWeight:800,fontSize:15,margin:0,color:'#0c4a6e'}}>{coupon.title}</p><p style={{fontSize:12,color:'#64748b',margin:'5px 0 0'}}>{coupon.description}</p><p style={{fontSize:12,color:'#64748b',margin:'5px 0 0'}}>必要ポイント <b style={{color:'#0284c7'}}>{coupon.price} pt</b></p></div></div><button disabled={userPoints < coupon.price} onClick={()=>setPendingCoupon(coupon)} style={{background:userPoints < coupon.price ? '#94a3b8' : '#0284c7',color:'#fff',border:0,padding:'9px 14px',borderRadius:10,fontSize:12,fontWeight:800,cursor:userPoints < coupon.price?'not-allowed':'pointer',flexShrink:0}}>{userPoints < coupon.price ? `あと${coupon.price-userPoints}pt` : '使う'}</button></div>)}
                  {COUPONS_DATA.some(coupon => Number(localStorage.getItem(`tw_coupon_used_${coupon.id}`) || 0) > Date.now()) && <button type="button" onClick={() => setShowCouponHistory(true)} style={{alignSelf:'flex-start',border:'1px solid #7dd3fc',borderRadius:12,padding:'11px 14px',background:'#fff',color:'#075985',fontWeight:700,cursor:'pointer'}}>使用中のクーポンを再表示</button>}
                </div>
              </div>
            )}
            {/* ランキングタブ */}
            {activeTab === 'ranking' && (
              <div className="leaderboard">
                <style>{`.leaderboard{max-width:520px;margin:0 auto;padding:20px 16px 28px}.leaderboard h2{letter-spacing:.02em}.leaderboard .leader-row{background:linear-gradient(140deg,rgba(255,255,255,.88),rgba(240,249,255,.68));border:1px solid rgba(255,255,255,.9);backdrop-filter:blur(16px);-webkit-backdrop-filter:blur(16px);box-shadow:0 9px 22px rgba(3,105,161,.1),inset 0 1px 0 #fff;transition:transform .2s,box-shadow .2s}.leaderboard .leader-row:hover{transform:translateY(-1px);box-shadow:0 13px 26px rgba(3,105,161,.15)}.leaderboard .leader-row.me{background:linear-gradient(135deg,rgba(224,242,254,.96),rgba(186,230,253,.76));border-color:rgba(125,211,252,.9);box-shadow:0 8px 24px rgba(2,132,199,.16),inset 0 1px 0 #fff}.leaderboard .leader-rank{box-shadow:inset 0 1px 0 rgba(255,255,255,.9)}.leaderboard h2{margin:0 0 16px;color:#075985;font-size:22px}.leader-list{display:flex;flex-direction:column;gap:9px}.leader-row{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:13px 14px;background:#fff;border:1px solid #dbeafe;border-radius:16px;box-shadow:0 4px 12px #0369a10b}.leader-row.me{background:#e0f2fe;border-color:#7dd3fc;box-shadow:0 5px 16px #0284c71c}.leader-rank{min-width:52px;height:36px;padding:6px 10px;box-sizing:border-box;display:flex;align-items:center;justify-content:center;border-radius:12px;background:#f1f5f9;color:#475569;font-weight:800;flex:none;flex-shrink:0;white-space:nowrap}.leader-rank.gold{background:#fef3c7;color:#b45309}.leader-rank.silver{background:#e2e8f0;color:#475569}.leader-rank.bronze{background:#ffedd5;color:#9a3412}.leader-name{min-width:0;flex:1;font-weight:700;color:#0c4a6e;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.leader-score{flex-shrink:0;color:#0284c7;font-weight:800;white-space:nowrap}.you-badge{flex-shrink:0;white-space:nowrap;padding:4px 8px;border-radius:99px;background:#bae6fd;color:#0369a1;font-size:10px;font-weight:800}`}</style>
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
                onUnlink={handleUnlinkProvider}
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

          {pendingCoupon && <div role="dialog" aria-modal="true" style={{position:'fixed',inset:0,zIndex:12000,display:'grid',placeItems:'center',background:'#082f4988',padding:20}}><div style={{background:'white',padding:24,borderRadius:20,maxWidth:360,width:'100%',boxSizing:'border-box',textAlign:'center',boxShadow:'0 18px 48px #082f4940'}}><h3>{pendingCoupon.title}を使用しますか？</h3><p>{pendingCoupon.price}ptを消費します。現在の保有ポイントは{userPoints}ptです。</p><div style={{display:'flex',gap:10,marginTop:20}}><button style={{flex:1,minHeight:48,padding:'12px 14px',border:0,borderRadius:12,background:'#0284c7',color:'#fff',fontSize:15,fontWeight:800,cursor:'pointer',boxShadow:'0 4px 12px #0284c744'}} onClick={()=>{if(userPoints < pendingCoupon.price)return;const now=Date.now();localStorage.setItem(`tw_coupon_used_${pendingCoupon.id}`,String(now+5*60*1000));localStorage.setItem(`tw_coupon_used_at_${pendingCoupon.id}`,new Date(now).toISOString());setUserPoints(points=>points-pendingCoupon.price);setSelectedCoupon(pendingCoupon);setPendingCoupon(null);}}>確認して使う</button><button style={{flex:1,minHeight:48,padding:'12px 14px',border:'1px solid #94a3b8',borderRadius:12,background:'#fff',color:'#334155',fontSize:15,fontWeight:700,cursor:'pointer'}} onClick={()=>setPendingCoupon(null)}>キャンセル</button></div></div></div>}

          <WaterBusQRModal
            isOpen={showWaterBusQR}
            onClose={() => setShowWaterBusQR(false)}
            onStartCruise={() => setIsCruising(true)}
          />

          <BuddyShakeModal isOpen={showBuddyModal} currentRoomId={buddy?.roomId} uid={user?.uid} nickname={nickname} location={userLocation} visitedLocations={visitedLocations} onClose={() => setShowBuddyModal(false)} onPaired={handleBuddyPaired} />

          {activeTab === 'rewards' && showCouponHistory && <div role="dialog" aria-modal="true" style={{position:'fixed',inset:0,zIndex:12001,display:'grid',placeItems:'center',background:'#082f4988',padding:20}}><div style={{background:'#fff',padding:20,borderRadius:18,width:'min(360px,90vw)'}}><h3>使用済み・有効なクーポン</h3>{COUPONS_DATA.filter(coupon => Number(localStorage.getItem(`tw_coupon_used_${coupon.id}`) || 0) > Date.now()).map(coupon=><button key={coupon.id} onClick={()=>{setSelectedCoupon(coupon);setShowCouponHistory(false);}} style={{display:'block',width:'100%',padding:12,margin:'8px 0',border:'1px solid #bae6fd',borderRadius:10,background:'#effaff'}}>再表示：{coupon.title}</button>)}<button onClick={()=>setShowCouponHistory(false)}>閉じる</button></div></div>}
          {showQuiz && (
            <QuizModal
              currentSpot={currentSpot}
              isCurrentCleared={isCurrentCleared}
              quizSelected={quizSelected}
              setQuizSelected={setQuizSelected}
              quizFeedback={quizFeedback}
              feedbackCorrect={feedbackCorrect}
              isSubmitting={isSubmittingAnswer}
              onClose={() => { setShowQuiz(false); setQuizSelected(null); setQuizFeedback(''); setIsSubmittingAnswer(false); answerLockRef.current = false; }}
              onSubmit={handleAnswerSubmit}
            />
          )}

          
          {/*showAR && (
            <ARViewport
              currentSpot={currentSpot}
              isFlash={isFlash}
              showARSuccess={showARSuccess}
              onShutter={handleARShutter}
              onClose={() => setShowAR(false)}
              onCloseSuccess={() => { setShowARSuccess(false); setShowAR(false); }}
            />
          )*/}
          
        </>
      )}
    </div>
  );
}
