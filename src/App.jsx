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
import { doc, setDoc, getDoc, collection, query, orderBy, limit, onSnapshot } from 'firebase/firestore';

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

mapboxgl.accessToken = import.meta.env.VITE_MAPBOX_TOKEN;

const DEFAULT_CENTER = [135.5036, 34.6932];

const COUPONS_DATA = [
  { id: 'cosmos-50', title: 'ドラッグストアコスモス 50円引き', price: 100 },
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

  // 📍 GPS現在地を取得
  const { location: userLocation } = useGeolocation();

  // 🚶 歩数計測フック
  const { steps } = useStepCounter(userLocation);

  const prevProcessedStepsRef = useRef(
    parseInt(localStorage.getItem('tw_processed_steps') || '0', 10)
  );

  // セーブデータ
  const [score, setScore] = useState(() => parseInt(localStorage.getItem('tw_score') || '420', 10));
  const [clearedSpots, setClearedSpots] = useState(() => JSON.parse(localStorage.getItem('tw_cleared_spots') || '["central-hall"]'));
  const [nickname, setNickname] = useState(() => localStorage.getItem('tw_nickname') || `水先案内人_${Math.floor(1000 + Math.random() * 9000)}`);
  const [userPoints, setUserPoints] = useState(120);

  // 🚢 水上バス状態
  const [isCruising, setIsCruising] = useState(false);
  const [currentSpeed, setCurrentSpeed] = useState(0);
  const [showWaterBusQR, setShowWaterBusQR] = useState(false);
  const prevLocationRef = useRef(null);
  const prevTimeRef = useRef(Date.now());

  // タブ状態管理
  const [activeTab, setActiveTab] = useState('map');

  // UI状態
  const [showSplash, setShowSplash] = useState(true);
  const [showLiquidLoader, setShowLiquidLoader] = useState(false);
  const [waterProgress, setWaterProgress] = useState(0);

  const [selectedSpotId, setSelectedSpotId] = useState('central-hall');
  const [isManuallySelected, setIsManuallySelected] = useState(false);
  const [showQuiz, setShowQuiz] = useState(false);
  const [showAR, setShowAR] = useState(false);
  const [isEncyclopediaOpen, setIsEncyclopediaOpen] = useState(false);
  const [quizSelected, setQuizSelected] = useState(null);
  const [quizFeedback, setQuizFeedback] = useState('');
  const [isFlash, setIsFlash] = useState(false);
  const [showARSuccess, setShowARSuccess] = useState(false);

  // 🎫 クーポン選択モーダル状態
  const [selectedCoupon, setSelectedCoupon] = useState(null);

  // Firebase
  const [user, setUser] = useState(null);
  const [ranking, setRanking] = useState([]);

  const isAppLoading = showSplash || showLiquidLoader;

  const handleTabChange = (tabId) => {
    setActiveTab(tabId);
    if (tabId === 'encyclopedia') {
      setIsEncyclopediaOpen(true);
    }
  };

  // 歩数ポイント変換
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

  // 🚶 軌跡フック
  const { visitedLocations } = useVisitedLocations(userLocation);

  const fogRadiiRef = useRef({
    'central-hall': clearedSpots.includes('central-hall') ? 80 : 0,
    'nakanishima-park': clearedSpots.includes('nakanishima-park') ? 80 : 0,
    'osaka-castle-pier': clearedSpots.includes('osaka-castle-pier') ? 80 : 0,
    'river-zone': clearedSpots.includes('river-zone') ? 180 : 0
  });

  // 🌫️ 霧フック
  const { updateFogPosition } = useFogOverlay({
    mapRef,
    fogOverlayRef,
    clearedSpots,
    visitedLocations,
    userLocation,
    fogRadiiRef
  });

  // 🚢 水上バス速度チェック & 川エリア解放
  useEffect(() => {
    if (!userLocation || !isCruising) return;

    const now = Date.now();
    const timeDiffSec = (now - prevTimeRef.current) / 1000;

    if (prevLocationRef.current && timeDiffSec > 2) {
      const speed = calculateSpeedKmH(prevLocationRef.current, userLocation, timeDiffSec);
      setCurrentSpeed(speed);

      // 乗船中 ＋ 有効速度（6〜30km/h）の場合のみ川エリアの霧を晴らす
      if (isValidWaterBusSpeed(speed)) {
        if (!clearedSpots.includes('river-zone')) {
          setClearedSpots((prev) => Array.from(new Set([...prev, 'river-zone'])));
        }
        fogRadiiRef.current['river-zone'] = 180;
        updateFogPosition();
      }
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
  useEffect(() => localStorage.setItem('tw_nickname', nickname), [nickname]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setShowSplash(false);
      setShowLiquidLoader(true);
    }, 2200);
    return () => clearTimeout(timer);
  }, []);

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
      setDoc(doc(db, "users", user.uid), { nickname, score, clearedSpots, lastUpdated: new Date() }, { merge: true });
    }
  }, [score, clearedSpots, nickname, user]);

  useEffect(() => {
    if (isAppLoading || mapRef.current || !mapContainerRef.current) return;

    mapRef.current = new mapboxgl.Map({
      container: mapContainerRef.current,
      style: 'mapbox://styles/mapbox/streets-v12',
      center: DEFAULT_CENTER,
      zoom: 17,
      pitch: 15
    });

    mapRef.current.on('load', () => {
      // 🌫️ 霧の要素を Mapbox 内部のキャンバスコンテナ（地図とマーカーの間）へ直接割り込ませる
      if (fogOverlayRef.current && mapRef.current.getCanvasContainer()) {
        mapRef.current.getCanvasContainer().appendChild(fogOverlayRef.current);
      }
      SPOTS_DATA.forEach(spot => {
        const el = document.createElement('div');
        const isCleared = clearedSpots.includes(spot.id);
        el.className = `map-native-marker ${isCleared ? 'cleared' : 'locked'}`;
  
        // クリア状態に応じて画像のパスを切り替え
        const iconSrc = isCleared ? '/images/spot-cleared.png' : '/images/spot-locked.png';

        el.innerHTML = `
        <img src="${iconSrc}" class="marker-icon-img" style="width: 36px; height: 36px; object-fit: contain; display: block; margin: 0 auto;" />
        <div class="marker-core-label">${isCleared ? spot.name : '？？？'}</div>
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
        if (labelEl) labelEl.textContent = isCleared ? spot.name : '？？？';
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

  // 🎯 クイズ回答（1日1回制限付き）
  const handleAnswerSubmit = () => {
    if (quizSelected === currentSpot.quiz.ans) {
      const canClaim = canClaimSpotPoints(currentSpot.id);

      if (canClaim) {
        recordSpotClaim(currentSpot.id);
        setScore(prev => prev + 100);
        setUserPoints(prev => prev + 50);
        setQuizFeedback('✨ 正解！エリアの霧が晴れ、100pt獲得しました！');
      } else {
        setQuizFeedback('✨ 正解！(※本日のポイントはすでに獲得済みです)');
      }

      setTimeout(() => {
        fogRadiiRef.current[currentSpot.id] = 0;
        if (mapRef.current) mapRef.current.flyTo({ center: currentSpot.lngLat, zoom: 18, pitch: 35 });
        animateFogReveal(currentSpot.id);
        setClearedSpots(prev => Array.from(new Set([...prev, currentSpot.id])));
        setShowQuiz(false);
        setQuizSelected(null);
        setQuizFeedback('');
      }, 1500);
    } else {
      setQuizFeedback('❌ 残念！もう一度考えてみよう。');
    }
  };

  const handleARShutter = () => {
    setIsFlash(true);
    setTimeout(() => { setIsFlash(false); setShowARSuccess(true); setScore(prev => prev + 100); }, 200);
  };

  const handleLinkGoogle = async () => {
    try {
      if (!auth.currentUser) return alert("ログイン状態が確認できません。");
      await linkWithPopup(auth.currentUser, googleProvider);
      alert("🎉 Googleアカウントとの連携に成功しました！");
    } catch (error) {
      alert("連携エラー: " + error.message);
    }
  };

  const handleLinkEmail = async (email, password) => {
    try {
      if (!auth.currentUser) return alert("ログイン状態が確認できません。");
      const credential = EmailAuthProvider.credential(email, password);
      await linkWithCredential(auth.currentUser, credential);
      alert("🎉 メールアドレスでのアカウント連携に成功しました！");
    } catch (error) {
      if (error.code === 'auth/email-already-in-use') {
        alert("このメールアドレスは既に他のアカウントで使用されています。");
      } else if (error.code === 'auth/weak-password') {
        alert("パスワードは6文字以上で入力してください。");
      } else {
        alert("連携エラー: " + error.message);
      }
    }
  };

  return (
    <div style={{ width: '100vw', height: '100vh', position: 'relative', overflow: 'hidden', backgroundColor: '#f9fafb' }}>
      {showSplash && <Splash />}

      <LiquidLoader
        show={showLiquidLoader}
        progress={waterProgress}
        message="水の都マップを読み込んでいます..."
      />

      {!isAppLoading && (
        <>
          <Header userScore={score} userName={nickname} />

          <div style={{ position: 'absolute', top: '48px', bottom: '82px', left: 0, right: 0, overflowY: 'auto' }}>
            
            {/* 🗺️ マップタブ */}
            <div style={{ width: '100%', height: '100%', position: 'relative', display: activeTab === 'map' ? 'block' : 'none' }}>
              
              {/* 🚢 乗船中水しぶきエフェクト ＆ 下船処理ボタン */}
              <WaterBusCruiseEffect
                isActive={isCruising}
                speed={currentSpeed}
                onEndCruise={() => setIsCruising(false)} /* 👈 下船時に通常モードへ復帰 */
              />

              {/* 🚢 水上バス乗船ボタン (乗船していない時のみ表示) */}
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
                  🚢 水上バス乗船
                </button>
              )}

              <main className="map-stage-aquatic" style={{ width: '100%', height: '100%' }}>
                {/* Mapboxのコンテナは絶対に中身を空にしておく */}
                <div ref={mapContainerRef} className="mapbox-container" style={{ width: '100%', height: '100%' }} />
  
                {/* 霧は外側に並べる */}
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

            {/* 📖 図鑑タブ */}
            {activeTab === 'encyclopedia' && (
              <div style={{ padding: '16px', maxWidth: '480px', margin: '0 auto' }}>
                <h2 style={{ fontSize: '18px', fontWeight: 'bold', borderBottom: '1px solid #eee', paddingBottom: '8px', marginBottom: '16px', color: '#111' }}>📖 スポット図鑑</h2>
                <button 
                  onClick={() => setIsEncyclopediaOpen(true)}
                  style={{ width: '100%', padding: '12px', background: '#3b200b', color: '#fef3c7', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', marginBottom: '16px' }}
                >
                  📘 3D図鑑を開く
                </button>
              </div>
            )}

            {/* 🎁 特典・クーポンタブ */}
            {activeTab === 'rewards' && (
              <div style={{ padding: '16px', maxWidth: '480px', margin: '0 auto' }}>
                <h2 style={{ fontSize: '18px', fontWeight: 'bold', borderBottom: '1px solid #eee', paddingBottom: '8px', marginBottom: '16px', color: '#111' }}>🎁 特典・クーポン</h2>
                <div style={{ background: '#fffbeb', border: '1px solid #fef3c7', borderRadius: '12px', padding: '16px', textAlign: 'center', marginBottom: '16px' }}>
                  <p style={{ fontSize: '12px', color: '#b45309', margin: 0, fontWeight: '500' }}>現在の所持ポイント</p>
                  <p style={{ fontSize: '28px', fontWeight: '800', color: '#78350f', margin: '4px 0 0 0' }}>{userPoints} <span style={{ fontSize: '14px', fontWeight: 'normal' }}>pt</span></p>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <h3 style={{ fontSize: '14px', fontWeight: 'bold', color: '#444', margin: 0 }}>利用可能なクーポン</h3>
                  {COUPONS_DATA.map((coupon) => (
                    <div key={coupon.id} style={{ background: '#fff', padding: '12px', borderRadius: '12px', border: '1px solid #eee', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <p style={{ fontWeight: 'bold', fontSize: '14px', margin: 0, color: '#333' }}>{coupon.title}</p>
                        <p style={{ fontSize: '12px', color: '#666', margin: '4px 0 0 0' }}>必要ポイント: {coupon.price} pt</p>
                      </div>
                      <button
                        onClick={() => setSelectedCoupon(coupon)}
                        style={{ background: '#0284c7', color: '#fff', border: 'none', padding: '8px 14px', borderRadius: '8px', fontSize: '12px', fontWeight: 'bold', cursor: 'pointer' }}
                      >
                        使ってみる
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 🏆 ランキングタブ */}
            {activeTab === 'ranking' && (
              <div style={{ padding: '16px', maxWidth: '480px', margin: '0 auto' }}>
                <h2 style={{ fontSize: '18px', fontWeight: 'bold', borderBottom: '1px solid #eee', paddingBottom: '8px', marginBottom: '16px', color: '#111' }}>🏆 スコアランキング</h2>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {ranking.map((item, index) => (
                    <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px', background: '#fff', borderRadius: '8px', border: '1px solid #eee' }}>
                      <span style={{ fontSize: '14px', fontWeight: '500' }}>{item.nickname || '名無し'}</span>
                      <span style={{ fontSize: '14px', fontWeight: 'bold', color: '#2563eb' }}>{item.score || 0} pt</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 👤 マイページタブ */}
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
            onClose={() => setIsEncyclopediaOpen(false)} 
          />

          {/* 🎟️ クーポン使用スワイプモーダル */}
          <CouponUseModal
            isOpen={!!selectedCoupon}
            onClose={() => setSelectedCoupon(null)}
            coupon={selectedCoupon}
          />

          {/* 🚢 水上バスQRチェックインモーダル */}
          <WaterBusQRModal
            isOpen={showWaterBusQR}
            onClose={() => setShowWaterBusQR(false)}
            onStartCruise={() => setIsCruising(true)}
          />

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