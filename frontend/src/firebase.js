// src/firebase.js
import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";

// Firebase config
const firebaseConfig = {
  apiKey: "AIzaSyAy4AbBBX6VdlqoOP5N0TenqGCdnIlBlxU",
  authDomain: "aurfers.co.in",
  projectId: "surfers-c103d",
  storageBucket: "surfers-c103d.firebasestorage.app",
  messagingSenderId: "44214706885",
  appId: "1:44214706885:web:7b5c5dd0368431f937c6ac",
};

// ✅ Initialize app ONCE
const app = initializeApp(firebaseConfig);

// ✅ Create auth + provider and export them
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
