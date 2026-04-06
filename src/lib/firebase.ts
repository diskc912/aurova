import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyBz4i9uvO-TZfKsK_-A8gI0QOqrugxu5gs",
  authDomain: "aurova-82c42.firebaseapp.com",
  projectId: "aurova-82c42",
  storageBucket: "aurova-82c42.firebasestorage.app",
  messagingSenderId: "651974126779",
  appId: "1:651974126779:web:3495bb80f47f32308c8d9e",
  measurementId: "G-B3VKJG2YVD",
};

const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
export const auth = getAuth(app);
export const db = getFirestore(app);
export const googleProvider = new GoogleAuthProvider();
