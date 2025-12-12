import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: process.env.FIREBASE_API_KEY || "AIzaSyB3IyI0fyJRLlo664qA16TQCI8McpVTGZM",
  authDomain: process.env.FIREBASE_AUTH_DOMAIN || "satya1-7ff01.firebaseapp.com",
  projectId: process.env.FIREBASE_PROJECT_ID || "satya1-7ff01",
  storageBucket: process.env.FIREBASE_STORAGE_BUCKET || "satya1-7ff01.firebasestorage.app",
  messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID || "878486224624",
  appId: process.env.FIREBASE_APP_ID || "1:878486224624:web:b2b13fad7512f6a1e5cc35",
  measurementId: process.env.FIREBASE_MEASUREMENT_ID || "G-MV1H5FX8QP"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);