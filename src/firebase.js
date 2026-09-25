// src/firebase.js
import { initializeApp } from "firebase/app";
import { getAuth,GoogleAuthProvider} from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// 🔥 Firebaseコンソールで取得したご自身のプロジェクトの設定に差し替えてください
const firebaseConfig = {
  apiKey: "AIzaSyBCt5FDPLaVinqz07LYi-9HR9zSXKb7xc0",
  authDomain: "time-water-osaka.firebaseapp.com",
  projectId: "time-water-osaka",
  storageBucket: "time-water-osaka.firebasestorage.app",
  messagingSenderId: "133699239921",
  appId: "1:133699239921:web:b5c5eea720b582d14b0e50"
};

// Firebaseの初期化
const app = initializeApp(firebaseConfig);

// 認証(Auth)とデータベース(Firestore)のインスタンスを取得してエクスポート
export const auth = getAuth(app);
export const db = getFirestore(app);

//Google認証プロバイダーのインスタンスを作成
export const googleProvider = new GoogleAuthProvider();