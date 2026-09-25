import React, { useEffect, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';

import { auth, db, googleProvider } from './firebase';
import { signInAnonymously, onAuthStateChanged, linkWithPopup } from 'firebase/auth';
import { doc, setDoc, getDoc, collection, query, orderBy, limit, onSnapshot } from 'firebase/firestore';

import { SPOTS_DATA } from './constants/spots';
import { isWithinRadius } from './utils/geo';
import { useGeolocation } from './hooks/useGeolocation';
import { useVisitedLocations } from './hooks/useVisitedLocations';
import { useFogOverlay } from './hooks/useFogOverlay';

import Splash from './components/Splash';
import Header from './components/Header';
import BottomDock from './components/BottomDock';
import QuizModal from './components/QuizModal';
import ARViewport from './components/ARViewport';
import RankingModal from './components/RankingModal';

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

  // 🚶 歩いた軌跡を自動管理するカスタムフック
  const { visitedLocations } = useVisitedLocations(userLocation);

  // セーブデータ
  const [score, setScore] = useState(() => parseInt(localStorage.getItem('tw_score') || '420', 10));
  const [clearedSpots, setClearedSpots] = useState(() => JSON.parse(localStorage.getItem('tw_cleared_spots') || '["central-hall"]'));
  const [nickname, setNickname] = useState(() => localStorage.getItem('tw_nickname') || `水先案内人_${Math.floor(1000 + Math.random() * 9000)}`);

  // UI状態
  const [showSplash, setShowSplash] = useState(true);
  const [selectedSpotId, setSelectedSpotId] = useState('central-hall');
  const [showQuiz, setShowQuiz] = useState(false);
  const [showAR, setShowAR] = useState(false);
  const [quizSelected, setQuizSelected] = useState(null);
  const [quizFeedback, setQuizFeedback] = useState('');
  const [isFlash, setIsFlash] = useState(false);
  const [showARSuccess, setShowARSuccess] = useState(false);

  // Firebase
  const [user, setUser] = useState(null);
  const [ranking, setRanking] = useState([]);
  const [showRanking, setShowRanking] = useState(false);

  const fogRadiiRef = useRef({
    'central-hall': clearedSpots.includes('central-hall') ? 80 : 0,
    'nakanishima-park': clearedSpots.includes('nakanishima-park') ? 80 : 0,
    'osaka-castle-pier': clearedSpots.includes('osaka-castle-pier') ? 80 : 0
  });

  // 🌫️ 霧描画ロジックをまとめたカスタムフック
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

  // 🎯 現在地がスポットの20m以内にいるか判定
  const { isNear: isNearCurrentSpot } = isWithinRadius(userLocation, currentSpot.lngLat, 20);

  // LocalStorage 保存
  useEffect(() => localStorage.setItem('tw_score', score.toString()), [score]);
  useEffect(() => localStorage.setItem('tw_cleared_spots', JSON.stringify(clearedSpots)), [clearedSpots]);
  useEffect(() => localStorage.setItem('tw_nickname', nickname), [nickname]);

  // スプラッシュタイマー
  useEffect(() => {
    const timer = setTimeout(() => setShowSplash(false), 2500);
    return () => clearTimeout(timer);
  }, []);

  // Firebase ログイン & データ同期
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
        el.addEventListener('click', (e) => { e.stopPropagation(); setSelectedSpotId(spot.id); });
        new mapboxgl.Marker({ element: el, anchor: 'center' }).setLngLat(spot.lngLat).addTo(mapRef.current);
        markersRef.current[spot.id] = { element: el };
      });
      setTimeout(updateFogPosition, 200);
    });
  }, []);

  // 📍 マップ上に現在地（青いピン）を表示 ＆ 初回のみ現在地へカメラジャンプ
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
      mapRef.current.flyTo({
        center: userLocation,
        zoom: 15,
        pitch: 15,
        duration: 1200
      });
    }
  }, [userLocation]);

  // スポット選択時のマーカー更新 & カメラ移動
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

  const handleLinkGoogle = async () => {
    try {
      if (!auth.currentUser) return alert("ログイン状態が確認できません。");
      await linkWithPopup(auth.currentUser, googleProvider);
      alert("🎉 Googleアカウントとの連携に成功しました！");
    } catch (error) {
      alert("連携エラー: " + error.message);
    }
  };

  return (
    <div style={{ width: '100vw', height: '100vh', position: 'relative', overflow: 'hidden' }}>
      {showSplash && <Splash />}

      <Header
        nickname={nickname}
        score={score}
        onOpenRanking={() => setShowRanking(true)}
        onEditNickname={() => {
          const newName = prompt('ニックネームを入力:', nickname);
          if (newName?.trim()) setNickname(newName.trim());
        }}
      />

      <main className="map-stage-aquatic">
        <div ref={mapContainerRef} className="mapbox-container" />
        <div ref={fogOverlayRef} className="map-fog-overlay" />
      </main>

      <BottomDock
        currentSpot={currentSpot}
        isCurrentCleared={isCurrentCleared}
        isNearSpot={isNearCurrentSpot}
        onRecenter={handleRecenter}
        onOpenQuiz={() => setShowQuiz(true)}
        onOpenAR={() => setShowAR(true)}
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

      {showRanking && (
        <RankingModal
          ranking={ranking}
          user={user}
          onClose={() => setShowRanking(false)}
          onLinkGoogle={handleLinkGoogle}
        />
      )}
    </div>
  );
}