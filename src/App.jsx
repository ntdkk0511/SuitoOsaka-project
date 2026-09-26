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

import Splash from './components/Splash';
import Header from './components/Header';
import BottomDock from './components/BottomDock';
import QuizModal from './components/QuizModal';
import ARViewport from './components/ARViewport';
import BottomTabBar from './components/BottomTabBar';
import MyPageView from './components/MyPageView';

mapboxgl.accessToken = import.meta.env.VITE_MAPBOX_TOKEN;

const DEFAULT_CENTER = [135.5036, 34.6932];

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

  // 歩数に応じたポイント自動計算
  const prevProcessedStepsRef = useRef(
    parseInt(localStorage.getItem('tw_processed_steps') || '0', 10)
  );

  // セーブデータ
  const [score, setScore] = useState(() => parseInt(localStorage.getItem('tw_score') || '420', 10));
  const [clearedSpots, setClearedSpots] = useState(() => JSON.parse(localStorage.getItem('tw_cleared_spots') || '["central-hall"]'));
  const [nickname, setNickname] = useState(() => localStorage.getItem('tw_nickname') || `水先案内人_${Math.floor(1000 + Math.random() * 9000)}`);
  const [userPoints, setUserPoints] = useState(120);

  // タブ状態管理 (map | encyclopedia | rewards | ranking | mypage)
  const [activeTab, setActiveTab] = useState('map');

  // UI状態
  const [showSplash, setShowSplash] = useState(true);
  const [selectedSpotId, setSelectedSpotId] = useState('central-hall');
  const [isManuallySelected, setIsManuallySelected] = useState(false);
  const [showQuiz, setShowQuiz] = useState(false);
  const [showAR, setShowAR] = useState(false);
  const [quizSelected, setQuizSelected] = useState(null);
  const [quizFeedback, setQuizFeedback] = useState('');
  const [isFlash, setIsFlash] = useState(false);
  const [showARSuccess, setShowARSuccess] = useState(false);

  // Firebase
  const [user, setUser] = useState(null);
  const [ranking, setRanking] = useState([]);

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
    'osaka-castle-pier': clearedSpots.includes('osaka-castle-pier') ? 80 : 0
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

  const currentSpot = SPOTS_DATA.find(s => s.id === selectedSpotId) || SPOTS_DATA[0];
  const isCurrentCleared = clearedSpots.includes(selectedSpotId);

  // 🎯 選択中のスポットの40m以内にいるか判定
  const { isNear: isNearCurrentSpot } = isWithinRadius(userLocation, currentSpot.lngLat, 40);

  // 🚶 位置移動時：40m以内にスポットがあれば自動的にそのスポットに切り替える
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

  // 💡 ピンタップ時 または 40m接近時のみドック表示
  const shouldShowDock = isManuallySelected || isNearCurrentSpot;

  // LocalStorage 保存
  useEffect(() => localStorage.setItem('tw_score', score.toString()), [score]);
  useEffect(() => localStorage.setItem('tw_cleared_spots', JSON.stringify(clearedSpots)), [clearedSpots]);
  useEffect(() => localStorage.setItem('tw_nickname', nickname), [nickname]);

  // スプラッシュタイマー
  useEffect(() => {
    const timer = setTimeout(() => setShowSplash(false), 2500);
    return () => clearTimeout(timer);
  }, []);

  // Firebase
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

  // Mapbox 初期化
  useEffect(() => {
    if (mapRef.current) return;

    mapRef.current = new mapboxgl.Map({
      container: mapContainerRef.current,
      style: 'mapbox://styles/mapbox/streets-v12',
      center: DEFAULT_CENTER,
      zoom: 13.5,
      pitch: 15
    });

    mapRef.current.on('load', () => {
      SPOTS_DATA.forEach(spot => {
        const el = document.createElement('div');
        const isCleared = clearedSpots.includes(spot.id);
        el.className = `map-native-marker ${isCleared ? 'cleared' : 'locked'}`;
        el.innerHTML = `<div class="marker-core-circle"><div class="marker-pulse-ring"></div></div><div class="marker-core-label">${isCleared ? spot.name : '？？？'}</div>`;
        
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
  }, []);

  // 📍 現在地表示
  useEffect(() => {
    if (!userLocation || !mapRef.current) return;

    if (!userMarkerRef.current) {
      const el = document.createElement('div');
      el.style.width = '16px';
      el.style.height = '16px';
      el.style.backgroundColor = '#00bfff';
      el.style.border = '2px solid white';
      el.style.borderRadius = '50%';
      el.style.boxShadow = '0 0 12px rgba(0, 191, 255, 0.8)';

      userMarkerRef.current = new mapboxgl.Marker({ element: el })
        .setLngLat(userLocation)
        .addTo(mapRef.current);
    } else {
      userMarkerRef.current.setLngLat(userLocation);
    }

    if (!hasCenteredOnUserRef.current) {
      hasCenteredOnUserRef.current = true;
      mapRef.current.flyTo({ center: userLocation, zoom: 15, pitch: 15, duration: 1200 });
    }
  }, [userLocation]);

  // スポット選択更新
  useEffect(() => {
    Object.keys(markersRef.current).forEach(id => {
      const { element } = markersRef.current[id];
      const spot = SPOTS_DATA.find(s => s.id === id);
      const isCleared = clearedSpots.includes(id);
      const isSelected = id === selectedSpotId;
      element.className = `map-native-marker ${isCleared ? 'cleared' : 'locked'} ${isSelected ? 'active' : ''}`;
      const labelEl = element.querySelector('.marker-core-label');
      if (labelEl) labelEl.textContent = isCleared ? spot.name : '？？？';
    });

    if (mapRef.current) {
      if (isFirstRenderRef.current) {
        isFirstRenderRef.current = false;
      } else {
        mapRef.current.easeTo({ center: currentSpot.lngLat, duration: 600 });
      }
      setTimeout(updateFogPosition, 650);
    }
  }, [selectedSpotId, clearedSpots]);

  // アクションハンドラー
  const handleRecenter = () => {
    if (mapRef.current) {
      const target = userLocation || currentSpot.lngLat;
      mapRef.current.flyTo({ center: target, zoom: 15, pitch: 20 });
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

  const handleAnswerSubmit = () => {
    if (quizSelected === currentSpot.quiz.ans) {
      setQuizFeedback('✨ 正解！エリアの霧が晴れました！');
      setTimeout(() => {
        fogRadiiRef.current[currentSpot.id] = 0;
        if (mapRef.current) mapRef.current.flyTo({ center: currentSpot.lngLat, zoom: 15.5, pitch: 35 });
        animateFogReveal(currentSpot.id);
        setClearedSpots(prev => [...prev, currentSpot.id]);
        setScore(prev => prev + 100);
        setShowQuiz(false);
        setQuizSelected(null);
        setQuizFeedback('');
      }, 1200);
    } else {
      setQuizFeedback('❌ 残念！もう一度考えてみよう。');
    }
  };

  const handleARShutter = () => {
    setIsFlash(true);
    setTimeout(() => { setIsFlash(false); setShowARSuccess(true); setScore(prev => prev + 100); }, 200);
  };

  // 🌐 Google連携ハンドラー
  const handleLinkGoogle = async () => {
    try {
      if (!auth.currentUser) return alert("ログイン状態が確認できません。");
      await linkWithPopup(auth.currentUser, googleProvider);
      alert("🎉 Googleアカウントとの連携に成功しました！");
    } catch (error) {
      alert("連携エラー: " + error.message);
    }
  };

  // 📧 メールアドレス連携ハンドラー（※ここが抜けていたためエラーになっていました）
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

      {/* 固定ヘッダー */}
      <Header userScore={score} userName={nickname} />

      {/* メイン表示エリア */}
      <div style={{ position: 'absolute', top: '48px', bottom: '60px', left: 0, right: 0, overflowY: 'auto' }}>
        
        {/* 🗺️ マップタブ */}
        <div style={{ width: '100%', height: '100%', position: 'relative', display: activeTab === 'map' ? 'block' : 'none' }}>
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

        {/* 📖 図鑑タブ */}
        {activeTab === 'encyclopedia' && (
          <div style={{ padding: '16px', maxWidth: '480px', margin: '0 auto' }}>
            <h2 style={{ fontSize: '18px', fontWeight: 'bold', borderBottom: '1px solid #eee', paddingBottom: '8px', marginBottom: '16px', color: '#111' }}>📖 スポット図鑑</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {SPOTS_DATA.map((spot) => {
                const isCleared = clearedSpots.includes(spot.id);
                return (
                  <div key={spot.id} style={{ padding: '12px', background: '#fff', borderRadius: '8px', border: '1px solid #eee', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <p style={{ fontWeight: 'bold', fontSize: '14px', margin: 0, color: '#333' }}>{isCleared ? spot.name : '？？？'}</p>
                      <p style={{ fontSize: '12px', color: '#666', margin: '4px 0 0 0' }}>{isCleared ? spot.desc : '未開拓のスポットです。現地でクイズを解くと解放されます！'}</p>
                    </div>
                    <span style={{ fontSize: '11px', padding: '4px 8px', borderRadius: '4px', fontWeight: 'bold', whiteSpace: 'nowrap', marginLeft: '8px', background: isCleared ? '#dcfce7' : '#f3f4f6', color: isCleared ? '#15803d' : '#9ca3af' }}>
                      {isCleared ? '解放済' : '未解放'}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* 🎁 特典タブ */}
        {activeTab === 'rewards' && (
          <div style={{ padding: '16px', maxWidth: '480px', margin: '0 auto' }}>
            <h2 style={{ fontSize: '18px', fontWeight: 'bold', borderBottom: '1px solid #eee', paddingBottom: '8px', marginBottom: '16px', color: '#111' }}>🎁 特典・クーポン</h2>
            <div style={{ background: '#fffbeb', border: '1px solid #fef3c7', borderRadius: '12px', padding: '16px', textAlign: 'center', marginBottom: '16px' }}>
              <p style={{ fontSize: '12px', color: '#b45309', margin: 0, fontWeight: '500' }}>現在の所持ポイント</p>
              <p style={{ fontSize: '28px', fontWeight: '800', color: '#78350f', margin: '4px 0 0 0' }}>{userPoints} <span style={{ fontSize: '14px', fontWeight: 'normal' }}>pt</span></p>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <h3 style={{ fontSize: '14px', fontWeight: 'bold', color: '#444', margin: 0 }}>利用可能なクーポン</h3>
              <div style={{ background: '#fff', padding: '12px', borderRadius: '12px', border: '1px solid #eee', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <p style={{ fontWeight: 'bold', fontSize: '14px', margin: 0, color: '#333' }}>ドラッグストアコスモス 50円引き</p>
                  <p style={{ fontSize: '12px', color: '#666', margin: '4px 0 0 0' }}>必要ポイント: 100 pt</p>
                </div>
                <button style={{ background: '#f59e0b', color: '#fff', border: 'none', padding: '6px 12px', borderRadius: '8px', fontSize: '12px', fontWeight: 'bold', cursor: 'pointer' }}>
                  交換
                </button>
              </div>
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
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <span style={{ width: '24px', height: '24px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: '12px', color: '#fff', background: index === 0 ? '#f59e0b' : index === 1 ? '#9ca3af' : index === 2 ? '#b45309' : '#e5e7eb' }}>
                      {index + 1}
                    </span>
                    <span style={{ fontSize: '14px', fontWeight: '500', color: '#333' }}>{item.nickname || '名無し'}</span>
                  </div>
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

      {/* 画面固定の5タブナビゲーション */}
      <BottomTabBar activeTab={activeTab} setActiveTab={setActiveTab} />

      {/* モーダル表示 */}
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
    </div>
  );
}