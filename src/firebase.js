// src/firebase.js
import { initializeApp } from "firebase/app";
import { getAuth,GoogleAuthProvider,EmailAuthProvider} from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// 🔥 Firebaseコンソールで取得したご自身のプロジェクトの設定に差し替えてください
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID
};

// Firebaseの初期化
const app = initializeApp(firebaseConfig);

// 認証(Auth)とデータベース(Firestore)のインスタンスを取得してエクスポート
export const auth = getAuth(app);
export const db = getFirestore(app);

//Google認証プロバイダーのインスタンスを作成
export const googleProvider = new GoogleAuthProvider();
export const emailProvider = new EmailAuthProvider();
